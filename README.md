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

### Usage
To test run `$ npm test`
To run use `$ help-tcp <username>`

###My solution.
I decided to solve this problem using FRP specifically [rxjs](https://www.npmjs.com/package/rxjs).
I chose this patter because I felt it fit this use case well and allwed me to play with FRP, which I don't
get to do as much as I would like.
The basic idea is to create a stream from a tcp connection. By default sources are replayed so I needed
to make this a sharable stream, this means that any subscriber will get notified of what is happening live and not
get a replay. This also allowed me to keep track of subscribers. In this example the subscribers were the heartbeat and
any active request. When there were no more subscribers I cold close the connection. The [tcp](https://github.com/Jhorlin/help-tcp/blob/master/lib/rx/fromTcp.js#L7)
takes in two arguments, a function to create a stream (this will happen on the first subscription only) and a function called when
there are no more subscriptions. [Create](https://github.com/Jhorlin/help-tcp/blob/master/lib/HelpTcpClient.js#L59)
[destroy](https://github.com/Jhorlin/help-tcp/blob/master/lib/HelpTcpClient.js#L69).
This works really well because we can now create a [heart beat subscription](https://github.com/Jhorlin/help-tcp/blob/master/lib/HelpTcpClient.js#L69)
based on our tcp source. Now that we have a stream we can filter out any matches for hearbeat and set a timeout. We can 
also conditionally retry for a `TimeoutError`. The retry logic works because if there is an error, the heartbeat subscription
is unsubscribed. Once there are no more subscriptions we will remove the client then immediately create a new one.
Also since we are handling our async through streams we can do the same for our commands. We create a source from an
[EventEmmiter](https://github.com/Jhorlin/help-tcp/blob/master/lib/HelpTcpClient.js#L44) and when we create a client we
[subscribe](https://github.com/Jhorlin/help-tcp/blob/master/lib/HelpTcpClient.js#L61) to the event source and pump messages into that client.
