var express = require('express'),
    morgan = require('morgan'),
    Promise = require('bluebird'),
    login = require('facebook-chat-api'),
    config = require('config'),
    EventEmitter = require('events').EventEmitter,
    http = require('http'),
    WebSocketServer = require('ws').Server,
    websocket = require('websocket-stream'),
    _ = require('lodash'),
    dnode = require('dnode'),
    colors = require('colors'),
    util = require('util'),
    mustacheExpress = require('mustache-express');

var app = express();

app.use(express.static('public'));
app.use(morgan('dev'));
app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');
app.disable('etag');

app.get('/', function(req, res) {
  res.render('home');
});

function logError(err) {
  util.log(err.toString().red);
}

var server = http.createServer(app);

var port = process.env.PORT || 3000;
server.listen(port, function() {
  util.log(("Started listening on port " + port).blue);
});

var facebookApi;
var facebookEvents = new EventEmitter();

login({email: config.fb_login, password: config.fb_pass}, function(err, api) {
  util.log("Logged in to Facebook");
  facebookApi = api;
  api.listen(function(err, message) {
    if (err) {
      logError(err);
    } else {
      console.log(message); // XXX
      facebookEvents.emit('message', message);
    }
  });
});

var rpcs = {
  testRpc: function() {
    util.log("Got a call to testRpc");
  },

  sendMessage: function(body) {
    facebookApi.sendMessage(body, config.thread_id);
  }
};

function renderMessage(m) {
  return {
    senderName: m.senderName,
    body: m.body
  };
}


var wss = new WebSocketServer({server: server});
wss.on('connection', function(ws) {
  util.log('Connected WebSocket');
  var websocketStream = websocket(ws);
  var d = dnode(rpcs);
  websocketStream.pipe(d).pipe(websocketStream);
  var messageListener;
  d.on('remote', function(remote) {
    messageListener = function(message) {
      if (message.threadID == config.thread_id) {
        remote.gotMessages([renderMessage(message)]);
      }
    };
    facebookEvents.on('message', messageListener);
    facebookApi.getThreadHistory(config.thread_id, 0, 30, null, function(err, history) {
      if (err) {
        logError(err);
      } else {
        remote.gotMessages(history.map(renderMessage));
      }
    });
  });
  ws.on('close', function() {
    websocketStream.emit('close');
    messageListener && facebookEvents.removeListener('message', messageListener);
    util.log('Disconnected WebSocket');
  });
});

