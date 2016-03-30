gulp = require 'gulp'
coffee = require 'gulp-coffee'
plumber = require 'gulp-plumber'
coffeelint = require 'gulp-coffeelint'
concat = require 'gulp-concat'
rename = require 'gulp-rename'


gulp.task 'coffee', ->
    gulp.src([
        'app.coffee'
        'cgFileUpload.coffee'
        'cgFileUploadCtrl.coffee'
    ])
    .pipe(plumber())
    .pipe(coffeelint('coffeelint.json'))
    .pipe(coffeelint.reporter())
    .pipe(coffee(bare: true))
    .pipe(concat('cg-file-upload.js'))
    .pipe(gulp.dest('./'))

gulp.task 'coffee-worker', ->
    gulp.src('cgFileUploadWorker.coffee')
    .pipe(plumber())
    .pipe(coffeelint('coffeelint.json'))
    .pipe(coffeelint.reporter())
    .pipe(coffee(bare: true))
    .pipe(rename('cg-file-upload-worker.js'))
    .pipe(gulp.dest('./'))

gulp.task 'default', ['coffee', 'coffee-worker']
