install:
	npm install

build:
	npm run build

publish:
	npm publish --dry-run
	npm link

lint:
	npx eslint .