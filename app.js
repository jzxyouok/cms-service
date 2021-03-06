var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
//var mongoStore = require('connect-mongo')(session)
var redisStore = require('connect-redis')(session)
var mongoose = require('mongoose');
var _ = require('underscore');


var config = require('./config');
var logger = require('./middlewares/requireLog'); //日志

//链接数据库
var dbUrl = config.URL;
var db = mongoose.connect(dbUrl);
db.connection.on("error", function (error) {  console.log("数据库连接失败：" + error); });
db.connection.on("open", function () {  console.log("------数据库连接成功！------"); });

var app = express();

//设置模板及引擎
var ejs = require('ejs');
app.set('views', path.join(__dirname, 'views'));
app.engine('html', ejs.__express);
app.set('view engine', 'html');



// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'favicon.ico')));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//app.use(express.static(path.join(__dirname, 'public')));

//session
app.use(cookieParser('gmcms'));
app.use(session({
  secret: 'gmcms',
  cookie: { maxAge: 30 * 60 * 1000 },
  store: new redisStore({
    port: config.redis_port,
    host: config.redis_host
  }),
  resave: true,
  rolling: true,
  saveUninitialized: true,
}));


//日志管理
//app.use(log4js.connectLogger(logger, {level:log4js.levels.INFO}));
app.use(logger)


var routes = require('./routes/index');
var apiRouterV1 = require('./routes/api');
var forward = require('./routes/forward');
var _public = require('./routes/open');
app.use('/', routes);
app.use('/', forward);
app.use('/cms/api', apiRouterV1);
app.use('/cms/api/public', function(req, res, next){
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By",' 3.2.1')
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
}, _public);


//添加全局变量


_.extend(app.locals, {
  assetsPath: config.assets_path,
  domainPath: config.domain_path,
  config: config,
  logo: null
});

_.extend(app.locals, require('./util/render-help'));


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
