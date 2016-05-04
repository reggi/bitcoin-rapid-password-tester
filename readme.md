# *bitcoin-rapid-password-tester (`brpt`)*

```
npm i bitcoin-rapid-password-tester -g
```

`brpt` allows you to quickly try a bunch of different passwords in the terminal with one command.

Run `brpt` and you will automatically get an instance of `bitcoind` set up running in the background to the default directory (`~/Library/Application Support/Bitcoin`). You can change the default directory with the `--datadir` flag.

You will get a continuous REPL that will allow you to rapidly enter many different passwords fast.

```
$ brpt
• bitcoind is starting...
• bitcoind server ready
> admin
✗ - invalid password admin
> adminadmin
✗ - invalid password adminadmin
```

When one matches the REPL will exit and congratulate you.

```
$ brpt
• bitcoind is starting...
• bitcoind server ready
> mypassword
✓ - correct password mypassword
```

You can also paste in a hole bunch of passwords and test in bulk as long as they all end in new lines.

Depending on how many your processing you might need to increase the `--rpcthreads` flag or the `--rps` (request per second) flag. The latter rate-limits how many request will be sent to `bitcoind` per second, in order to prevent a 500 error.
