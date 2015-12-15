var http = require('http')
var websocket = require('websocket')

function startServer() {
  var server = http.createServer(function(req, res) { })
  server.listen(1337, function() {
    console.log((new Date()) + ' Server is listening on port 1337')
  })
  server.on('error', function(err) {
    console.log('err', err)
  })

  var wsServer = new websocket.server({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
  })

  var subscribers = []

  wsServer.on('request', function(request) {
    var conn = request.accept('dione', request.origin)
    conn.on('message', function(message) {
      if (message.type === 'utf8') {
        try {
          var data = JSON.parse(message.utf8Data)
          if (data.subscribe) {
            if (subscribers.indexOf(conn) === -1) {
              subscribers.push(conn)
            }
          } else {
            subscribers.forEach(function(conn) {
              conn.sendUTF(message.utf8Data)
            })
          }
        } catch (err) {
          console.error('Received bad message', err, message.utf8Data)
        }
      }
    })
    conn.on('close', function() {
      var i = subscribers.indexOf(conn)
      if (i >= 0) {
        subscribers.splice(i, 1)
      }
    })
  })
}

if (module.id === require.main.id) {

  function processClient() {
    var WebSocketClient = require('websocket').client
    var client = new WebSocketClient()

    client.connect('ws://localhost:1337/', 'dione')
    client.on('connect', function(conn) {
      setInterval(function() {
        conn.sendUTF('{}')
      }, 2000)
    })
  }
  processClient()

  var retry = 2
  function atomClient() {
    var WebSocketClient = require('websocket').client
    var client = new WebSocketClient()

    client.connect('ws://localhost:1337/', 'dione')
    client.on('connect', function(conn) {
      retry = 2
      conn.sendUTF('{ "subscribe": true }')
      conn.on('message', function(message) {
        if (message.type === 'utf8') {
          console.log("Received: '" + message.utf8Data + "!!!!'")
        }
      })
      setTimeout(function() {
        conn.close()
      }, 2000)
    })
    client.on('connectFailed', function(err) {
      retry = retry*2
      setTimeout(atomClient, retry*100)
      console.log('Connection failed', err, retry)
    })
  }
  atomClient()

} else {
  startServer()
}
