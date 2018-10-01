/*
 * Copyright © 2018 Matthias Mandelartz
 */
const mysql = require('./mysql/mysql.js');
const { startup } = require('./startup/startup.js');
const { getPlayerIdentifiers } = require('./common/cfx-common.js');
const util = require('./common/common.js');
const { config } = require('./common/config.js');

let updateCache = false;
startup();

// get transactions
function getTransactionsForUser(src, idents, username) {
  mysql.execute(`select trans.* from ghmb_transactions trans
    inner join ghmb_account_cache acc_cache on acc_cache.id = trans.account
    join ghmb_transactions trans_helper on trans_helper.account = trans.account and trans_helper.id >= trans.id
    where ((select id from ghmb_user_cache where name = ? and license = ? and steam = ? limit 1) in (acc_cache.access)
    or (select id from ghmb_user_cache where name = ? and license = ? and steam = ? limit 1) = acc_cache.user_id)
    group by trans.id, trans.account
    having count(*) <= 7
    order by account, id`,
  [username, idents.license, idents.steam, username, idents.license, idents.steam],
  (transactions) => {
    global.emitNet('ghmb:update-transactions', src, transactions);
  });
}

// Get accounts from cache
function getAccessibleAccountsForUser(src, username) {
  const idents = getPlayerIdentifiers(src);
  mysql.execute(`select acc_cache.* from ghmb_account_cache acc_cache
    inner join ghmb_user_cache usr_cache on usr_cache.id = acc_cache.user_id or usr_cache.id in (acc_cache.access)
    where usr_cache.license = ? and usr_cache.steam = ? and usr_cache.name = ?`,
  [idents.license, idents.steam, username], (accounts) => {
    global.emitNet('ghmb:update-accounts', src, accounts);
    getTransactionsForUser(src, idents, username);
  });
}

global.onNet('ghmb:request-account-data', (username) => {
  const src = global.source;
  getAccessibleAccountsForUser(src, username);
});

// sign in, migrate to use source
global.exports('signIn', (src, username) => {
  const idents = getPlayerIdentifiers(src);
  mysql.execute(`insert into ghmb_user_cache (id, name, license, steam, cash, source)
    select usr.id, usr.name, usr.license, usr.steam, usr.cash, ? as source
    from ghmb_users usr
    where usr.license = ? and usr.steam = ? and usr.name = ?
    limit 1`,
  [src, idents.license, idents.steam, username], (result) => {
    if (result.affectedRows !== 1) {
      mysql.execute('insert into ghmb_users (name, license, steam) values (?, ?, ?)',
        [username, idents.license, idents.steam], () => {
          mysql.execute(`insert into ghmb_user_cache (id, name, license, steam, cash, source)
            select usr.id, usr.name, usr.license, usr.steam, usr.cash, ? as source
            from ghmb_users usr
            where usr.license = ? and usr.steam = ? and usr.name = ?
            limit 1`,
          [src, idents.license, idents.steam, username], () => { updateCache = true; });
        });
    } else updateCache = true;
  });
  global.emitNet('ghmb:set-owner', src, username);
});

global.exports('signOff', (src) => {
  const idents = getPlayerIdentifiers(src);
  mysql.execute('delete from ghmb_user_cache where license = ? and steam = ? and source = ?', [idents.license, idents.steam, src]);
});

function updateMoney(idents, src) {
  mysql.execute('select cash, bank, source from ghmb_user_cache where license = ? and steam = ? and source = ? limit 1',
    [idents.license, idents.steam, src], (result) => {
      if (result.length) global.emitNet('ghmb:set-money', result[0].source, [result[0].cash, result[0].bank]);
    });
}

// reverse ping, so that ghmattibanking pings the users after one query, up to 5 users per tick?
global.onNet('ghmb:ping', () => {
  const src = global.source;
  const idents = getPlayerIdentifiers(src);
  updateMoney(idents, src);
});

global.on('playerDropped', () => {
  const src = global.source;
  const idents = getPlayerIdentifiers(src);
  mysql.execute('delete from ghmb_user_cache where license = ? and steam = ? and source = ?', [idents.license, idents.steam, src]);
});

