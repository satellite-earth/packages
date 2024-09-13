> [!IMPORTANT]
> This is pre-alpha software! The first release of the new Satellite application stack will soon be ready (at which point this notice will be removed) but until then expect that things will be moved around, changed, and deleted without warning. In fact we currently make no guarantees about anything. This readme is just a high level description of the current state.
>
> BUILD IN PUBLIC

# Satellite Earth mono repo

This mono repo contains all the packages and apps for satellite earth

## Building from source

```sh
git clone https://github.com/satellite-earth/packages.git
cd packages
make install
make build
```

## Running from source

```sh
make start
# or to run the dev version (live refresh)
make dev
```

## Avaliable make ommands

- `make install` Install all dependencies
- `make update` Pull, install, and build all packages and apps
- `make nuke` Remove all installed dependencies
- `make start` Start `personal-node`
- `make dev` Run the development enviroment with live reloading
