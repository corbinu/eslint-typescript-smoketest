/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Injector, Pipe} from '@angular/core';
import {beforeEach, ddescribe, describe, expect, iit, inject, it} from '@angular/core/testing/testing_internal';

import {isBlank, stringify} from '../src/facade/lang';
import {MockPipeResolver} from '../testing/index';

export function main() {
  describe('MockPipeResolver', () => {
    var pipeResolver: MockPipeResolver;

    beforeEach(inject(
        [Injector], (injector: Injector) => { pipeResolver = new MockPipeResolver(injector); }));

    describe('Pipe overriding', () => {
      it('should fallback to the default PipeResolver when templates are not overridden', () => {
        var pipe = pipeResolver.resolve(SomePipe);
        expect(pipe.name).toEqual('somePipe');
      });

      it('should allow overriding the @Pipe', () => {
        pipeResolver.setPipe(SomePipe, new Pipe({name: 'someOtherName'}));
        var pipe = pipeResolver.resolve(SomePipe);
        expect(pipe.name).toEqual('someOtherName');
      });
    });
  });
}

@Pipe({name: 'somePipe'})
class SomePipe {
}
