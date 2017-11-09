# speedtest

This is a simple NodeJS http "internet" speed test. The aim to make it easy to run a http speedtest over your own WAN, VPN, or whatever network.

# Run

node ./bin/speed.js

Open your browser and go to http://hostname:8080/.

# Default behaviors/config

bin/config.json
```js
{
  //local port to listen on.
  //can be overridden by setting env ST_PORT
  "port": 8080,

  //local ip to bind with.
  //can be overridden by setting env ST_ADDR
  "ip": "0.0.0.0",

  "limits": {
    //define start, max size, and test series size modifiers.
    //server side will not serve up anything larger or accept any more data than is defined here.
    "downloadStartSize": "100000"
    ,"uploadStartSize": "2000000"
    ,"downloadSizeModifier": "2"
    ,"uploadSizeModifier": "1.5"
    ,"maxDownloadSize": "2000000000"
    ,"maxUploadSize": "100000000"

    //tests over this number of seconds kills the test panel.
    ,"maxDownloadTime": "8"
    ,"maxUploadTime": "4"

     //UI only, milliseconds between tests.
    ,"restInterval": "0"
  }
}
```

### Stress tests
Run until until the min/max of the top 4 tests results are without 10% of each other.


# Observations/Bugs

Original development was on Windows and it seemed to max out at about 20-30MBps (160Mbps - 240Mbps) when using localhost.

Later development has been done on Ubuntu and node v8. The highest speed seen hit ~1.7Gbps on localhost.

Credits
=========
* [jQuery](http://jquery.com/)
* [Jquery Ajax Progress](https://github.com/englercj/jquery-ajax-progress) by Chad Engler
* [lodash](https://lodash.com)
* [angularjs](https://angularjs.org)
* [dev-zero-stream](https://github.com/mafintosh/dev-zero-stream/blob/f61f06911fc60eb57645d502e53d35a3acfa31d4/index.js) by Mathias Buus
* [orderObjectBy](http://justinklemm.com/angularjs-filter-ordering-objects-ngrepeat/) by Justin Klemm

MIT License
=========
Copyright (c) 2012 Joshua Erickson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
