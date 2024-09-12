> [!IMPORTANT]
> This is pre-alpha software! The first release of the new Satellite application stack will soon be ready (at which point this notice will be removed) but until then expect that things will be moved around, changed, and deleted without warning. In fact we currently make no guarantees about anything.
>
> BUILD IN PUBLIC

# Public Satellite Node

Public Satellite node is designed to be run on a server as a dedicated nostr relay and [blossom](https://github.com/hzrd149/blossom) server for a community.

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

## Running

Clone into the repo and

`npm i`

`npm run build` (to build typescript)

You'll need an .env file like:

```
DATA_PATH=./data
PORT=2001
SECRET_KEY=""
ENABLE_HYPER_DHT=true
```

where

- `DATA_PATH` is the directory to store the community's event database, blobs, and config
- `PORT` is the port to make the nostr relay will run on
- `SECRET_KEY` is a nostr secret key used by the relay to sign messages on it's own behalf (see [NIP-29](https://github.com/nostr-protocol/nips/blob/master/29.md))

then

`npm run dev`
