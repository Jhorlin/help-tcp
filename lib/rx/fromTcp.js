'use strict';

const Observable = require('rxjs/Observable').Observable;

require('rxjs/add/operator/share');

function fromTcp(clientFactory, destructor) {
  return Observable.create((subscriber) => {
    const client = clientFactory();
    client.on('data', data => subscriber.next(data));
    client.on('error', err => subscriber.error(err));
    client.on('end', () => subscriber.complete());
    return destructor;
  })
    // make this a hot observable so any subscribers get the latest
    // messages
    .share();
}

Observable.fromTcp = fromTcp;
