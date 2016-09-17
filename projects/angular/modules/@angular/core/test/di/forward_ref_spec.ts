/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Type} from '@angular/core';
import {forwardRef, resolveForwardRef} from '@angular/core/src/di';
import {beforeEach, ddescribe, describe, expect, iit, inject, it, xit} from '@angular/core/testing/testing_internal';

export function main() {
  describe('forwardRef', function() {
    it('should wrap and unwrap the reference', () => {
      var ref = forwardRef(() => String);
      expect(ref instanceof Type).toBe(true);
      expect(resolveForwardRef(ref)).toBe(String);
    });
  });
}
