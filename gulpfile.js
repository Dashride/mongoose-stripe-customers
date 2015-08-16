var fs = require('fs'),
    gulp = require('gulp'),
    gutil = require("gulp-util"),
    jasmine = require('gulp-jasmine'),
    istanbul = require('gulp-istanbul'),
    jshint = require('gulp-jshint'),
    jsdoc2md = require('gulp-jsdoc-to-markdown'),
    concat = require("gulp-concat");

var paths = {
    js: ['./**/*.js', '!./**/*.spec.js', '!./coverage/**/*.js', '!./node_modules/**/*.js'],
    specs: ['./**/*.spec.js', '!./node_modules/**/*.js'],
    all: ['./**/*.js', '!./coverage/**/*.js', '!./node_modules/**/*.js']
};

gulp.task('watch', ['test'], function (done) {
    var glob = paths.all;
    gulp.watch(glob, ['test']);
});

gulp.task('lint', function() {
    gulp.src(paths.all)
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(jshint.reporter('fail'));
});

gulp.task('cover', function(done) {
    gulp.src(paths.js)
        .pipe(istanbul())
        .pipe(istanbul.hookRequire())
        .on('finish', function() {
            gulp.src(paths.specs)
                .pipe(jasmine({
                    verbose: true,
                    includeStackTrace: true
                }))
                .pipe(istanbul.writeReports({
                    reporters: [ 'lcovonly', 'text' ],
                }))
                .pipe(istanbul.enforceThresholds({
                    thresholds: { global: 90 }
                }))
                .on('end', done);
        })
        .on('error', done);
});

gulp.task('test', ['lint'], function(done) {
    gulp.src(paths.specs)
     .pipe(jasmine({
         verbose: true,
         includeStackTrace: true
     }));
});

gulp.task('docs', function() {
    gulp.src(paths.all)
        .pipe(concat('README.md'))
        .pipe(jsdoc2md({template: fs.readFileSync('./readme.hbs', 'utf8')}))
        .on('error', function(err){
            gutil.log('jsdoc2md failed:', err.message);
        })
        .pipe(gulp.dest('.'));
});
