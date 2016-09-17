/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {CompilerOptions, Component, Directive, Injector, ModuleWithComponentFactories, NgModule, NgModuleFactory, NgModuleRef, NgZone, OpaqueToken, Pipe, PlatformRef, Provider, SchemaMetadata, Type} from '@angular/core';
import {AsyncTestCompleter} from './async_test_completer';
import {ComponentFixture} from './component_fixture';
import {ListWrapper} from './facade/collection';
import {FunctionWrapper, stringify} from './facade/lang';
import {MetadataOverride} from './metadata_override';
import {TestingCompiler, TestingCompilerFactory} from './test_compiler';

const UNDEFINED = new Object();

/**
 * An abstract class for inserting the root test component element in a platform independent way.
 *
 * @experimental
 */
export class TestComponentRenderer {
  insertRootElement(rootElementId: string) {}
}

var _nextRootElementId = 0;

/**
 * @experimental
 */
export var ComponentFixtureAutoDetect = new OpaqueToken('ComponentFixtureAutoDetect');

/**
 * @experimental
 */
export var ComponentFixtureNoNgZone = new OpaqueToken('ComponentFixtureNoNgZone');

/**
 * @experimental
 */
export type TestModuleMetadata = {
  providers?: any[]; declarations?: any[]; imports?: any[]; schemas?: Array<SchemaMetadata|any[]>;
};

/**
 * @experimental
 */
export class TestBed implements Injector {
  /**
   * Initialize the environment for testing with a compiler factory, a PlatformRef, and an
   * angular module. These are common to every test in the suite.
   *
   * This may only be called once, to set up the common providers for the current test
   * suite on the current platform. If you absolutely need to change the providers,
   * first use `resetTestEnvironment`.
   *
   * Test modules and platforms for individual platforms are available from
   * '@angular/<platform_name>/testing'.
   *
   * @experimental
   */
  static initTestEnvironment(ngModule: Type<any>, platform: PlatformRef): TestBed {
    const testBed = getTestBed();
    getTestBed().initTestEnvironment(ngModule, platform);
    return testBed;
  }

  /**
   * Reset the providers for the test injector.
   *
   * @experimental
   */
  static resetTestEnvironment() { getTestBed().resetTestEnvironment(); }

  static resetTestingModule(): typeof TestBed {
    getTestBed().resetTestingModule();
    return TestBed;
  }

  /**
   * Allows overriding default compiler providers and settings
   * which are defined in test_injector.js
   */
  static configureCompiler(config: {providers?: any[]; useJit?: boolean;}): typeof TestBed {
    getTestBed().configureCompiler(config);
    return TestBed;
  }

  /**
   * Allows overriding default providers, directives, pipes, modules of the test injector,
   * which are defined in test_injector.js
   */
  static configureTestingModule(moduleDef: TestModuleMetadata): typeof TestBed {
    getTestBed().configureTestingModule(moduleDef);
    return TestBed;
  }

  /**
   * Compile components with a `templateUrl` for the test's NgModule.
   * It is necessary to call this function
   * as fetching urls is asynchronous.
   */
  static compileComponents(): Promise<any> { return getTestBed().compileComponents(); }

  static overrideModule(ngModule: Type<any>, override: MetadataOverride<NgModule>): typeof TestBed {
    getTestBed().overrideModule(ngModule, override);
    return TestBed;
  }

  static overrideComponent(component: Type<any>, override: MetadataOverride<Component>):
      typeof TestBed {
    getTestBed().overrideComponent(component, override);
    return TestBed;
  }

  static overrideDirective(directive: Type<any>, override: MetadataOverride<Directive>):
      typeof TestBed {
    getTestBed().overrideDirective(directive, override);
    return TestBed;
  }

  static overridePipe(pipe: Type<any>, override: MetadataOverride<Pipe>): typeof TestBed {
    getTestBed().overridePipe(pipe, override);
    return TestBed;
  }

  static get(token: any, notFoundValue: any = Injector.THROW_IF_NOT_FOUND) {
    return getTestBed().get(token, notFoundValue);
  }

  static createComponent<T>(component: Type<T>): ComponentFixture<T> {
    return getTestBed().createComponent(component);
  }

  private _instantiated: boolean = false;

  private _compiler: TestingCompiler = null;
  private _moduleRef: NgModuleRef<any> = null;
  private _moduleWithComponentFactories: ModuleWithComponentFactories<any> = null;

  private _compilerOptions: CompilerOptions[] = [];

  private _moduleOverrides: [Type<any>, MetadataOverride<NgModule>][] = [];
  private _componentOverrides: [Type<any>, MetadataOverride<Component>][] = [];
  private _directiveOverrides: [Type<any>, MetadataOverride<Directive>][] = [];
  private _pipeOverrides: [Type<any>, MetadataOverride<Pipe>][] = [];

  private _providers: Provider[] = [];
  private _declarations: Array<Type<any>|any[]|any> = [];
  private _imports: Array<Type<any>|any[]|any> = [];
  private _schemas: Array<SchemaMetadata|any[]> = [];
  private _activeFixtures: ComponentFixture<any>[] = [];

