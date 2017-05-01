#!/usr/bin/env bash
set -ex -o pipefail

# These ones can be `npm link`ed for fast development
LINKABLE_PKGS=(
  $(pwd)/dist/packages-dist/{common,forms,core,compiler,compiler-cli,platform-{browser,server},platform-browser-dynamic,router}
  $(pwd)/dist/tools/@angular/tsc-wrapped
)
TYPESCRIPT_2_0=typescript@2.0.2
TYPESCRIPT_2_1=typescript@2.1.4
PKGS=(
  reflect-metadata@0.1.8
  zone.js@0.6.25
  rxjs@5.0.1
  @types/{node@6.0.38,jasmine@2.2.33}
  jasmine@2.4.1
  webpack@2.1.0-beta.21
  @angular2-material/{core,button}@2.0.0-alpha.8-1
)

TMPDIR=${TMPDIR:-.}
readonly TMP=$TMPDIR/e2e_test.$(date +%s)
mkdir -p $TMP
cp -R -v modules/@angular/compiler-cli/integrationtest/* $TMP
cp -R -v modules/benchmarks $TMP
# Try to use the same versions as angular, in particular, this will
# cause us to install the same rxjs version.
cp -v package.json $TMP

# run in subshell to avoid polluting cwd
(
  cd $TMP
  set -ex -o pipefail
  npm install ${PKGS[*]} $TYPESCRIPT_2_0
  # TODO(alexeagle): allow this to be npm link instead
  npm install ${LINKABLE_PKGS[*]}

  ./node_modules/.bin/tsc --version
  # Compile the compiler-cli third_party simulation.
  # Use ngc-wrapped directly so we don't produce *.ngfactory.ts files!

  # Compile the compiler-cli integration tests
  # TODO(vicb): restore the test for .xtb
  #./node_modules/.bin/ngc -p tsconfig-build.json --i18nFile=src/messages.fi.xtb --locale=fi --i18nFormat=xtb

  # Generate the metadata for the third-party modules
  node ./node_modules/@angular/tsc-wrapped/src/main -p third_party_src/tsconfig-build.json

  ./node_modules/.bin/ngc -p tsconfig-build.json --i18nFile=src/messages.fi.xlf --locale=fi --i18nFormat=xlf

  ./node_modules/.bin/ng-xi18n -p tsconfig-build.json --i18nFormat=xlf
  ./node_modules/.bin/ng-xi18n -p tsconfig-build.json --i18nFormat=xmb

  node test/test_summaries.js
  node test/test_ngtools_api.js

  ./node_modules/.bin/jasmine init
  # Run compiler-cli integration tests in node
  ./node_modules/.bin/webpack ./webpack.config.js
  ./node_modules/.bin/jasmine ./all_spec.js

  # Compile again with a differently named tsconfig file
  mv tsconfig-build.json othername.json
  ./node_modules/.bin/ngc -p othername.json
)

# Repeat selected parts of the above with TypeScript 2.1
readonly TMP_2_1=$TMPDIR/e2e_test.$(date +%s)
mkdir -p $TMP_2_1
cp -R -v modules/@angular/compiler-cli/integrationtest/* $TMP_2_1
cp -R -v modules/benchmarks $TMP_2_1
cp -v package.json $TMP_2_1
(
  cd $TMP_2_1
  set -ex -o pipefail

  npm install ${PKGS[*]} $TYPESCRIPT_2_1
  npm install ${LINKABLE_PKGS[*]}

  ./node_modules/.bin/tsc --version
  node ./node_modules/@angular/tsc-wrapped/src/main -p third_party_src/tsconfig-build.json
  ./node_modules/.bin/ngc -p tsconfig-build.json --i18nFile=src/messages.fi.xlf --locale=fi --i18nFormat=xlf
)