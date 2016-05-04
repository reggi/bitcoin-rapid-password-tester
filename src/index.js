#!/usr/bin/env node
import bitcoin from 'bitcoin'
import child_process from 'child_process'
import repl from 'repl'
import Promise from 'bluebird'
import yargs from 'yargs'
import colors from 'colors'

let { argv } = yargs

const rps = argv.rps || 50
const user = 'bitcoinuser'
const pass = 'bitcoinpass'
const spawn = child_process.spawn

let client = new bitcoin.Client({
  host: 'localhost',
  port: 8332,
  timeout: 30000,
  user,
  pass
})

Promise.promisifyAll(client)

let child

function startBitcoinDaemon() {
  let args = ["-server", `-rpcuser=${user}`, `-rpcpassword=${pass}`]
  if (argv.datadir) args.push(`-datadir=${argv.datadir}`)
  if (argv.rpcthreads) args.push(`-rpcthreads=${argv.rpcthreads}`)
  child = spawn('bitcoind', args, {detached: true})
}

function waiter() {
  return new Promise((resolve) => {
    let interval = setInterval(() => {
      return client.getBalanceAsync('*', 6)
        .then(value => {
          clearInterval(interval)
          return resolve(value)
        })
        .catch((err) => {

        })
    }, 300)
  })
}

startBitcoinDaemon()

console.log('bitcoind is starting...')

export function promiseDebounce (fn, delay, count) {
  let working = 0
  let queue = []
  function work () {
    if ((queue.length === 0) || (working === count)) return
    working++
    Promise.delay(delay).tap(function () { working-- }).then(work)
    var next = queue.shift()
    next[2](fn.apply(next[0], next[1]))
  }
  return function debounced () {
    var args = arguments
    return new Promise(function (resolve) {
      queue.push([this, args, resolve])
      if (working < count) work()
    }.bind(this))
  }
}

export function wrapAttempt(text) {
  return client.walletPassphraseAsync(text, 0)
    .then(() => {
      console.log(`✓ - correct password ${text}`.green)
    })
    .catch(err => {
      if (err.message === 'Error: The wallet passphrase entered was incorrect.') {
        console.log(`✗ - invalid password ${text}`.red)
      } else {
        console.log(err.message)
      }
    })
}

let debouncedAttempt = promiseDebounce(wrapAttempt, rps, 1)

waiter().then(() => {

  console.log('bitcoind server ready')

  let replServer = repl.start({
    ignoreUndefined: true,
    prompt: '> ',
    eval: function (text, context, filename, callback) {
      text = text.replace(/\n$/, '')
      debouncedAttempt(text).then(() => callback(null))
    }
  })

  replServer.on('exit', () => {
    try {
      process.kill(-child.pid, "SIGINT")
    } catch (err) {
      console.log(`could not kill process ${-child.pid}`)
    }
    process.exit();
  });

})