// Update user cache
let cacheLock = false;
global.setTick(() => {
  // update only when needed
  if (updateCache && !cacheLock) {
    updateCache = false;
    cacheLock = true;
    mysql.execute(`replace into ghmb_account_cache (id, user_id, accountname,
      accountnumber, bank, balance, changed_at, owner, access)
      select acc.id, acc.owner as user_id, acc.accountname, acc.accountnumber,
        acc.bank, acc.balance, acc.changed_at,
        usr.name as owner, group_concat(axs.user) as access
      from ghmb_accounts acc
      inner join ghmb_users usr on acc.owner = usr.id
      left join ghmb_access axs on axs.account = acc.id
      left join ghmb_account_cache acc_cache on acc.id = acc_cache.id
      where ( (exists (select 1 from ghmb_user_cache where acc.owner = ghmb_user_cache.id))
      or (exists (select 1 from ghmb_user_cache where axs.user = ghmb_user_cache.id)) )
      and acc.changed_at > coalesce(acc_cache.changed_at,'0000-00-00 00:00:00')
      group by acc.id`, () => {
      mysql.execute(`replace into ghmb_user_cache (id, name, license, steam, cash, bank, source)
      select usr.id, usr.name, usr.license, usr.steam, usr.cash,
        coalesce(sum(acc_cache.balance),0) as bank, usr_cache.source
      from ghmb_users usr
      inner join ghmb_user_cache usr_cache on usr_cache.id = usr.id
      left join ghmb_account_cache acc_cache
        on acc_cache.user_id = usr.id or usr.id in (acc_cache.access)
      group by usr.id`, () => { cacheLock = false; });
    });
  }
});

global.onNet('ghmb:request-new-account', (username, accountname, bankname) => {
  const src = global.source;
  const idents = getPlayerIdentifiers(src);
  const accountno = util.generateAccountNo(bankname);
  // do some checks at some point
  mysql.execute(`insert into ghmb_accounts (owner, accountname, accountnumber, bank)
    select usr_cache.id as owner, ? as accountname, ? as accountnumber, ? as bank
    from ghmb_user_cache usr_cache
    where usr_cache.license = ? and usr_cache.steam = ? and usr_cache.source = ?`,
  [accountname, accountno, bankname, idents.license, idents.steam, src],
  () => {
    updateCache = true;
    setTimeout(() => { getAccessibleAccountsForUser(src, username); }, 500);
  });
});

setInterval(() => {
  mysql.execute(`delete low_priority acc_cache.* from ghmb_account_cache acc_cache
  where not exists (select id from ghmb_user_cache usr_cache where acc_cache.user_id = usr_cache.id or usr_cache.id in (acc_cache.access))`);
}, 10000);

/* on access change, update timestamp of the relevant account to current_timestamp() */

global.onNet('ghmb:request-deposit', (username, payload) => {
  const src = global.source;
  const idents = getPlayerIdentifiers(src);
  mysql.transaction([
    {
      query: 'update ghmb_users set cash=cash-? where name = ? and license = ? and steam = ?',
      parameters: [payload.amount, username, idents.license, idents.steam],
    },
    {
      query: 'update ghmb_accounts set balance=balance+? where id = ?',
      parameters: [payload.amount, payload.account],
    },
    {
      query: 'insert into ghmb_transactions (amount, account, purpose, origin, origin_type) values (?, ?, ?, ?, ?)',
      parameters: [payload.amount, payload.account, payload.purpose, username, 'user'],
    },
  ], (outcome) => {
    updateCache = true;
    if (outcome) setTimeout(() => { updateMoney(idents, src); }, 500);
  });
});

global.onNet('ghmb:request-withdrawal', (username, payload) => {
  const src = global.source;
  const idents = getPlayerIdentifiers(src);
  mysql.transaction([
    {
      query: 'update ghmb_users set cash=cash+? where name = ? and license = ? and steam = ?',
      parameters: [payload.amount, username, idents.license, idents.steam],
    },
    { // join with ghmb_user_cache and ghmb_account_cache to check if the user has access
      query: 'update ghmb_accounts set balance=if(balance-? >= ?, balance-?, \'No\') where id = ?',
      parameters: [payload.amount, config.overdrawLimit, payload.amount, payload.account],
    },
    {
      query: 'insert into ghmb_transactions (amount, account, purpose, origin, origin_type) values (?, ?, ?, ?, ?)',
      parameters: [-payload.amount, payload.account, payload.purpose, username, 'user'],
    },
  ], (outcome) => {
    updateCache = true;
    if (outcome) setTimeout(() => { updateMoney(idents, src); }, 500);
  });
});

