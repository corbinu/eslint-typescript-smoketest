/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Component, Directive, ElementRef, Injector, NgModule, destroyPlatform} from '@angular/core';
import {async} from '@angular/core/testing';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import * as angular from '@angular/upgrade/src/angular_js';
import {UpgradeComponent, UpgradeModule, downgradeComponent} from '@angular/upgrade/static';

import {bootstrap, html} from '../test_helpers';

export function main() {
  describe('content projection', () => {

    beforeEach(() => destroyPlatform());
    afterEach(() => destroyPlatform());

    it('should instantiate ng2 in ng1 template and project content', async(() => {

         // the ng2 component that will be used in ng1 (downgraded)
         @Component({selector: 'ng2', template: `{{ 'NG2' }}(<ng-content></ng-content>)`})
         class Ng2Component {
         }

         // our upgrade module to host the component to downgrade
         @NgModule({
           imports: [BrowserModule, UpgradeModule],
           declarations: [Ng2Component],
           entryComponents: [Ng2Component]
         })
         class Ng2Module {
           ngDoBootstrap() {}
         }

         // the ng1 app module that will consume the downgraded component
         const ng1Module = angular
                               .module('ng1', [])
                               // create an ng1 facade of the ng2 component
                               .directive('ng2', downgradeComponent({component: Ng2Component}));

         const element =
             html('<div>{{ \'ng1[\' }}<ng2>~{{ \'ng-content\' }}~</ng2>{{ \']\' }}</div>');

         bootstrap(platformBrowserDynamic(), Ng2Module, element, ng1Module).then((upgrade) => {
           expect(document.body.textContent).toEqual('ng1[NG2(~ng-content~)]');
         });
       }));

    it('should instantiate ng1 in ng2 template and project content', async(() => {

         @Component({
           selector: 'ng2',
           template: `{{ 'ng2(' }}<ng1>{{'transclude'}}</ng1>{{ ')' }}`,
         })
         class Ng2Component {
         }


         @Directive({selector: 'ng1'})
         class Ng1WrapperComponent extends UpgradeComponent {
           constructor(elementRef: ElementRef, injector: Injector) {
             super('ng1', elementRef, injector);
           }
         }

         @NgModule({
           declarations: [Ng1WrapperComponent, Ng2Component],
           entryComponents: [Ng2Component],
           imports: [BrowserModule, UpgradeModule]
         })
         class Ng2Module {
           ngDoBootstrap() {}
         }

         const ng1Module = angular.module('ng1', [])
                               .directive(
                                   'ng1',
                                   () => {
                                     return {
                                       transclude: true,
                                       template: '{{ "ng1" }}(<ng-transclude></ng-transclude>)'
                                     };
                                   })
                               .directive('ng2', downgradeComponent({component: Ng2Component}));

         const element = html('<div>{{\'ng1(\'}}<ng2></ng2>{{\')\'}}</div>');

         bootstrap(platformBrowserDynamic(), Ng2Module, element, ng1Module).then((upgrade) => {
           expect(document.body.textContent).toEqual('ng1(ng2(ng1(transclude)))');
         });
       }));
  });
}
