var Benchmark = require('benchmark')
var fs = require('fs')
var path = require('path')
var DecodeGLADStream = require('./')
var PNGDecoder = require('png-stream/decoder')
var PNGEncoder = require('png-stream/encoder')
var fromBuffer = require('from2-buffer')
var devnull = require('dev-null')
var through2 = require('through2')
var ImageService = require('true-color-tiles/app/src/services/image.service.js')
const Canvas = require('canvas')

var raw = fs.readFileSync(path.join(__dirname, 'test/images/raw.png'))

var suite = new Benchmark.Suite()

suite.add('decoder', function (deferred) {
  fromBuffer(raw)
    .pipe(new PNGDecoder())
    .pipe(new DecodeGLADStream())
    .pipe(new PNGEncoder())
    .resume()
    .on('finish', function () {
      deferred.resolve()
    })
}, {defer: true})

suite.add('no decode', function (deferred) {
  fromBuffer(raw)
    .pipe(new PNGDecoder())
    .pipe(new PNGEncoder())
    .resume()
    .on('finish', function () {
      deferred.resolve()
    })
}, {defer: true})

suite.add('ImageService', function () {
  var img = new Canvas.Image()
  img.src = raw
  var canvas = new Canvas(img.width, img.height)
  var ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)
  var I = ctx.getImageData(0, 0, canvas.width, canvas.height)
  ImageService.decodeGLAD(I.data)
  ctx.putImageData(I, 0, 0)
  canvas.toBuffer()
})

// add listeners
suite.on('cycle', function (event) {
  console.log(String(event.target))
})
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  // run async
  .run()
