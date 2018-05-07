const argv = require('yargs').argv
const concat = require('gulp-concat')
const gulp = require('gulp')
const minify = require('gulp-minify')
const plumber = require('gulp-plumber')
const rename = require('gulp-rename')
const rollup = require('gulp-better-rollup')
const sourcemaps = require('gulp-sourcemaps')
const del = require('del')

const workersCI = require('./index')

let paths = {
  default: {
    src: './workers/*.js',
    dest: './deployments',
    watch: './workers/*.js'
  },
  bundle: {
    src: './worker-bundles/bundle.js',
    name: 'worker-bundle.js'
  }
}

function combine() {
  return gulp.src(['./deployments/.tmp/workers-bundle', './worker-bundles/base.js'])
    .pipe(concat('workers-bundle'))
    .pipe(gulp.dest(paths.default.dest))
}

function bundle() {
  return gulp.src(paths.bundle.src)
    .pipe(rollup({}, {
      format: 'iife',
      name: 'bundle',
      exports: 'default'
    }))
    .pipe(rename('workers-bundle'))
    .pipe(minify({
      ext: {
        src: '-debug',
        min: '-min'
      },
      exclude: ['tasks'],
      mangle: false
    }))
    .pipe(gulp.dest(`${paths.default.dest}${'/.tmp'}`))
}

function compress(filename) {
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

function clean() {
  return del(['assets'])
}

function copy() {
  return gulp.src(paths.default.watch)
    .pipe(rename(function (path) {
      path.dirname = ""
      path.basename += ""
      path.extname = ""
    }))
    .pipe(gulp.dest(paths.default.dest))
}

function deploy() {
  return workersCI.uploadWorker(`${argv.script}`)
}

async function deleteWorker() {
  const target = argv.name || argv.script
  if (!argv.name && !argv.script) return console.log('Worker target missing. Add flag --script=my-worker')
  return workersCI.deleteWorker(target)
}

function createRoute() {
  if (argv.route) {
    return workersCI.createRoute({
      hostname: argv.route,
      pattern: '',
      enabled: argv.enabled || false
    })
  } console.log('--route flag needed to run this command')
}

async function deleteRoute() {
  const target = argv.route || argv.script
  if (!argv.route && !argv.script) return console.log('Route target missing. Add flag --route=example.com/*')
  return await workersCI.deleteRoute(target)
}

function getRoutes() {
  return workersCI.getRoutes(argv.route)
}

async function changeRoute() {
  return await workersCI.changeRoute({
    oldPattern: argv.old,
    newPattern: argv.new,
    enabled: argv.enabled || false
  })
}

function download() {
  return workersCI.downloadWorker(argv.script)
}

function live() {
  var watcher = gulp.watch(paths.default.watch, copy)
  return watcher.on('change', function (path) {
    const filename = path.split('/')[1].slice(0, -3)
    console.log('File ' + filename + ' was changed');
    workersCI.uploadWorker(filename)
  })
}

exports.copy = copy
exports.clean = clean
exports.live = live
exports.deploy = deploy
exports.compress = compress
exports.bundle = bundle
exports.getRoute = getRoutes
exports.createRoute = createRoute
exports.deleteRoute = deleteRoute
exports.changeRoute = changeRoute
exports.download = download
exports.deleteWorker = deleteWorker
exports.combine = combine

var build = gulp.series(clean, copy)

gulp.task('workers.live', gulp.series(clean, copy, live))

gulp.task('workers.deploy', deploy)
gulp.task('workers.upload', deploy)
gulp.task('workers.download', download)
gulp.task('workers.delete', deleteWorker)

gulp.task('workers.rollup', gulp.series(bundle, combine))
gulp.task('workers.rollup.minify', gulp.series(bundle, compress))

gulp.task('workers.routes.delete', deleteRoute)
gulp.task('workers.routes.get', getRoutes)
gulp.task('workers.routes.create', createRoute)
gulp.task('workers.routes.change', changeRoute)

gulp.task('workers', build)
/*
 * Define default task that can be called by just running `gulp` from cli
 */
gulp.task('default', build);