global.onNet('ghmb:request-autocomplete-data', () => {
  const src = global.source;
  mysql.execute('select id, name from ghmb_user_cache where source <> ?', [src],
    (result) => {
      global.emitNet('ghmb:update-autocomplete-access-data', src, result);
      mysql.execute(`select acc_cache.id, acc_cache.accountnumber, usr.name from ghmb_account_cache acc_cache
        inner join ghmb_users usr on acc_cache.user_id = usr.id`,
      (res) => {
        global.emitNet('ghmb:update-autocomplete-transfer-data', src, res);
        mysql.execute(`select acc_cache.id as id, usr.name as text, usr.id as value from ghmb_account_cache acc_cache
        inner join ghmb_users usr on usr.id in (acc_cache.access)
        inner join ghmb_user_cache usr_cache on usr_cache.id = acc_cache.user_id
        where usr_cache.source = ?`, [src], (vals) => {
          global.emitNet('ghmb:update-autocomplete-access-values', src, vals);
        });
      });
    });
});

global.exports('pay', (src, amount, callback, recipient, purpose) => {
  const idents = getPlayerIdentifiers(src);
  if (typeof recipient === 'string' && typeof purpose === 'string' && amount > 0) {
    mysql.transaction([
      {
        query: `update ghmb_accounts acc
          inner join ghmb_user_cache usr_cache on acc.owner = usr_cache.id
          set balance=if(balance-? >= ?, balance-?, 'No')
          where usr_cache.license = ? and usr_cache.steam = ? and usr_cache.source = ?
          order by acc.bank
          limit 1`,
        parameters: [amount, config.overdrawLimit, amount, idents.license, idents.steam, src],
      },
      {
        query: `insert into ghmb_transactions (amount, account, purpose, origin, origin_type)
          select ? as amount, acc.id as account, ? as purpose, ? as origin, ? as origin_type
            from ghmb_accounts acc
            inner join ghmb_user_cache usr_cache on acc.owner = usr_cache.id
            where usr_cache.license = ? and usr_cache.steam = ? and usr_cache.source = ?
            order by acc.bank
            limit 1`,
        parameters: [-amount, purpose, recipient, 'reward', idents.license, idents.steam, src],
      },
    ], (result) => {
      updateCache = true;
      callback(result);
    });
  } else if (amount > 0) {
    mysql.execute(`update ghmb_users usr
      inner join ghmb_user_cache usr_cache on usr.id = usr_cache.id
      set usr.cash=usr.cash-?
      where usr_cache.license = ? and usr_cache.steam = ? and usr_cache.source = ?`,
    [amount, idents.license, idents.steam, src], (result) => {
      updateCache = true;
      if (result && result.changedRows === 1) {
        callback(true);
      } else callback(false);
    });
  }
});

global.exports('reward', (src, amount, from, purpose) => {
  const idents = getPlayerIdentifiers(src);
  if (typeof from === 'string' && typeof purpose === 'string' && amount > 0) {
    mysql.transaction([
      {
        query: `update ghmb_accounts acc
          inner join ghmb_user_cache usr_cache on acc.owner = usr_cache.id
          set balance=balance+?
          where usr_cache.license = ? and usr_cache.steam = ? and usr_cache.source = ?
          order by acc.bank
          limit 1`,
        parameters: [amount, idents.license, idents.steam, src],
      },
      {
        query: `insert into ghmb_transactions (amount, account, purpose, origin, origin_type)
          select ? as amount, acc.id as account, ? as purpose, ? as origin, ? as origin_type
            from ghmb_accounts acc
            inner join ghmb_user_cache usr_cache on acc.owner = usr_cache.id
            where usr_cache.license = ? and usr_cache.steam = ? and usr_cache.source = ?
            order by acc.bank
            limit 1`,
        parameters: [amount, purpose, from, 'reward', idents.license, idents.steam, src],
      },
    ], () => { updateCache = true; });
  } else if (amount > 0) {
    mysql.execute(`update ghmb_users usr
      inner join ghmb_user_cache usr_cache on usr.id = usr_cache.id
      set usr.cash=usr.cash+?
      where usr_cache.license = ? and usr_cache.steam = ? and usr_cache.source = ?`,
    [amount, idents.license, idents.steam, src], () => { updateCache = true; });
  }
});

