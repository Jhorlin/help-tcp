'use strict';

class BaseError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.message = message;
		Error.captureStackTrace(this, this.constructor);
  }
}

class InvalidArguments extends BaseError { }

class InvalidCommand extends BaseError { }

class ClientClosed extends BaseError { }

module.exports = {
  InvalidArguments,
  InvalidCommand,
  ClientClosed,
};
