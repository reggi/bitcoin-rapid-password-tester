#!/usr/bin/env node
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.promiseDebounce = promiseDebounce;
exports.wrapAttempt = wrapAttempt;

var _bitcoin = require('bitcoin');

var _bitcoin2 = _interopRequireDefault(_bitcoin);

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

var _repl = require('repl');

var _repl2 = _interopRequireDefault(_repl);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _yargs = require('yargs');

var _yargs2 = _interopRequireDefault(_yargs);

var _colors = require('colors');

var _colors2 = _interopRequireDefault(_colors);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var argv = _yargs2.default.argv;


var rps = argv.rps || 50;
var user = 'bitcoinuser';
var pass = 'bitcoinpass';
var spawn = _child_process2.default.spawn;

var client = new _bitcoin2.default.Client({
  host: 'localhost',
  port: 8332,
  timeout: 30000,
  user: user,
  pass: pass
});

_bluebird2.default.promisifyAll(client);

var child = void 0;

function startBitcoinDaemon() {
  var args = ["-server", '-rpcuser=' + user, '-rpcpassword=' + pass];
  if (argv.datadir) args.push('-datadir=' + argv.datadir);
  if (argv.rpcthreads) args.push('-rpcthreads=' + argv.rpcthreads);
  child = spawn('bitcoind', args, { detached: true });
}

function waiter() {
  return new _bluebird2.default(function (resolve) {
    var interval = setInterval(function () {
      return client.getBalanceAsync('*', 6).then(function (value) {
        clearInterval(interval);
        return resolve(value);
      }).catch(function (err) {});
    }, 300);
  });
}

startBitcoinDaemon();

console.log('bitcoind is starting...');

function promiseDebounce(fn, delay, count) {
  var working = 0;
  var queue = [];
  function work() {
    if (queue.length === 0 || working === count) return;
    working++;
    _bluebird2.default.delay(delay).tap(function () {
      working--;
    }).then(work);
    var next = queue.shift();
    next[2](fn.apply(next[0], next[1]));
  }
  return function debounced() {
    var args = arguments;
    return new _bluebird2.default(function (resolve) {
      queue.push([this, args, resolve]);
      if (working < count) work();
    }.bind(this));
  };
}

function wrapAttempt(text) {
  return client.walletPassphraseAsync(text, 0).then(function () {
    console.log(('✓ - correct password ' + text).green);
  }).catch(function (err) {
    if (err.message === 'Error: The wallet passphrase entered was incorrect.') {
      console.log(('✗ - invalid password ' + text).red);
    } else {
      console.log(err.message);
    }
  });
}

var debouncedAttempt = promiseDebounce(wrapAttempt, rps, 1);

waiter().then(function () {

  console.log('bitcoind server ready');

  var replServer = _repl2.default.start({
    ignoreUndefined: true,
    prompt: '> ',
    eval: function _eval(text, context, filename, callback) {
      text = text.replace(/\n$/, '');
      debouncedAttempt(text).then(function () {
        return callback(null);
      });
    }
  });

  replServer.on('exit', function () {
    try {
      process.kill(-child.pid, "SIGINT");
    } catch (err) {
      console.log('could not kill process ' + -child.pid);
    }
    process.exit();
  });
});