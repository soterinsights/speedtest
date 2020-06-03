var stream = require('stream')
var inherits = require('util').inherits

var BLANK = Buffer.alloc(65536)
BLANK.fill(0)

module.exports = ZeroStream

function ZeroStream (length, blank) {
  if (!(this instanceof ZeroStream)) return new ZeroStream(length, blank)
  this.remaining = typeof length === 'number'
    ? length
    : Infinity
  this.blank = blank || BLANK
  stream.Readable.call(this)
}

inherits(ZeroStream, stream.Readable)

ZeroStream.prototype._read = function () {
  if (this.destroyed) return

  if (this.remaining >= this.blank.length) {
    this.remaining -= this.blank.length
    this.push(this.blank)
  } else if (this.remaining) {
    var last = this.blank.slice(0, this.remaining)
    this.remaining = 0
    this.push(last)
  } else {
    this.push(null)
  }
}

ZeroStream.prototype.destroy = function (err) {
  this.destroyed = true
  if (err) this.emit('error', err)
  this.emit('close')
}
