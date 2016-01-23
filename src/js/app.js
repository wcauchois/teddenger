var websocket = require('websocket-stream'),
    _ = require('lodash'),
    React = require('react'),
    ReactDOM = require('react-dom'),
    EventEmitter = require('events').EventEmitter,
    moment = require('moment'),
    dnode = require('dnode');

var websocketPath = 'ws' + (location.protocol === 'https:' ? 's' : '') + '://' +
  location.hostname + (location.port ? (':' + location.port) : '');
var ws = websocket(websocketPath);

var eventBus = new EventEmitter();

var d = dnode({
  gotMessages: function(messages) {
    eventBus.emit('messages', messages);
  }
});

d.on('remote', function(remote) {
  global.remote = remote;
});

ws.pipe(d).pipe(ws);

var SingleMessage = React.createClass({
  render: function() {
    var m = this.props.message;
    return (
      <div className="message">
        <span className="timestamp">
          {moment(m.timestamp).format('h:mm a')}
        </span>
        <span className="senderName">{m.senderName}:</span>
        <span className="body">{m.body}</span>
      </div>
    );
  }
});

var MessageList = React.createClass({
  render: function() {
    var messages = _.map(this.props.messages, function(message, i) {
      return <SingleMessage message={message} key={i} />;
    });
    if (!messages.length) {
      messages = (
        <div className="loading">
          <h3>[Loading]</h3>
        </div>
      );
    }
    return (
      <div className="messageList col-md-12" ref={this.props.gotListRef}>
        {messages}
      </div>
    );
  }
});

var SendControl = React.createClass({
  getInitialState: function() {
    return {value: ''};
  },

  handleChange: function(event) {
    this.setState({value: event.target.value});
  },

  handleKeyDown: function(event) {
    if (event.keyCode === 13) {
      this.doSend();
    }
  },

  doSend: function() {
    global.remote.sendMessage(this.state.value);
    eventBus.emit('messages', [{
      body: this.state.value,
      senderName: '(You)'
    }]);
    this.setState({value: ''});
  },

  render: function() {
    return (
      <div className="col-md-12">
        <div className="input-group">
          <input type="text" className="form-control" placeholder="Type a message"
            value={this.state.value} onChange={this.handleChange}
            onKeyDown={this.handleKeyDown} />
          <span className="input-group-btn">
            <button className="btn btn-default" type="button"
              onClick={this.doSend}>Send</button>
          </span>
        </div>
      </div>
    );
  }
});

var RootView = React.createClass({
  getInitialState: function() {
    return {
      messages: []
    };
  },

  handleMessages: function(messages) {
    this.setState({
      messages: this.state.messages.concat(messages)
    }, function() {
      $(this._listRef).scrollTop(999999999);
    }.bind(this));
  },

  gotListRef: function(listRef) {
    this._listRef = listRef;
  },

  componentDidMount: function() {
    eventBus.on('messages', this.handleMessages);
  },

  componentWillUnmount: function() {
    eventBus.removeListener('messages', this.handleMessages);
  },

  render: function() {
    return (
      <div>
        <div className="row headerRow"></div>
        <div className="row">
          <MessageList messages={this.state.messages} gotListRef={this.gotListRef} />
        </div>
        <div className="row">
          <SendControl />
        </div>
      </div>
    );
  }
});

function renderPage() {
  ReactDOM.render(
    <RootView />,
    document.getElementById('container')
  );
}
renderPage();

