var _config = require("./config.json");

var speedtest = require('../lib/speedtest.js');

var st = new speedtest(_config);
st.start();