var Transform = require('readable-stream').Transform
var inherits = require('inherits')
var assign = require('object-assign')
var julian = require('julian')
var colorString = require('color-string')

module.exports = GLADStreamDecoder

var DEFAULT_OPTS = {
  color: 'rgb(220, 102, 153)',
  since: new Date(2015, 0, 1)
}

var GLAD_START_JULIAN_DAY = julian.toJulianDay(new Date(2015, 0, 1))

/**
 * Transforms an encoded rgb image stream (a buffer of r,g,b values in order)
 * from GLAD alerts into an rgba image stream with alerts as colored pixels
 * `opts.color` and the intensity as the transparency of the pixel.
 * @param {object} opts
 * @param {string|array} opts.color CSS color string or [red, green, blue] array for color of pixels
 * @param {date} opts.since Date object, filters alerts since this date
 */
function GLADStreamDecoder (opts) {
  opts = assign({}, DEFAULT_OPTS, opts)
  if (opts.since < DEFAULT_OPTS.since) {
    opts.since = DEFAULT_OPTS.since
  }
  this._color = colorString.get.rgb(opts.color)
  this._sinceDays = julian.toJulianDay(opts.since) - GLAD_START_JULIAN_DAY

  var self = this
  this.once('pipe', function (src) {
    src.on('format', function (format) {
      self._inputFormat = format
    })
  })
  Transform.call(this)
}

inherits(GLADStreamDecoder, Transform)

GLADStreamDecoder.prototype._transform = function (data, encoding, cb) {
  if (!this._started) {
    if (!this._inputFormat || this._inputFormat.colorSpace !== 'rgb') {
      return cb(new Error('Only supports rgb input'))
    }
    var format = assign({}, this._inputFormat, {colorSpace: 'rgba'})
    this.emit('format', format)
    this._started = true
  }

  var res = Buffer.allocUnsafe(data.length / 3 * 4)
  var days
  var j = 0

  for (var i = 0; i < data.length; i += 3) {
    res[j++] = this._color[0]
    res[j++] = this._color[1]
    res[j++] = this._color[2]
    // find the total days of the pixel by
    // multiplying the red band by 255 and adding
    // the green band to that
    days = data[i] * 255 + data[i + 1]
    if (days > this._sinceDays) {
      // Convert the blue band to string, leading
      // zeros if it's not currently three digits
      // this occurs very rarely; where there's an intensity
      // value but no date/confidence for it. Due to bilinear
      // resampling
      var band3Str = pad(data[i + 2].toString())
      // Grab confidence (the first value) from this string
      // confidence is stored as 1/2, subtract one to make it 0/1
      // var confidence = parseInt(band3Str[0]) - 1
      // Grab the raw intensity value from the pixel; ranges from 1 - 55
      var rawIntensity = parseInt(band3Str.slice(1, 3))
      // Scale the intensity to make it visible
      var intensity = Math.min(rawIntensity * 50, 255)
      res[j++] = intensity
    } else {
      res[j++] = 0
    }
  }

  this.push(res)
  cb()
}

function pad (num) {
  var s = '00' + num
  return s.substr(s.length - 3)
}
