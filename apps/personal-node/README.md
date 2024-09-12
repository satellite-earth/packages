> [!IMPORTANT]
> This is pre-alpha software! The first release of the new Satellite application stack will soon be ready (at which point this notice will be removed) but until then expect that things will be moved around, changed, and deleted without warning. In fact we currently make no guarantees about anything. This readme is just a high level description of the current state.
>
> BUILD IN PUBLIC

# Satellite Private Node

A nostr relay with an integrated [blossom](https://github.com/hzrd149/blossom) media proxy.

Most nostr user's have their data scattered across multiple relays. Wouldn't it be cool if you had your own relay just for your stuff? (and maybe your follows too?)

Satellite private node:

- Backs up all your nostr events and media files that you care about (i.e. notes and media from yourself and the people you follow) in a performant SQLite database
- Makes all this data available on your local machine via a local nostr relay that can be added to other nostr apps to speed them up
- Can export your nostr events database as a `.jsonl` file with optional zstd compression
- Can connect to other nodes via hyperdht

(Much more info forthcoming)

## Installing @satellite-earth/core dependency

There are two ways to install `@satellite-earth/core` dependency

### npm link

The simplest way to setup the `@satellite-earth/core` dependency is to clone the repo into another directory and use `npm link` to link the packages

```sh
git clone https://github.com/satellite-earth/core.git
cd core
npm install
npm run build
npm link

# navigate back to public-node
cd ../public-node
npm link "@satellite-earth/core"
npm run build
```

### github access token

Follow the instructions [here](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages) to create a access token and login to the github registry

```sh
$ npm login --scope=@satellite-earth --auth-type=legacy --registry=https://npm.pkg.github.com

> Username: USERNAME
> Password: TOKEN
```

Once you have logged into `npm.pkg.github.com` you can run `npm install` normally

## Run it

Clone into the repo and

`npm i`

`npm run build` (to build typescript)

Next you'll need to add a `.env` file that looks something like

```
DATA_PATH=/path/to/app/data/directory
AUTH=6a75dea45f61280ef8a54233c37e4b1679a702c0
PORT=2012
```

where

`DATA_PATH` is the parent folder to store your events database, your blobs, and some config stuff
`AUTH` is an arbitrary shared secret between the node and the dashboard UI, and
`PORT` is the port you want your local nostr relay to be accessible on

Once your env is set up

`npm run dev`

If successful you should see a message like `satellite server running on PORT`
