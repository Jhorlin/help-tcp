#!/usr/bin/env node
'use strict';

const config = require('config');
const program = require('commander');
const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const inquirer = require('inquirer');
const _ = require('lodash');

const pkg = require('./package.json');
const HelpeTcpClient = require('./lib/HelpTcpClient');

function helpUser(user) {
  const host = program.host || config.host;
  const port = program.port || config.port;
  const choices = HelpeTcpClient.commands.concat(['exit']);
  const client = new HelpeTcpClient(
  host,
  port,
  user,
  (process.timeout || config.timeout) * 1000
  );
  clear();
  /*eslint no-console: 0*/
  console.log(
  chalk.blue(figlet.textSync('Help.com TCP\n')),
  chalk.bgBlue(`\nuser: ${user}, address:${host}:${port}\n`)
  );

  const ask = () => {
    inquirer.prompt([
      {
        type: 'list',
        name: 'command',
        message: 'select a command',
        choices,
      },
    ])
     .then((answers) => {
       if (answers.command === 'exit') {
         console.log(chalk.blue(`Goodbye ${user}`));
         client.close();
       } else {
         client.sendCommand(answers.command)
           .subscribe((x) => {
             console.log(chalk.green(JSON.stringify(x, null, 4)));
             if (answers.command === 'time') {
               const randomNumber = _.get(x, 'msg.random', 0);
               if (randomNumber > 30) {
                 console.log(chalk.yellow(`Found random number greater than 30: ${randomNumber}`));
               }
             }
           },
         (err) => {
           console.log(chalk.red(err.message));
           ask();
         },
         () => ask());
       }
     });
  };
  ask();
}

program
  .version(pkg.version)
  .arguments('<user>')
  .option('-h, --host <address>', 'server host address')
  .option('-p, --port <number>', 'server port number', parseInt)
  .option('-t, --timeout <seconds>', 'heart beat time in seconds before re-establishing the connection', parseInt)
  .action(helpUser);

program.parse(process.argv);

if (_.isEmpty(program.args)) {
  console.error('Missing <user> argument.');
  program.outputHelp();
  process.exit(-1); // eslint-disable-line no-process-exit
}