global.onNet('ghmb:request-transfer', (username, payload) => {
  const src = global.source;
  const destination = (typeof payload.to === 'string') ? payload.to : payload.to.accountnumber;
  mysql.transaction([
    {
      query: 'update ghmb_accounts set balance=if(balance-? >= ?, balance-?, \'No\') where id = ?',
      parameters: [payload.amount, config.overdrawLimit, payload.amount, payload.from],
    },
    {
      query: 'update ghmb_accounts set balance=balance+? where accountnumber = ?',
      parameters: [payload.amount, destination],
    },
    {
      query: `insert into ghmb_transactions (amount, account, purpose, origin, origin_type)
        select ? as amount, id as account, ? as purpose, ? as origin, ? as origin_type from ghmb_accounts
        where accountnumber = ? limit 1`,
      parameters: [payload.amount, payload.purpose, username, 'user', destination],
    },
    { // add in here the name of the target instead of the user
      query: `insert into ghmb_transactions (amount, account, purpose, origin, origin_type)
        select ? as amount, ? as account, ? as purpose, usr.name as origin, ? as origin_type from ghmb_accounts acc
        inner join ghmb_users usr on usr.id = acc.owner
        where acc.accountnumber = ?`,
      parameters: [-payload.amount, payload.from, payload.purpose, 'user', destination],
    },
  ], () => {
    updateCache = true;
    setTimeout(() => { getAccessibleAccountsForUser(src, username); }, 500);
  });
});

/* // only for testing purposes
global.RegisterCommand('signin', (src) => {
  global.exports.ghmattibanking.signIn(src, global.GetPlayerName(src));
}, false);

global.RegisterCommand('rewardCash', (src) => {
  global.exports.ghmattibanking.reward(src, 20000);
}, false);

global.RegisterCommand('rewardBank', (src) => {
  global.exports.ghmattibanking.reward(src, 20000, 'Ron Oil', 'Fuel Delivery');
}, false);

global.RegisterCommand('payTest', (src) => {
  global.exports.ghmattibanking.pay(src, 1500, 'Ponsonbys', 'Shopping', (res) => {
    console.log(`Shopping successful: ${res}`);
  });
}, false); */

global.onNet('ghmb:change-account-name', (username, accId, accName) => {
  const src = global.source;
  const idents = getPlayerIdentifiers(src);
  mysql.execute(`update ghmb_accounts acc
    inner join ghmb_user_cache usr_cache on acc.owner = usr_cache.id
    set acc.accountname = ?
    where acc.id = ? and usr_cache.license = ? and usr_cache.steam = ? and usr_cache.source = ?`,
  [accName, accId, idents.license, idents.steam, src], () => {
    updateCache = true;
    setTimeout(() => { getAccessibleAccountsForUser(src, username); }, 500);
  });
});

global.onNet('ghmb:change-access', (accId, addAccess, removeAccess) => {
  if (removeAccess.length > 0) {
    mysql.execute('delete from ghmb_access where account = ? and user in (?)',
      [accId, removeAccess.map(a => a.value).join(',')]);
  }
  if (addAccess.length > 0) {
    const placeholder = ',(?,?)'.repeat(addAccess.length).substring(1);
    mysql.execute(`insert into ghmb_access (account, user) values ${placeholder}`,
      ...addAccess.map(a => [accId, a.value]));
  }
  if (addAccess.length > 0 || removeAccess.length > 0) {
    mysql.execute('update ghmb_accounts set changed_at=now() where id = ?', [accId], () => {
      updateCache = true;
    });
  }
});
