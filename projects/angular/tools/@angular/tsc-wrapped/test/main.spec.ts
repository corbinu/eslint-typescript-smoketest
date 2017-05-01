/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as fs from 'fs';
import * as path from 'path';

import {main} from '../src/main';

import {makeTempDir} from './test_support';

describe('tsc-wrapped', () => {
  let basePath: string;
  let write: (fileName: string, content: string) => void;

  beforeEach(() => {
    basePath = makeTempDir();
    write = (fileName: string, content: string) => {
      fs.writeFileSync(path.join(basePath, fileName), content, {encoding: 'utf-8'});
    };
    write('decorators.ts', '/** @Annotation */ export var Component: Function;');
    write('dep.ts', `
      export const A = 1;
      export const B = 2;
    `);
    write('test.ts', `
      import {Component} from './decorators';
      export * from './dep';

      @Component({})
      export class Comp {
        /**
         * Comment that is
         * multiple lines
         */
        method(x: string): void {}
      }
    `);
  });

  function readOut(ext: string) {
    return fs.readFileSync(path.join(basePath, 'built', `test.${ext}`), {encoding: 'utf-8'});
  }

  it('should report error if project not found', () => {
    main('not-exist', null as any)
        .then(() => fail('should report error'))
        .catch(e => expect(e.message).toContain('ENOENT'));
  });

  it('should pre-process sources', (done) => {
    write('tsconfig.json', `{
      "compilerOptions": {
        "experimentalDecorators": true,
        "types": [],
        "outDir": "built",
        "declaration": true,
        "module": "es2015"
      },
      "angularCompilerOptions": {
        "annotateForClosureCompiler": true
      },
      "files": ["test.ts"]
    }`);

    main(basePath, {basePath})
        .then(() => {
          const out = readOut('js');
          // No helpers since decorators were lowered
          expect(out).not.toContain('__decorate');
          // Expand `export *`
          expect(out).toContain('export { A, B }');
          // Annotated for Closure compiler
          expect(out).toContain('* @param {?} x');
          // Comments should stay multi-line
          expect(out).not.toContain('Comment that is multiple lines');
          // Decorator is now an annotation
          expect(out).toMatch(/Comp.decorators = \[\s+\{ type: Component/);
          const decl = readOut('d.ts');
          expect(decl).toContain('declare class Comp');
          const metadata = readOut('metadata.json');
          expect(metadata).toContain('"Comp":{"__symbolic":"class"');
          done();
        })
        .catch(e => done.fail(e));
  });

  it('should allow all options disabled', (done) => {
    write('tsconfig.json', `{
      "compilerOptions": {
        "experimentalDecorators": true,
        "types": [],
        "outDir": "built",
        "declaration": false,
        "module": "es2015"
      },
      "angularCompilerOptions": {
        "annotateForClosureCompiler": false,
        "annotationsAs": "decorators",
        "skipMetadataEmit": true,
        "skipTemplateCodegen": true
      },
      "files": ["test.ts"]
    }`);

    main(basePath, {basePath})
        .then(() => {
          const out = readOut('js');
          // TypeScript's decorator emit
          expect(out).toContain('__decorate');
          // Not annotated for Closure compiler
          expect(out).not.toContain('* @param {?} x');
          expect(() => fs.accessSync(path.join(basePath, 'built', 'test.metadata.json'))).toThrow();
          expect(() => fs.accessSync(path.join(basePath, 'built', 'test.d.ts'))).toThrow();
          done();
        })
        .catch(e => done.fail(e));
  });

  it('should allow JSDoc annotations without decorator downleveling', (done) => {
    write('tsconfig.json', `{
      "compilerOptions": {
        "experimentalDecorators": true,
        "types": [],
        "outDir": "built",
        "declaration": true
      },
      "angularCompilerOptions": {
        "annotateForClosureCompiler": true,
        "annotationsAs": "decorators"
      },
      "files": ["test.ts"]
    }`);
    main(basePath, {basePath}).then(() => done()).catch(e => done.fail(e));
  });

  xit('should run quickly (performance baseline)', (done) => {
    for (let i = 0; i < 1000; i++) {
      write(`input${i}.ts`, `
        import {Component} from './decorators';
        @Component({})
        export class Input${i} {
          private __brand: string;
        }
      `);
    }
    write('tsconfig.json', `{
      "compilerOptions": {
        "experimentalDecorators": true,
        "types": [],
        "outDir": "built",
        "declaration": true,
        "diagnostics": true
      },
      "angularCompilerOptions": {
        "annotateForClosureCompiler": false,
        "annotationsAs": "decorators",
        "skipMetadataEmit": true
      },
      "include": ["input*.ts"]
    }`);
    console.time('BASELINE');

    main(basePath, {basePath})
        .then(() => {
          console.timeEnd('BASELINE');
          done();
        })
        .catch(e => done.fail(e));
  });

  xit('should run quickly (performance test)', (done) => {
    for (let i = 0; i < 1000; i++) {
      write(`input${i}.ts`, `
        import {Component} from './decorators';
        @Component({})
        export class Input${i} {
          private __brand: string;
        }
      `);
    }
    write('tsconfig.json', `{
      "compilerOptions": {
        "experimentalDecorators": true,
        "types": [],
        "outDir": "built",
        "declaration": true,
        "diagnostics": true,
        "skipLibCheck": true
      },
      "angularCompilerOptions": {
        "annotateForClosureCompiler": true
      },
      "include": ["input*.ts"]
    }`);
    console.time('TSICKLE');

    main(basePath, {basePath})
        .then(() => {
          console.timeEnd('TSICKLE');
          done();
        })
        .catch(e => done.fail(e));
  });
});
