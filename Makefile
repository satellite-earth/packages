update: pull install build

pull:
	git pull

install:
	pnpm install
	pnpm rebuild -r

build:
	pnpm --filter "./packages/**" --parallel build
	pnpm --filter "./apps/**" --parallel build

nuke:
	rm -rf ./node_modules
	rm -rf ./apps/*/node_modules
	rm -rf ./packages/*/node_modules

start:
	cd apps/personal-node && pnpm start

dev:
	cd packages/core && pnpm build --watch > /dev/null &\
	cd apps/web-ui && pnpm dev > /dev/null &\
	cd apps/personal-node && REDIRECT_APP_URL=http://localhost:5173 pnpm dev > /dev/null &\
	wait

format:
	pnpm format

cap-sync:
	cd apps/web-ui && pnpm cap sync

android: cap-sync
	cd apps/web-ui && pnpm cap run android

ios: cap-sync
	cd apps/web-ui && pnpm cap run ios
