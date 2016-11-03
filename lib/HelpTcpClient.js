'use strict';

const net = require('net');
const uuid = require('uuid');
const TimeoutError = require('rxjs/util/TimeoutError').TimeoutError;
const EventEmitter = require('events').EventEmitter;

const Observable = require('./rx');
const errors = require('./errors/index');

// only load the addons we need
require('rxjs/add/observable/merge');
require('rxjs/add/observable/fromEventPattern');

require('rxjs/add/operator/filter');
require('rxjs/add/operator/find');
require('rxjs/add/operator/do');
require('rxjs/add/operator/share');
require('rxjs/add/operator/timeout');
require('rxjs/add/operator/map');
require('rxjs/add/operator/retryWhen');

let validator = null;

class HelpClient {
  static get commands() {
    return ['count', 'time'];
  }

  static isValidCommand(command) {
    if (!validator) {
      validator = new RegExp(`^${this.commands.join('|')}$`);
    }
    return validator.test(command);
  }

  constructor(host, port, user, timeout = 2000, keepAlive = true) {
    if (!(host && port && user)) {
      throw new errors.InvalidArguments('host, port and user are required');
    }
    this.timeout = timeout;
    // set up stream used to write to our client
    const writeEvent = new EventEmitter();
    const writeSource = Observable.fromEventPattern(
    (h) => {
      writeEvent.addListener('write', h);
    },
    (h) => {
      writeEvent.removeListener('write', h);
    })
      .share();
    // expose write event emmiter
    this.write = data => writeEvent.emit('write', data);
    let client;
    let writeSubscription;
    this.tcpSource = Observable.fromTcp(
      // factory to create a connection when fromTcp requests for it
      // this will execute when someone subscribes to that service
      () => {
        client = net.connect(port, host);
        writeSubscription = writeSource.subscribe((x) => {
          client.write(`${x}\n`);
        });
        this.write(`{ "name" : "${user}" }`);
        return client;
      },
      // unregister or destroy. When there are no more subscribers fromTcp
      // will call this method where we clean up;
      () => {
        writeSubscription.unsubscribe();
        client.end();
        client = null;
      });
    if (keepAlive) {
      this.heartBeatSubscription = this.tcpSource
        .filter(x => /heartbeat/i.test(x))
        .timeout(timeout)
        // set up our retry. In rxjs when we encounter an error
        // rxjs will unsubscribe this will cause our fromTcp observable to
        // unsubscribe which will close our connection but the retry will
        // will subscribe to our tcp Stream which will call the initialize
        // client factory that will create a new connection for us.
        .retryWhen(hbError => hbError.do((err) => {
        // if the error is not a timeout error do not retry;
          if (!(err instanceof TimeoutError)) {
            throw err;
          }
        }))
     .subscribe();
    }
  }

  sendCommand(command) {
    if (this.closed) {
      throw new errors.ClientClosed("client has been closed");
    }
    if (!HelpClient.isValidCommand(command)) {
      throw new errors.InvalidCommand(`command must be one of "${HelpClient.commands.join(', ')}"`);
    }
    const id = uuid.v4();
    const predicate = x => new RegExp(id, 'i').test(x);
    const request = `{ "request" : "${command}", "id" : "${id}" }`;
    const observable = this.tcpSource
      .split('\n')
      .find(predicate)
      // setting timeout twice the heart beat
      // no particular reason just picking some number
      // greater that the heart beat to give
      // a chance for the request to resolve
      .timeout(this.timeout * 2)
      .map(x => JSON.parse(x));
    // publish write
    this.write(request);
    return observable;
  }

  close() {
    if (this.heartBeatSubscription) {
      this.heartBeatSubscription.unsubscribe();
      this.heartBeatSubscription = null;
      this.closed = true;
    }
  }
}

module.exports = HelpClient;
