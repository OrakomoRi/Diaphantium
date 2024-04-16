const gulp = require('gulp');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const glob = require('glob');
const wrap = require('gulp-wrap');

gulp.task('compile-js', function () {
  const jsFiles = glob.sync('src/js/*.js');

  return gulp.src(jsFiles)
	.pipe(concat('diaphantium.min.js'))
	.pipe(uglify())
	.pipe(wrap('(function() { <%= contents %> })();'))
	.pipe(gulp.dest('release'));
});

gulp.task('default', gulp.series('compile-js'));