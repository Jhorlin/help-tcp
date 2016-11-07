'use strict';

const net = require('net');

const errors = require('./errors');

//private accessors
const handlersAccessor = Symbol('handlers');
const clientAccessor = Symbol('clientAccessor');
const createClientAccessor = Symbol('createClient');
const destroyClientAccessor = Symbol('destroyClient');
const verifyHandlersAccessor = Symbol('verifyHandlers');

const exists = x => x;

class ConnectonManager {
  constructor(host, port, onConnect, onDisconnect) {
    let handlers = this[handlersAccessor] = new Set();
    let onData = data => {
      if (handlers.size) {
        for (let handler of handlers) {
          let messages = data.toString().split('\n').filter(exists);
          // if the message is truthie it has been handled
          if (handler(null, messages)) {
            handlers.delete(handler);
          }
        }
        verifyHandlers();
      }
    };
    let onError = error => {
      if (handlers.size) {
        for (let handler of handlers) {
          // if the message is truthie it has been handled
          handler(error, null);
          handlers.delete(handler);
        }
        verifyHandlers();
      }
    };
    let onEnd = () => {
      this.onError(new errors.ConnectionClosed('Client connection closed'));
    };
    let verifyHandlers = this[verifyHandlersAccessor] = () => {
      // if there are no more handlers we can end this connection
      if(handlers.size === 0) {
        destroy();
      }
    };
    let client;

    this[createClientAccessor]  = () => {
      client = this[clientAccessor] = net.connect(port, host, onConnect);
      client.on('data', onData);
      client.on('error', onError);
      client.on('end', onEnd);
    };

    let destroy = this[destroyClientAccessor] = () => {
      if(client) {
        client.removeAllListeners('data');
        client.removeAllListeners('error');
        client.removeAllListeners('end');
        client.end();
        client = this[clientAccessor] = null;
      }
      if(onDisconnect){
        onDisconnect();
      }
    };
  }

  register(handler) {
    // If this is our first handler beeing registered than create the client
    let handlers = this[handlersAccessor];
    if(handlers.size === 0) {
      this[createClientAccessor]();
    }
    handlers.add(handler);
  }

  unregister(handler) {
    this[handlersAccessor].delete(handler);
    this[verifyHandlersAccessor]();
  }

  write(message) {
    if(this[clientAccessor]){
      this[clientAccessor].write(`${message}\n`);
    }
  }
}

module.exports = ConnectonManager;
