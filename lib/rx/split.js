'use strict';

const Observable = require('rxjs/Observable').Observable;

function split(delimiter) {
  return Observable.create((subscriber) => {
    const subscription = this.source.subscribe((value) => {
      value.toString().split(delimiter).forEach((token) => {
        if (token) {
          subscriber.next(token);
        }
      });
    },
    err => subscriber.error(err),
    () => subscriber.complete());
    return subscription;
  });
}

Observable.prototype.split = split;
