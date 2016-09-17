/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {beforeEach, ddescribe, describe, expect, iit, inject, it, xit} from '@angular/core/testing/testing_internal';

export function main() {
  describe('Shim', () => {

    it('should provide correct function.name ', () => {
      var functionWithoutName = identity(() => function(_: any /** TODO #9100 */) {});
      function foo(_: any /** TODO #9100 */){};

      expect((<any>functionWithoutName).name).toBeFalsy();
      expect((<any>foo).name).toEqual('foo');
    });

  });
}

function identity(a: any /** TODO #9100 */) {
  return a;
}
