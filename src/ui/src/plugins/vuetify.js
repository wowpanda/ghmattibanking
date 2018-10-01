import Vue from 'vue';
import {
  Vuetify,
  VApp,
  VBtn,
  VCard,
  VCombobox,
  VDialog,
  VForm,
  VGrid,
  VIcon,
  VList,
  VMenu,
  VTextField,
  VToolbar,
  transitions,
} from 'vuetify';
import 'vuetify/src/stylus/app.styl';

Vue.use(Vuetify, {
  components: {
    VApp,
    VBtn,
    VCard,
    VCombobox,
    VDialog,
    VForm,
    VGrid,
    VIcon,
    VList,
    VMenu,
    VTextField,
    VToolbar,
    transitions,
  },
  customProperties: true,
  iconfont: 'md',
});
