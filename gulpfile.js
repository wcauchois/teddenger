var gulp = require('gulp'),
    less = require('gulp-less'),
    browserify = require('browserify'),
    reactify = require('reactify'),
    source = require('vinyl-source-stream'),
    uglify = require('gulp-uglify'),
    streamify = require('gulp-streamify'),
    argv = require('yargs').argv,
    colors = require('colors');

var devMode = (typeof argv.dev !== 'undefined');
if (devMode) {
  console.log("Dev mode: not minifying scripts".green);
}

gulp.task('scripts', function() {
  var basePipe = browserify('src/js/app.js')
    .transform(reactify)
    .bundle()
    .on('error', function(err) {
      console.log(err.message.red);
      // Need to emit end event: http://stackoverflow.com/a/24817446
      this.emit('end');
    })
    .pipe(source('bundle.js'))
  var finalPipe;
  if (devMode) {
    finalPipe = basePipe;
  } else {
    finalPipe = basePipe.pipe(streamify(uglify()))
  }
  finalPipe
    .pipe(gulp.dest('public/build/scripts'));
});

gulp.task('styles', function() {
  gulp.src('src/less/*.less')
    .pipe(less())
    .pipe(gulp.dest('public/build/styles'));
});

gulp.task('default', ['scripts', 'styles']);

gulp.task('watch', ['scripts', 'styles'], function() {
  if (!devMode) {
    console.log("Use --dev for unminified scripts".gray);
  }
  gulp.watch('src/js/**', ['scripts']);
  gulp.watch('src/less/**', ['styles']);
});

