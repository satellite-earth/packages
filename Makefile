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

start: install build
	cd apps/personal-node && pnpm dev

dev:
	cd packages/core && pnpm build --watch > /dev/null &\
	cd apps/web-ui && pnpm dev > /dev/null &\
	cd apps/personal-node && REDIRECT_APP_URL=http://localhost:5173 pnpm dev > /dev/null &\
	wait
