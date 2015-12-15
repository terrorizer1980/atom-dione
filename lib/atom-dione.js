var CompositeDisposable = require('atom').CompositeDisposable

var AtomTracer = module.exports = {
  modalPanel: null,
  subscriptions: null,
  activate: function(state) {
    this.subscriptions = new CompositeDisposable()

    require('./webserver')

    var retry = 2
    function connect() {
      var WebSocketClient = require('websocket').client
      var client = new WebSocketClient()

      client.connect('ws://localhost:1337/', 'dione')
      client.on('connect', function(conn) {
        retry = 2
        conn.sendUTF('{ "subscribe": true }')
        conn.on('message', function(message) {
          if (message.type === 'utf8') {
            processMessage(message)
          }
        })
      })
      client.on('connectFailed', function(err) {
        retry = retry*2
        setTimeout(connect, retry*100)
        console.log('Connection failed', err, retry)
      })
    }
    connect()

    function processMessage(message) {
      var data = JSON.parse(message.utf8Data)
      var path = data.path
      var range = data.range
      atom.workspace.getTextEditors().forEach(function(editor) {
        var commands = data[editor.getPath()]
        if (!commands) return

        commands.forEach(function(command) {
          var marker = editor.markBufferRange(command, { invalidate: 'touch' })
          var decorate = editor.decorateMarker(marker, { type: 'line-number', 'class': 'traced' })
          setTimeout(function() {
            marker.destroy()
          }, 500)
        })
      })
    }

    return this.subscriptions.add(atom.commands.add('atom-workspace', {
      'atom-tracer:toggle': (function(_this) {
        return function() {
          return _this.toggle();
        };
      })(this)
    }));
  },
  deactivate: function() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
  }
};
