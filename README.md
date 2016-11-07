# Help.com backend project by Jhorlin De Armas

### Acceptance Criteria

Your program should demonstrate the following as well as demonstrate good coding practices.

- [x] Connect and log into the system.
- [x] Handle heartbeats appropriately and depict the reconnection logic if you do not receive a heartbeat.
- [x] Handle input from STDIN so your user can manually send JSON data to the server process.
- [x] Receive responses only for requests your client sends.
- [x] Verify and validate input to be sent, and also handle errors sent by the server.
- [x] If the random number sent back from the result of the "time" call is greater than 30, it should print out a message saying so.
- [x] Provide a way to send both the "count" and "time" calls to the worker process and show the results in a nicely formatted way.

### Setup
After cloning the repo run `$ npm install`

Run `$ npm link` so the path is avaliable in your terminal.

### Usage
To test run `$ npm test`

To run use `$ help-tcp <username>`

###My solution.
This solution is split into two. A [connection manager](https://github.com/Jhorlin/help-tcp/blob/lessDependencies/lib/ConnectonManager.js) and
the [help client](https://github.com/Jhorlin/help-tcp/blob/lessDependencies/lib/HelpTcpClient.js). The reason for this separation is so that the
connection manager tcp connections independent from specific logic in the the help tcp client such as filtering requets by an id or the
reconnection logic. The connection manager will create a connection when there are one or more handlers [registered](https://github.com/Jhorlin/help-tcp/blob/lessDependencies/lib/ConnectonManager.js#L73) and will terminate
the connection where all handlers have been [unregistred](https://github.com/Jhorlin/help-tcp/blob/lessDependencies/lib/ConnectonManager.js#L82).
The retry logic works by creating a handler that will reset a timeout on every [herat beat message](https://github.com/Jhorlin/help-tcp/blob/lessDependencies/lib/HelpTcpClient.js#L61).
This timeout is created on a [connection](https://github.com/Jhorlin/help-tcp/blob/lessDependencies/lib/HelpTcpClient.js#L48). You can see the
timeout will call [connect](https://github.com/Jhorlin/help-tcp/blob/lessDependencies/lib/HelpTcpClient.js#L65) method. This will unregister the
heart best handler and create a new client. The old client will disconnect once all handlers are removed including any in flight that will eventually
time out, reject or resolve.