  /**
   * Initialize the environment for testing with a compiler factory, a PlatformRef, and an
   * angular module. These are common to every test in the suite.
   *
   * This may only be called once, to set up the common providers for the current test
   * suite on the current platform. If you absolutely need to change the providers,
   * first use `resetTestEnvironment`.
   *
   * Test modules and platforms for individual platforms are available from
   * '@angular/<platform_name>/testing'.
   *
   * @experimental
   */
  initTestEnvironment(ngModule: Type<any>, platform: PlatformRef) {
    if (this.platform || this.ngModule) {
      throw new Error('Cannot set base providers because it has already been called');
    }
    this.platform = platform;
    this.ngModule = ngModule;
  }

  /**
   * Reset the providers for the test injector.
   *
   * @experimental
   */
  resetTestEnvironment() {
    this.resetTestingModule();
    this.platform = null;
    this.ngModule = null;
  }

  resetTestingModule() {
    this._compiler = null;
    this._moduleOverrides = [];
    this._componentOverrides = [];
    this._directiveOverrides = [];
    this._pipeOverrides = [];

    this._moduleRef = null;
    this._moduleWithComponentFactories = null;
    this._compilerOptions = [];
    this._providers = [];
    this._declarations = [];
    this._imports = [];
    this._schemas = [];
    this._instantiated = false;
    this._activeFixtures.forEach((fixture) => fixture.destroy());
    this._activeFixtures = [];
  }

  platform: PlatformRef = null;

  ngModule: Type<any> = null;

  configureCompiler(config: {providers?: any[], useJit?: boolean}) {
    this._assertNotInstantiated('TestBed.configureCompiler', 'configure the compiler');
    this._compilerOptions.push(config);
  }

  configureTestingModule(moduleDef: TestModuleMetadata) {
    this._assertNotInstantiated('TestBed.configureTestingModule', 'configure the test module');
    if (moduleDef.providers) {
      this._providers = ListWrapper.concat(this._providers, moduleDef.providers);
    }
    if (moduleDef.declarations) {
      this._declarations = ListWrapper.concat(this._declarations, moduleDef.declarations);
    }
    if (moduleDef.imports) {
      this._imports = ListWrapper.concat(this._imports, moduleDef.imports);
    }
    if (moduleDef.schemas) {
      this._schemas = ListWrapper.concat(this._schemas, moduleDef.schemas);
    }
  }

  compileComponents(): Promise<any> {
    if (this._moduleWithComponentFactories || this._instantiated) {
      return Promise.resolve(null);
    }

    const moduleType = this._createCompilerAndModule();
    return this._compiler.compileModuleAndAllComponentsAsync(moduleType)
        .then((moduleAndComponentFactories) => {
          this._moduleWithComponentFactories = moduleAndComponentFactories;
        });
  }

  private _initIfNeeded() {
    if (this._instantiated) {
      return;
    }
    if (!this._moduleWithComponentFactories) {
      try {
        let moduleType = this._createCompilerAndModule();
        this._moduleWithComponentFactories =
            this._compiler.compileModuleAndAllComponentsSync(moduleType);
      } catch (e) {
        if (e.compType) {
          throw new Error(
              `This test module uses the component ${stringify(e.compType)} which is using a "templateUrl", but they were never compiled. ` +
              `Please call "TestBed.compileComponents" before your test.`);
        } else {
          throw e;
        }
      }
    }
    this._moduleRef =
        this._moduleWithComponentFactories.ngModuleFactory.create(this.platform.injector);
    this._instantiated = true;
  }

  private _createCompilerAndModule(): Type<any> {
    const providers = this._providers.concat([{provide: TestBed, useValue: this}]);
    const declarations = this._declarations;
    const imports = [this.ngModule, this._imports];
    const schemas = this._schemas;

    @NgModule(
        {providers: providers, declarations: declarations, imports: imports, schemas: schemas})
    class DynamicTestModule {
    }

    const compilerFactory: TestingCompilerFactory =
        this.platform.injector.get(TestingCompilerFactory);
    this._compiler =
        compilerFactory.createTestingCompiler(this._compilerOptions.concat([{useDebug: true}]));
    this._moduleOverrides.forEach((entry) => this._compiler.overrideModule(entry[0], entry[1]));
    this._componentOverrides.forEach(
        (entry) => this._compiler.overrideComponent(entry[0], entry[1]));
    this._directiveOverrides.forEach(
        (entry) => this._compiler.overrideDirective(entry[0], entry[1]));
    this._pipeOverrides.forEach((entry) => this._compiler.overridePipe(entry[0], entry[1]));
    return DynamicTestModule;
  }

  private _assertNotInstantiated(methodName: string, methodDescription: string) {
    if (this._instantiated) {
      throw new Error(
          `Cannot ${methodDescription} when the test module has already been instantiated. ` +
          `Make sure you are not using \`inject\` before \`${methodName}\`.`);
    }
  }

