/*
 * Copyright © 2018 Matthias Mandelartz
 */
function bankToNumber(string) {
  let result = '';
  for (let i = 0; i < 4; i += 1) {
    result += string.charCodeAt(i).toString().slice(-1);
  }
  return result;
}

const base = (new Date(2018, 0, 1)).getTime();
const eol = (new Date(2025, 0, 1)).getTime();
module.exports.generateAccountNo = (bankname) => {
  const n = (999999999999 * (Date.now() - base) / eol).toFixed(0).toString();
  const pad = '0'.repeat(12 - n.length); // pad start does not seem to work
  return `${bankToNumber(bankname)}${pad}${n}`;
};
