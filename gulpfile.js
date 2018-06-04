const argv = require('yargs').argv
const concat = require('gulp-concat')
const headerfooter = require('gulp-headerfooter')
const gulp = require('gulp')
const minify = require('gulp-minify')
const rename = require('gulp-rename')
const rollup = require('gulp-better-rollup')
const del = require('del')
const mkdirp = require('mkdirp')
const fs = require('fs')
const request = require('request')
const beautify = require('gulp-beautify')
const { workersCI, setup } = require('./src/index')

let paths = {
  default: {
    src: './workers/**/*.js',
    dest: './deployments',
    watch: './workers/**/*.js'
  },
  bundle: {
    src: './worker-bundles/exports.js',
    name: 'worker-bundle.js'
  }
}

function loadWebpage (done) {
  return request({

    url: 'https://httpbin.org/',

    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36 OPR/52.0.2871.99',
      'Accept': 'text/html,application/xhtml+xml,application',
      'Accept-Encoding': 'deflate',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Cookie': '_gauges_unique_hour=1; _gauges_unique_day=1; _gauges_unique_month=1; _gauges_unique_year=1; _gauges_unique=1',
      'Pragma': 'no-cache'
    }

  }).pipe(fs.createWriteStream(`./t/index.html`))
}

function compileTestWorker () {
  return gulp.src('./workers/franktaylor.io/*.js')
    .pipe(concat('service-worker.js'))
    .pipe(headerfooter.header(`(function (){\n'use strict'\n\nself.addEventListener('install',function (event){console.log('Service worker installing...')\nself.skipWaiting()})\n\nself.addEventListener('activate',function (event){console.log('Service worker activating...')})\n\nself.`))
    .pipe(headerfooter.footer('})()\n'))
    .pipe(beautify({ indent_size: 2 }))
    .pipe(gulp.dest('./'))
}

const bundler = {
  bundle (done) {
    return gulp.src('./worker-bundles/exports.js')
      .pipe(rollup({}, {
        format: 'iife',
        name: 'bundle'
      }))
      .pipe(rename('worker-bundle'))

      .pipe(gulp.dest(`${paths.default.dest}/.tmp`))
    done()
  },

  body (done) {
    return gulp.src('./worker-bundles/worker.js')
    // .pipe(concat.scripts(`${paths.default.dest}${'/.tmp/workers-bundle'}`))
      .pipe(rename('worker-bundle-body'))
      .pipe(gulp.dest(`${paths.default.dest}${'/.tmp'}`))
    done()
  },

  merge (done) {
    return gulp.src([`${paths.default.dest}/.tmp/worker-bundle`, `${paths.default.dest}${'/.tmp/worker-bundle-body'}`])
      .pipe(concat('Bundle'))
      .pipe(minify())
      .pipe(gulp.dest(`${paths.default.dest}`))
    done()
  }
}
function compress (filename) {
  return gulp.src(`${paths.default.dest}/${filename}`)
    .pipe(minify({
      ext: {
        src: '-debug',
        min: '-min'
      },
      exclude: ['tasks'],
      mangle: false
    }))
    .pipe(gulp.dest(paths.default.dest))
}

function clean () {
  return del(['assets'])
}

function copy () {
  return gulp.src(paths.default.watch)
    .pipe(rename(function (path) {
      path.dirname = ''
      path.basename += ''
      path.extname = ''
    }))
    .pipe(gulp.dest(`${paths.default.dest}/${setup.masterZoneName}`))
}

function deploy () {
  return workersCI.uploadWorker(`${argv.script}`)
}

async function deleteWorker () {
  const target = argv.name || argv.script
  if (!argv.name && !argv.script) return console.log('Worker target missing. Add flag --s=my-worker')
  return workersCI.deleteWorker(target)
}

function createRoute () {
  if (argv.route) {
    return workersCI.createRoute({
      hostname: argv.route,
      pattern: '',
      enabled: argv.enabled || false
    })
  } console.log('--route flag needed to run this command')
}

async function deleteRoute () {
  const target = argv.route || argv.script
  if (!argv.route && !argv.script) return console.log('Route target missing. Add flag --route=example.com/*')
  const x = await workersCI.deleteRoute(target)
  return x
}

function getRoutes () {
  return workersCI.getRoutes(argv.route)
}

async function changeRoute () {
  const x = await workersCI.changeRoute({
    oldPattern: argv.old,
    newPattern: argv.new,
    enabled: argv.enabled || false
  })
  return x
}

function download () {
  return workersCI.downloadWorker(argv.script)
}

function live () {
  var watcher = gulp.watch(paths.default.watch, copy)
  return watcher.on('change', function (path) {
    const fileTarget = path.substring(path.lastIndexOf('/') + 1).slice(0, -3)
    console.log('Uploading ' + fileTarget + ' to ' + setup.masterZoneName)
    workersCI.uploadWorker(fileTarget, `/deployments/${setup.masterZoneName}`)
  })
}

function mkdir (done) {
  mkdirp(`./workers/${setup.masterZoneName}`)
  mkdirp(`./deployments/${setup.masterZoneName}`)
  done()
}

exports.copy = copy
exports.clean = clean
exports.live = live
exports.deploy = deploy
exports.compress = compress
exports.getRoute = getRoutes
exports.createRoute = createRoute
exports.deleteRoute = deleteRoute
exports.changeRoute = changeRoute
exports.download = download
exports.deleteWorker = deleteWorker
exports.mkdir = mkdir
exports.loadWebpage = loadWebpage
exports.compileTestWorker = compileTestWorker
exports.bundler = bundler
exports.bundle = bundler.bundle
exports.body = bundler.body
exports.merge = rollup.merge

gulp.task('workers.concat', compileTestWorker)
// gulp.task('workers.compile', 'concat:dist')
gulp.task('workers.live', gulp.series(mkdir, clean, copy, live))

gulp.task('workers.deploy', deploy)
gulp.task('workers.upload', deploy)
gulp.task('workers.download', download)
gulp.task('workers.delete', deleteWorker)

gulp.task('workers.routes.delete', deleteRoute)
gulp.task('workers.routes.get', getRoutes)
gulp.task('workers.routes.create', createRoute)
gulp.task('workers.routes.change', changeRoute)

gulp.task('workers.rollup', gulp.series(bundler.bundle, bundler.body, bundler.merge))
// gulp.task('workers.rollup.minify', gulp.series(bundle, compress))

gulp.task('workers.http', loadWebpage)

gulp.task('workers', clean)
/*
 * Define default task that can be called by just running `gulp` from cli
 */
gulp.task('default', clean)
