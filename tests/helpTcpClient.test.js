const assert = require('assert');
const Mitm = require('mitm'); //eslint-disable-line node/no-unpublished-require
const HelpTcpClient = require('../lib/HelpTcpClient');
const errors = require('../lib/errors');

describe('HelpTcpClient Class', () => {
  it('should throw an error with invalid arguments', () => {
    assert.throws(() => {
      new HelpTcpClient();
    }, errors.InvalidArguments
    );
  });

  it('should create an instance', () => {
    const instance = new HelpTcpClient('localhost', '3000', 'jhorlin');
    assert.ok(instance);
  });

  it('should get a list of accepted commands', () => {
    assert.deepEqual(HelpTcpClient.commands, ['count', 'time']);
  });

  it('should validate all acceptable commands', () => {
    HelpTcpClient.commands.forEach(x => assert.ok(HelpTcpClient.isValidCommand(x)));
  });

  it('should return false for invalid command', () => {
    assert.equal(false, HelpTcpClient.isValidCommand('invalid'));
  });

  it('should throw an when send command is an invalid command', () => {
    assert.throws(() => {
      const instance = new HelpTcpClient('localhost', '3000', 'jhorlin');
      instance.sendCommand('invalid');
    }, errors.InvalidCommand);
  });

  describe('good response', () => {
    let mitm;
    before(function () {
      mitm = Mitm();
      mitm.on('connection', (socket) => {
        socket.on('data', (data) => {
          const obj = JSON.parse(data);
          switch (obj.request) {
            case 'count': {
              const msg = `{"response" : "${Math.random()}", "id" : "${obj.id}"}`;
              socket.write(msg);
            }
              break;
            case 'time': {
              const msg = `{"response" : "${Date.now()}", "id" : "${obj.id}"}`;
              socket.write(msg);
            }
              break;
            default:
              socket.write('oops');
          }
        });
      });
    });

    after(() => {
      mitm.disable();
    });

    it('should get back a count response', (done) => {
      const client = new HelpTcpClient('localhost', '1', 'jhorlin');
      client.sendCommand('count')
        .subscribe((response) => {
          assert.ok(response);
          done();
        }, (err) => {
          done(err);
        });
    });

    it('should get back a time response', (done) => {
      const client = new HelpTcpClient('localhost', '1', 'jhorlin');
      client.sendCommand('time')
        .subscribe((response) => {
          assert.ok(response);
          done();
        }, (err) => {
          done(err);
        });
    })
  });

  describe('malformed JSON', () => {
    let mitm;
    before(function () {
      mitm = Mitm();
      mitm.on('connection', (socket) => {
        socket.on('data', (data) => {
          const obj = JSON.parse(data);
          switch (obj.request) {
            case 'count': {
              const msg = `"response" : "${Math.random()}", "id" : "${obj.id}"}`;
              socket.write(msg);
            }
              break;
            case 'time': {
              const msg = `"response" : "${Date.now()}", "id" : "${obj.id}"}`;
              socket.write(msg);
            }
              break;
          }
        });
      });
    });

    after(() => {
      mitm.disable();
    });

    it('should get back a count response', (done) => {
      const client = new HelpTcpClient('localhost', '1', 'jhorlin');
      client.sendCommand('count')
        .subscribe(() => {
        }, (err) => {
          assert.ok(err);
          done();
        });
    });

    it('should get back a time response', (done) => {
      const client = new HelpTcpClient('localhost', '1', 'jhorlin');
      client.sendCommand('time')
        .subscribe(() => {
        }, (err) => {
          assert.ok(err);
          done();
        });
    });
  });

  describe('request timeout', function () {
    this.timeout(5000);
    let mitm;
    before(function () {
      mitm = Mitm();
      mitm.on('connection', socket => {
        setInterval(() => {
          socket.write(`{"type" : "heartbeat", "epoch" : ${Date.now()}}`);
        }, 1000);

        socket.on('data', (data) => {
          const obj = JSON.parse(data);
          switch (obj.request) {
            case 'count': {
              setTimeout(() => {
                const msg = `{"response" : "${Math.random()}", "id" : "${obj.id}"}`;
                socket.write(msg);
              }, 4500);
              break;
            }
            case 'time': {
              setTimeout(() => {
                const msg = `{"response" : "${Date.now()}", "id" : "${obj.id}"}`;
                socket.write(msg);
              }, 4500);
              break;
            }}
        });
      });
    });

    after(() => {
      mitm.disable();
    });

    it('should timeout on count response', done => {
      const client = new HelpTcpClient('localhost', '1', 'jhorlin');
      client.sendCommand('count')
        .subscribe(() => {
        }, (err) => {
          assert.equal(err.name, 'TimeoutError');
          done()
        });
    });

    it('should timeout on time response', done => {
      const client = new HelpTcpClient('localhost', '1', 'jhorlin');
      client.sendCommand('time')
        .subscribe(() => {
        }, (err) => {
          assert.equal(err.name, 'TimeoutError');
          done();
        });
    })
  });

  describe('hearbeat', () => {
    let mitm;
    before(function () {
      mitm = Mitm();
      mitm.on('connection', socket => {
        setInterval(() => {
          socket.write(`{"type" : "heartbeat", "epoch" : ${Date.now()}}`);
        }, 1000);

        socket.on('data', (data) => {
          const obj = JSON.parse(data);
          switch (obj.request) {
            case 'count': {
              setTimeout(() => {
                const msg = `{"response" : "${Math.random()}", "id" : "${obj.id}"}`;
                socket.write(msg);
              }, 500);
              break;
            }
            case 'time': {
              setTimeout(() => {
                const msg = `{"response" : "${Date.now()}", "id" : "${obj.id}"}`;
                socket.write(msg);
              }, 500);
              break;
            }
          }
        });
      });
    });

    after(() => {
      mitm.disable();
    });

    it('should get back a count response', done => {
      const client = new HelpTcpClient('localhost', '1', 'jhorlin');
      client.sendCommand('count')
        .subscribe((response) => {
          assert.ok(response);
          assert.equal('object', typeof response);
          done();
        }, (err) => {
          done(err);
        });
    });

    it('should get back a time response', done => {
      const client = new HelpTcpClient('localhost', '1', 'jhorlin');
      client.sendCommand('time')
        .subscribe((response) => {
          assert.ok(response);
          assert.equal('object', typeof response);
          done();
        }, (err) => {
          done(err);
        });
    });
  });

  describe('hearbeat timeout', function () {
    this.timeout(3000);
    let connectionCount;
    const mitm = Mitm();

    before(() => {
      connectionCount = 0;
      mitm.on('connection', socket => {
        let timeout;
        socket.on('data', (data) => {
          const obj = JSON.parse(data);
          if (obj.name === 'hb') {
            connectionCount++;
          }
        });
        var beat = function () {
          timeout = setInterval(() => {
            socket.write(`{"type" : "heartbeat", "epoch" : ${Date.now()}}`);
            beat();
          }, 2500);
        };
        beat();
        socket.on('close', () => {
          clearTimeout(timeout);
        })
      });
    });

    after(() => {
      mitm.disable();
    });

    it('should attempt to reconnect twice in a span of 2500ms', done => {
      new HelpTcpClient('localhost', '1', 'hb');
      setTimeout(() => {
        assert.equal(connectionCount, 2);
        done();
      }, 2500)
    });
    it('should close a connection', () => {
      const instance = new HelpTcpClient('localhost', '1', 'hb');
      instance.close();
    })
  })
});
