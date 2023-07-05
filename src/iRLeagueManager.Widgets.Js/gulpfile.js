var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify')

var irleaguemanager_widgets_js = [
    'Client.js',
    'Results/ResultsTable.js'
  ];

gulp.task('makeOneFileToRuleThemAll', function(){
    return gulp.src(irleaguemanager_widgets_js)
      .pipe(concat('irleaguemanager-widgets-min.js'))
      // .pipe(uglify())
      .pipe(gulp.dest('public/'));
  });

function defaultTask(cb) {
    // place code for your default task here
    cb();
  }
  
  exports.default = defaultTask