/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

const gulp = require('gulp');
const filter = require('gulp-filter');
const es = require('event-stream');
const gulptslint = require('gulp-tslint');
const tslint = require('tslint');

const all = [
	'*',
	'build/**/*',
	'extensions/**/*',
	'scripts/**/*',
	'src/**/*',
	'test/**/*'
];

const eolFilter = [
	'**',
	'!ThirdPartyNotices.txt',
	'!LICENSE.txt',
	'!extensions/**/out/**',
	'!**/node_modules/**',
	'!**/fixtures/**',
	'!**/*.{svg,exe,png,bmp,scpt,bat,cmd,cur,ttf,woff,eot}',
	'!build/{lib,tslintRules}/**/*.js',
	'!build/monaco/**',
	'!build/win32/**'
];

const indentationFilter = [
	'**',
	'!ThirdPartyNotices.txt',
	'!**/*.md',
	'!**/*.template',
	'!**/*.yml',
	'!**/lib/**',
	'!**/*.d.ts',
	'!**/*.d.ts.recipe',
	'!extensions/typescript/server/**',
	'!test/assert.js',
	'!**/package.json',
	'!**/npm-shrinkwrap.json',
	'!**/octicons/**',
	'!**/vs/languages/sass/test/common/example.scss',
	'!**/vs/languages/less/common/parser/less.grammar.txt',
	'!**/vs/languages/css/common/buildscripts/css-schema.xml',
	'!**/vs/base/common/marked/raw.marked.js',
	'!**/vs/base/common/winjs.base.raw.js',
	'!**/vs/base/node/terminateProcess.sh',
	'!**/vs/nls.js',
	'!**/vs/css.js',
	'!**/vs/loader.js',
	'!extensions/**/snippets/**',
	'!extensions/**/syntaxes/**',
	'!extensions/**/themes/**',
	'!extensions/**/colorize-fixtures/**',
	'!extensions/vscode-api-tests/testWorkspace/**'
];

const copyrightFilter = [
	'**',
	'!**/*.desktop',
	'!**/*.json',
	'!**/*.html',
	'!**/*.template',
	'!**/test/**',
	'!**/*.md',
	'!**/*.bat',
	'!**/*.cmd',
	'!resources/win32/bin/code.js',
	'!**/*.xml',
	'!**/*.sh',
	'!**/*.txt',
	'!**/*.xpm',
	'!extensions/markdown/media/tomorrow.css'
];

const tslintFilter = [
	'src/**/*.ts',
	'extensions/**/*.ts',
	'!**/*.d.ts',
	'!**/typings/**',
	'!src/vs/base/**/*.test.ts',
	'!src/vs/languages/**/*.test.ts',
	'!src/vs/workbench/**/*.test.ts',
	'!extensions/**/*.test.ts'
];

const copyrightHeader = [
	'/*---------------------------------------------------------------------------------------------',
	' *  Copyright (c) Microsoft Corporation. All rights reserved.',
	' *  Licensed under the MIT License. See License.txt in the project root for license information.',
	' *--------------------------------------------------------------------------------------------*/'
].join('\n');

function reportFailures(failures) {
	failures.forEach(failure => {
		const name = failure.name || failure.fileName;
		const position = failure.startPosition;
		const line = position.lineAndCharacter ? position.lineAndCharacter.line : position.line;
		const character = position.lineAndCharacter ? position.lineAndCharacter.character : position.character;

		console.error(`${ name }:${ line + 1}:${ character + 1 }:${ failure.failure }`);
	});
}

gulp.task('tslint', () => {
	const options = { summarizeFailureOutput: true };

	return gulp.src(all, { base: '.' })
		.pipe(filter(tslintFilter))
		.pipe(gulptslint({ rulesDirectory: 'build/lib/tslint' }))
		.pipe(gulptslint.report(reportFailures, options));
});

const hygiene = exports.hygiene = (some, options) => {
	options = options || {};
	let errorCount = 0;

	const eol = es.through(function (file) {
		if (/\r\n?/g.test(file.contents.toString('utf8'))) {
			console.error(file.relative + ': Bad EOL found');
			errorCount++;
		}

		this.emit('data', file);
	});

	const indentation = es.through(function (file) {
		file.contents
			.toString('utf8')
			.split(/\r\n|\r|\n/)
			.forEach((line, i) => {
				if (/^\s*$/.test(line)) {
					// empty or whitespace lines are OK
				} else if (/^[\t]*[^\s]/.test(line)) {
					// good indent
				} else if (/^[\t]* \*/.test(line)) {
					// block comment using an extra space
				} else {
					console.error(file.relative + '(' + (i + 1) + ',1): Bad whitespace indentation');
					errorCount++;
				}
			});

		this.emit('data', file);
	});

	const copyrights = es.through(function (file) {
		if (file.contents.toString('utf8').indexOf(copyrightHeader) !== 0) {
			console.error(file.relative + ': Missing or bad copyright statement');
			errorCount++;
		}

		this.emit('data', file);
	});

	const tsl = es.through(function(file) {
		const configuration = tslint.findConfiguration(null, '.');
		const options = { configuration, formatter: 'json', rulesDirectory: 'build/lib/tslint' };
		const contents = file.contents.toString('utf8');
		const linter = new tslint(file.relative, contents, options);
		const result = linter.lint();

		if (result.failureCount > 0) {
			reportFailures(result.failures);
			errorCount += result.failureCount;
		}

		this.emit('data', file);
	});

	return gulp.src(some || all, { base: '.' })
		.pipe(filter(f => !f.stat.isDirectory()))
		.pipe(filter(eolFilter))
		.pipe(options.skipEOL ? es.through() : eol)
		.pipe(filter(indentationFilter))
		.pipe(indentation)
		.pipe(filter(copyrightFilter))
		.pipe(copyrights)
		.pipe(filter(tslintFilter))
		.pipe(tsl)
		.pipe(es.through(null, function () {
			if (errorCount > 0) {
				this.emit('error', 'Hygiene failed with ' + errorCount + ' errors. Check \'build/gulpfile.hygiene.js\'.');
			} else {
				this.emit('end');
			}
		}));
};

gulp.task('hygiene', () => hygiene());

// this allows us to run hygiene as a git pre-commit hook
if (require.main === module) {
	const cp = require('child_process');

	cp.exec('git config core.autocrlf', (err, out) => {
		const skipEOL = out.trim() === 'true';

		cp.exec('git diff --cached --name-only', { maxBuffer: 2000 * 1024 }, (err, out) => {
			if (err) {
				console.error();
				console.error(err);
				process.exit(1);
			}

			const some = out
				.split(/\r?\n/)
				.filter(l => !!l);

			hygiene(some, { skipEOL: skipEOL }).on('error', err => {
				console.error();
				console.error(err);
				process.exit(1);
			});
		});
	});
}
