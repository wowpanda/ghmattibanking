<template>
  <v-card v-if="caOwner" class="elevation-4" :class="bankName">
    <v-card-title :class="bankName">{{ caName }}</v-card-title>
      <v-list>
        <v-list-tile :class="bankName">
          <v-list-tile-content>{{ localize('accountnumber') }}</v-list-tile-content>
          <v-list-tile-content class="align-end">
            {{ formatAccountNo(caNumber) }}
          </v-list-tile-content>
        </v-list-tile>
        <v-list-tile :class="bankName">
          <v-list-tile-content>{{ localize('accountname') }}</v-list-tile-content>
          <v-list-tile-content class="align-end">{{ caName }}</v-list-tile-content>
        </v-list-tile>
        <v-list-tile :class="bankName">
          <v-list-tile-content>{{ localize('accountowner') }}</v-list-tile-content>
          <v-list-tile-content class="align-end">{{ caOwner }}</v-list-tile-content>
        </v-list-tile>
        <v-list-tile :class="bankName">
          <v-list-tile-content>{{ localize('bank') }}</v-list-tile-content>
          <v-list-tile-content class="align-end">{{ localize(caBank) }}</v-list-tile-content>
        </v-list-tile>
        <v-list-tile :class="bankName">
          <v-list-tile-content>{{ localize('balance') }}</v-list-tile-content>
          <v-list-tile-content class="align-end">
            {{ formatCurrency(caBalance) }}
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
  </v-card>
</template>

<script>
import { mapState } from 'vuex';

export default {
  computed: {
    ...mapState(['caOwner', 'caName', 'caNumber', 'caBank', 'caBalance', 'i18n', 'config', 'bankName']),
  },
  methods: {
    formatCurrency(d) {
      return d.toLocaleString(this.config.locale, {
        currency: this.config.currency,
        style: 'currency',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    },
    formatAccountNo(d) {
      return d.match(/.{1,4}/g).join(' ');
    },
    localize(s) {
      return this.i18n[s];
    },
  },
};
</script>

<style>
.v-card__title.fleeca {
  border-bottom: 2px solid #268f3a;
  font-weight: 700;
}
.fleeca .v-list__tile {
  height: 26px!important;
  font-size: 14px;
}

.v-card.lombank {
  box-shadow: none!important;
  border: 1px solid #000000;
}
.v-card__title.lombank {
  background-color: #000000;
  color: #ffffff!important;
  padding: 6px 16px;
}
.lombank .v-list__tile {
  height: 26px!important;
}
.lombank .v-list__tile__content {
  border-bottom: 1px solid #c0c0c0!important;
}

.v-card__title.maze-bank {
  background-color: #e10a0a;
  color: #ffffff!important;
  padding: 8px 16px;
}
.maze-bank .v-list__tile {
  height: 26px!important;
}
</style>
