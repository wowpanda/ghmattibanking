<template>
  <v-toolbar class="header" :class="bankName">
    <img :class="bankName" alt="logo">
    <v-toolbar-title class="bank-title" :class="bankName">
      {{ bankName }}
    </v-toolbar-title>
    <v-spacer></v-spacer>
    <span :class="bankName">{{ location }}</span>
    <v-spacer></v-spacer>
    <span :class="bankName">{{ date }}</span>
  </v-toolbar>
</template>

<script>
import { mapState } from 'vuex';

export default {
  name: 'bank-header',
  computed: mapState(['bankName', 'date', 'location']),
};
</script>

<style>
.bank-title {
  font-weight: 700!important;
  text-transform: uppercase!important;
  letter-spacing: 0.02em!important;
}

.header.fleeca {
  border-bottom: 2px solid #268f3a;
  background-color: #ffffff;
}
.header.lombank {
  background-color: #283468;
}
.header.maze-bank {
  background-color: #e10a0a;
}

.header span {
  font-size: 16px;
}

.bank-title.maze-bank, .bank-title.lombank {
  color: #ffffff!important;
}
.header.maze-bank span, .header.lombank span {
  color: #ffffff!important;
}

img {
   height: 32px;
   margin-right: -15px;
}
img.fleeca {
  content:url("../assets/img/fleeca.png");
  height: 24px;
}
img.lombank {
  content:url("../assets/img/lombank.png");
}
img.maze-bank {
  content:url("../assets/img/mazebank.png");
  background-color: #ffffff;
  padding: 5px;
  width: 32px;
}
</style>
