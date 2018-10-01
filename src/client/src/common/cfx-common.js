/* global window */
const global = window;

module.exports.NuiMessage = (msg) => {
  global.SendNuiMessage(JSON.stringify(msg));
};

module.exports.NuiCallback = (name, callback) => {
  global.RegisterNuiCallbackType(name);
  global.on(`__cfx_nui:${name}`, (data, cb) => {
    callback(data);
    cb('ok');
  });
};
