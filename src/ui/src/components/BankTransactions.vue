<template>
  <table v-bind:class="bankName" v-if="caTransactions.length">
    <tr>
      <th class="date">{{ localize('date') }}</th>
      <th class="text">{{ localize('description') }}</th>
      <th class="amount">{{ localize('amount') }}</th>
    </tr>
    <tr v-for="(transaction, index) in caTransactions" v-bind:key="index">
      <td class="date">{{ formatDate(transaction.issued_at) }}</td>
      <td class="text"><b>{{ transaction.origin }}</b><br />{{ transaction.purpose }}</td>
      <td class="amount">{{ formatCurrency(transaction.amount) }}</td>
    </tr>
    <tr>
      <td></td>
      <td class="text">{{ localize('currentbalance') }}</td>
      <td class="amount">{{ formatCurrency(caBalance) }}</td>
    </tr>
  </table>
</template>

<script>
import { mapState } from 'vuex';

export default {
  name: 'account-transaction-table',
  computed: mapState(['caTransactions', 'caBalance', 'user', 'bankName', 'config', 'i18n']),
  methods: {
    formatCurrency(d) {
      return d.toLocaleString(this.config.locale, {
        currency: this.config.currency,
        style: 'currency',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    },
    formatDate(d) {
      const date = new Date(d);
      return date.toLocaleDateString(this.config.locale);
    },
    localize(s) {
      return this.i18n[s];
    },
  },
};
</script>

<style scoped>
table {
  border-collapse: collapse;
  width: 70%;
  margin: auto;
}

th:first-child {
  width: 110px;
}

table.lombank th {
  color: #ffffff;
  background-color: #000000;
  font-weight: bold;
  padding: 8px 16px;
}
table.lombank td {
  padding: 2px 16px;
}
table.lombank td:first-child, table.lombank th:first-child {
  border-left: 1px solid #000000;
}
table.lombank td:last-child, table.lombank th:last-child {
  border-right: 1px solid #000000;
}
table.lombank tr:nth-child(odd) {
  background-color: rgba(0,0,0,0.1);
}
table.lombank tr:last-child td {
  border: none;
  border-top: 1px solid #000000;
  font-weight: bold;
}
table.lombank tr:last-child {
  background-color: transparent;
}

table.fleeca {
  box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.2),
              0px 4px 5px 0px rgba(0,0,0,0.14),
              0px 1px 10px 0px rgba(0,0,0,0.12);
}
table.fleeca th {
  padding: 8px 16px 4px;
  border-bottom: 2px solid #268f3a;
}
table.fleeca th:first-child, table.fleeca td:first-child {
  text-align: center;
}
table.fleeca td {
  padding: 2px 16px;
  line-height: 1.2;
}
table.fleeca tr:nth-child(odd) {
  background-color: rgba(38, 143, 58, 0.1);
}
table.fleeca tr:first-child, table.fleeca tr:last-child {
  background-color: transparent;
}
table.fleeca tr:last-child td {
  border: none;
  padding-top: 4px;
  border-top: 2px solid #268f3a;
  font-weight: bold;
}

table.maze-bank {
  box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.2),
              0px 4px 5px 0px rgba(0,0,0,0.14),
              0px 1px 10px 0px rgba(0,0,0,0.12);
}
table.maze-bank th {
  line-height: 1.2;
  font-weight: bold;
  padding: 8px 16px;
  color: #ffffff;
  background-color: #e10a0a;
}
table.maze-bank td {
  padding: 2px 16px;
  line-height: 1.2;
}
table.maze-bank tr:nth-child(even) {
  background-color: rgba(225,10,10,0.1);
}
table.maze-bank tr:last-child td {
  border: none;
  font-weight: bold;
}
table.maze-bank tr:last-child {
  background-color: #e10a0a;
  color: #ffffff;
}

.date, .text {
  text-align: left;
}
.amount {
  text-align: right;
}
</style>
