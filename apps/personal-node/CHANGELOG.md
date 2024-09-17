# @satellite-earth/personal-node

## 0.4.1

### Patch Changes

- 4ab508a: Fix receiver not stopping on request
- 9e00709: Fix OWNER_PUBKEY not being saved to config on startup
- Updated dependencies [7433f21]
- Updated dependencies [ff1f5f5]
  - @satellite-earth/web-ui@0.4.1

## 0.4.0

### Minor Changes

- cc231ae: Add internal hyper socks5 proxy to allow connections to .hyper domains
- cc231ae: Add inbound and outbound connection managers
- cc231ae: Add option to route all traffic through tor proxy
- cc231ae: Add support for inbound and outbound tor connections
- cc231ae: Add support for inbound and outbound hyperdht connections
- cc231ae: Add support for ntfy notifications
- cc231ae: Add inbound and outbound connections for I2P

### Patch Changes

- cc231ae: Fallback to users app relays if missing NIP-65 when forwarding DM
- Updated dependencies [cc231ae]
- Updated dependencies [cc231ae]
- Updated dependencies [cc231ae]
- Updated dependencies [cc231ae]
- Updated dependencies [cc231ae]
- Updated dependencies [cc231ae]
- Updated dependencies [cc231ae]
- Updated dependencies [cc231ae]
  - @satellite-earth/web-ui@0.4.0
  - @satellite-earth/core@0.4.0

## 0.3.1

### Patch Changes

- Fix hash bang script

## 0.2.2

### Patch Changes

- Temporarily disable blob downloader until dashboard can show blobs
- Don't attach auth to dashboard url when loaded

## 0.2.0

### Minor Changes

- 7498edf: Automatically extract and download blob URLs from kind 1 events
