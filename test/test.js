var fs = require('fs')
var path = require('path')
var GLADStreamDecoder = require('../')
var PNGDecoder = require('png-stream/decoder')
var PNGEncoder = require('png-stream/encoder')

var rs = fs.createReadStream(path.join(__dirname, 'images/raw.png'))
var ws = fs.createWriteStream(path.join(__dirname, 'images/decoded.png'))

rs
  .pipe(new PNGDecoder())
  .pipe(new GLADStreamDecoder({since: new Date(2017, 0, 1), color: '#00FF00'}))
  .pipe(new PNGEncoder())
  .pipe(ws)
