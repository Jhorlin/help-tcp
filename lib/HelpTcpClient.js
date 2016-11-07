'use strict';
const uuid = require('uuid');

const errors = require('./errors');
const ConnectionManager = require('./ConnectonManager');
const timeoutHelper = require('./timeout');

//private accessors
const clientAccessor = Symbol('clientManager');
const timeoutAccessor = Symbol('timeout');

const heartBeat = (x) => /heartbeat/i.test(x);

// for v8 optimization purposes we move our try catch into its own function
function toJSON(msg, onSuccess, onError) {
  try {
    onSuccess(JSON.parse(msg));
  } catch (e) {
    onError(e);
  }
}

let validator;

class HelpTcpClient {
  static get commands() {
    return ['count', 'time'];
  }

  static isValidCommand(command) {
    if (!validator) {
      validator = new RegExp(`^${this.commands.join('|')}$`);
    }
    return validator.test(command);
  }

  constructor(host, port, user, timeout = 2000) {
    if (!(host && port && user)) {
      throw new errors.InvalidArguments('host, port and user are required');
    }
    this[timeoutAccessor] = timeout;
    let client;
    let heartBeatTimeout;
    // set up callback for what a connection is established
    let onConnect = () => {
      client.write(`{ "name" : "${user}" }`);
      // if we timeout on the heartbeat establish a new connection
      heartBeatTimeout = timeoutHelper(connect, timeout);
    };
    // clean up when a connection is terminated
    let onDisconnect = () => {
      if(heartBeatTimeout){
        heartBeatTimeout.cancel();
      }
    };
    // test for a heartbeat and reset the timeout when found
    let heartBeatHandler = (err, messages) => {
      if(messages) {
        let message = messages.filter(heartBeat)[0];
        if(message || heartBeatTimeout) {
          heartBeatTimeout.reset();
        }
      }
    };
    let connect = () => {
      // if we have an existing client unregister the handler.
      // this will cause the currently client to gracefully close once
      // all handlers are removed including any in flight.
      if(client) {
        client.unregister(heartBeatHandler);
      }
      // create a new client
      client = this[clientAccessor] = new ConnectionManager(host, port, onConnect, onDisconnect);
      // register the heartbeat handler so the client will create a connection
      client.register(heartBeatHandler);
    };
    this.close = () => {
      if(client){
        client.unregister(heartBeatHandler);
        this[clientAccessor] = client = null;
      }
    };
    connect();
  }

  sendCommand(command) {
    return new Promise((resolve, reject) => {
      if (!(command)) {
        return reject(new errors.SendCommandInvalidArgument('command and callback are required'));
      }
      if (!this[clientAccessor]) {
        return reject(new errors.ClientClosed("client has been closed"));
      }
      if (!HelpTcpClient.isValidCommand(command)) {
        return reject(new errors.InvalidCommand(`command must be one of "${HelpTcpClient.commands.join(', ')}"`));
      }
      const client = this[clientAccessor];
      const id = uuid.v4();
      const requestIdRegex = new RegExp(id, 'i');
      const predicate = x => requestIdRegex.test(x);
      // set up handler to filter the messages for the specific id
      const handler = (err, messages) => {
        if (err) {
          requestTimeout.cancel();
          return reject(err)
        }
        let message = messages.filter(predicate)[0];
        if (message) {
          requestTimeout.cancel();
          toJSON(message, resolve, reject);
          return true;
        }
      };
      client.register(handler);
      client.write(`{ "request" : "${command}", "id" : "${id}" }`);
      // set timeout to reject and remove the handler from the client
      // in case of a timeout
      const requestTimeout = timeoutHelper(() => {
        client.unregister(handler);
        reject(new errors.TimeoutError('Request timed out'))
      }, this[timeoutAccessor] * 2);
    });
  }
}

module.exports = HelpTcpClient;
