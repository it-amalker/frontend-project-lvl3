install:
	npm install

build:
	npm run build

start-server:
	npm run start:dev

publish:
	npm publish --dry-run
	npm link

lint:
	npx eslint .