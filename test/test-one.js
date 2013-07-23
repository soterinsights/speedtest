var _config = require("./config.json");

var speedtest = require('../libs/speedtest.js');

var st = new speedtest(_config);
st.start();

setTimeout(function() {
  st.stop();
}, 10000);