# @satellite-earth/personal-node

## 0.5.0

### Minor Changes

- 2d75471: Add EVENTS_SUMMARY report
- 39c144a: Add NIP-66 gossip manager
- 5a60b82: Support relay pubkey lookup
- 611a999: Added support for PROXY command

### Patch Changes

- f0ccb7f: Fix using wrong port during setup
- Updated dependencies [01c2f3f]
- Updated dependencies [def685a]
- Updated dependencies [4ef5263]
- Updated dependencies [2d75471]
- Updated dependencies [b1c7f50]
- Updated dependencies [611a999]
- Updated dependencies [2d75471]
- Updated dependencies [b1c7f50]
- Updated dependencies [39c144a]
- Updated dependencies [bd695ea]
- Updated dependencies [7baf879]
  - @satellite-earth/web-ui@0.5.0
  - @satellite-earth/core@0.5.0

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