  get(token: any, notFoundValue: any = Injector.THROW_IF_NOT_FOUND) {
    this._initIfNeeded();
    if (token === TestBed) {
      return this;
    }
    // Tests can inject things from the ng module and from the compiler,
    // but the ng module can't inject things from the compiler and vice versa.
    let result = this._moduleRef.injector.get(token, UNDEFINED);
    return result === UNDEFINED ? this._compiler.injector.get(token, notFoundValue) : result;
  }

  execute(tokens: any[], fn: Function): any {
    this._initIfNeeded();
    var params = tokens.map(t => this.get(t));
    return FunctionWrapper.apply(fn, params);
  }

  overrideModule(ngModule: Type<any>, override: MetadataOverride<NgModule>): void {
    this._assertNotInstantiated('overrideModule', 'override module metadata');
    this._moduleOverrides.push([ngModule, override]);
  }

  overrideComponent(component: Type<any>, override: MetadataOverride<Component>): void {
    this._assertNotInstantiated('overrideComponent', 'override component metadata');
    this._componentOverrides.push([component, override]);
  }

  overrideDirective(directive: Type<any>, override: MetadataOverride<Directive>): void {
    this._assertNotInstantiated('overrideDirective', 'override directive metadata');
    this._directiveOverrides.push([directive, override]);
  }

  overridePipe(pipe: Type<any>, override: MetadataOverride<Pipe>): void {
    this._assertNotInstantiated('overridePipe', 'override pipe metadata');
    this._pipeOverrides.push([pipe, override]);
  }

  createComponent<T>(component: Type<T>): ComponentFixture<T> {
    this._initIfNeeded();
    const componentFactory = this._moduleWithComponentFactories.componentFactories.find(
        (compFactory) => compFactory.componentType === component);
    if (!componentFactory) {
      throw new Error(
          `Cannot create the component ${stringify(component)} as it was not imported into the testing module!`);
    }
    const noNgZone = this.get(ComponentFixtureNoNgZone, false);
    const autoDetect: boolean = this.get(ComponentFixtureAutoDetect, false);
    const ngZone: NgZone = noNgZone ? null : this.get(NgZone, null);
    const testComponentRenderer: TestComponentRenderer = this.get(TestComponentRenderer);
    const rootElId = `root${_nextRootElementId++}`;
    testComponentRenderer.insertRootElement(rootElId);

    const initComponent = () => {
      var componentRef = componentFactory.create(this, [], `#${rootElId}`);
      return new ComponentFixture<T>(componentRef, ngZone, autoDetect);
    };

    const fixture = ngZone == null ? initComponent() : ngZone.run(initComponent);
    this._activeFixtures.push(fixture);
    return fixture;
  }
}

var _testBed: TestBed = null;

/**
 * @experimental
 */
export function getTestBed() {
  if (_testBed == null) {
    _testBed = new TestBed();
  }
  return _testBed;
}

/**
 * Allows injecting dependencies in `beforeEach()` and `it()`.
 *
 * Example:
 *
 * ```
 * beforeEach(inject([Dependency, AClass], (dep, object) => {
 *   // some code that uses `dep` and `object`
 *   // ...
 * }));
 *
 * it('...', inject([AClass], (object) => {
 *   object.doSomething();
 *   expect(...);
 * })
 * ```
 *
 * Notes:
 * - inject is currently a function because of some Traceur limitation the syntax should
 * eventually
 *   becomes `it('...', @Inject (object: AClass, async: AsyncTestCompleter) => { ... });`
 *
 * @stable
 */
export function inject(tokens: any[], fn: Function): () => any {
  let testBed = getTestBed();
  if (tokens.indexOf(AsyncTestCompleter) >= 0) {
    return () =>
               // Return an async test method that returns a Promise if AsyncTestCompleter is one of
        // the
        // injected tokens.
        testBed.compileComponents().then(() => {
          let completer: AsyncTestCompleter = testBed.get(AsyncTestCompleter);
          testBed.execute(tokens, fn);
          return completer.promise;
        });
  } else {
    return () => testBed.execute(tokens, fn);
  }
}

/**
 * @experimental
 */
export class InjectSetupWrapper {
  constructor(private _moduleDef: () => TestModuleMetadata) {}

  private _addModule() {
    const moduleDef = this._moduleDef();
    if (moduleDef) {
      getTestBed().configureTestingModule(moduleDef);
    }
  }

  inject(tokens: any[], fn: Function): () => any {
    return () => {
      this._addModule();
      return inject(tokens, fn)();
    };
  }
}

/**
 * @experimental
 */
export function withModule(moduleDef: TestModuleMetadata): InjectSetupWrapper;
export function withModule(moduleDef: TestModuleMetadata, fn: Function): () => any;
export function withModule(moduleDef: TestModuleMetadata, fn: Function = null): (() => any)|
    InjectSetupWrapper {
  if (fn) {
    return () => {
      const testBed = getTestBed();
      if (moduleDef) {
        testBed.configureTestingModule(moduleDef);
      }
      return fn();
    };
  }
  return new InjectSetupWrapper(() => moduleDef);
}
