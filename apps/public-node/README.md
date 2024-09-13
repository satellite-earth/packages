> [!IMPORTANT]
> This is pre-alpha software! The first release of the new Satellite application stack will soon be ready (at which point this notice will be removed) but until then expect that things will be moved around, changed, and deleted without warning. In fact we currently make no guarantees about anything.
>
> BUILD IN PUBLIC

# Public Satellite Node

Public Satellite node is designed to be run on a server as a dedicated nostr relay and [blossom](https://github.com/hzrd149/blossom) server for a community.

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
