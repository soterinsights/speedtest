(function(factory) {
  if(typeof require == 'function' && typeof process != 'undefined')
    module.exports = factory(require('lodash'));
  else if(window && document)
    window.json2csv = factory(_);
})(function(_) {
  function sanitize(v) {
    var r = /([,"])/;

    v = (v || "").toString().replace(/"/g, '""');
    if(r.test(v) || v == '')
      return '"' + v + '"';

    return v;
  }

  function json2csv(obj, keys) {
    if(!Array.isArray(obj))
      throw "Obj must be an array";

    keys || (keys = _.keys(_.first(obj)));
    var defaultValues = {};
    _.each(keys, function(k) {
      if(typeof k == 'string')
        defaultValues[k] = "";

      if(typeof k == 'object') {
          defaultValues[k.key || k.k] = k.default || k.d;
      }
    });
    var r = _.map(obj, function(l) {
      return _.join(_.map(keys, function(k, i) {
        return sanitize(_.get(l, k.key || k.k || k) || defaultValues[k.key || k.k || k]);
      }), ',');
    });
    var fkeys = _.map(keys, function(k) {
      return sanitize(k.label || k.l || k.key || k.k || k);
    });
    var rs = _.join([fkeys].concat(r), '\r\n');
    return rs;
  }

  return json2csv;
});
