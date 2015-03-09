var gulp = require('gulp'),
    uglify = require('gulp-uglify'),
    browserify = require('browserify'),
    babelify = require('babelify'),
    through2 = require('through2');

gulp.task('js', function () {
    return gulp
        .src('./src/main.js')
        .pipe(through2.obj(function (file, enc, next){
            browserify(file.path)
                .transform(babelify)
                .bundle(function (err, res){
                    file.contents = res;
                    next(null, file);
                });
        }))
        //.pipe(uglify())
        .pipe(gulp.dest('./dist'));
});

gulp.task('watch', function () {
    gulp.watch('./src/**/*.js', ['js']);
});

gulp.task('default', ['js', 'watch']);
