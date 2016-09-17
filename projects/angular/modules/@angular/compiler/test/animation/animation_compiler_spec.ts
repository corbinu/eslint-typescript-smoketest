/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {AnimationMetadata, animate, group, sequence, style, transition, trigger} from '@angular/core';
import {AsyncTestCompleter, beforeEach, beforeEachProviders, ddescribe, describe, expect, iit, inject, it, xdescribe, xit} from '@angular/core/testing/testing_internal';

import {StringMapWrapper} from '../../../platform-browser-dynamic/src/facade/collection';
import {AnimationCompiler, CompiledAnimationTriggerResult} from '../../src/animation/animation_compiler';
import {CompileAnimationEntryMetadata, CompileDirectiveMetadata, CompileTemplateMetadata, CompileTypeMetadata} from '../../src/compile_metadata';
import {CompileMetadataResolver} from '../../src/metadata_resolver';

export function main() {
  describe('RuntimeAnimationCompiler', () => {
    var resolver: any /** TODO #9100 */;
    beforeEach(
        inject([CompileMetadataResolver], (res: CompileMetadataResolver) => { resolver = res; }));

    var compiler = new AnimationCompiler();

    var compileAnimations =
        (component: CompileDirectiveMetadata): CompiledAnimationTriggerResult => {
          var result = compiler.compileComponent(component, []);
          return result.triggers[0];
        };

    var compileTriggers = (input: any[]) => {
      var entries: CompileAnimationEntryMetadata[] = input.map(entry => {
        var animationTriggerData = trigger(entry[0], entry[1]);
        return resolver.getAnimationEntryMetadata(animationTriggerData);
      });

      var component = CompileDirectiveMetadata.create({
        type: new CompileTypeMetadata({name: 'myCmp'}),
        template: new CompileTemplateMetadata({animations: entries})
      });

      return compileAnimations(component);
    };

    var compileSequence = (seq: AnimationMetadata) => {
      return compileTriggers([['myAnimation', [transition('state1 => state2', seq)]]]);
    };

    it('should throw an exception containing all the inner animation parser errors', () => {
      var animation = sequence([
        style({'color': 'red'}), animate(1000, style({'font-size': '100px'})),
        style({'color': 'blue'}), animate(1000, style(':missing_state')), style({'color': 'gold'}),
        animate(1000, style('broken_state'))
      ]);

      var capturedErrorMessage: string;
      try {
        compileSequence(animation);
      } catch (e) {
        capturedErrorMessage = e.message;
      }

      expect(capturedErrorMessage)
          .toMatch(/Unable to apply styles due to missing a state: "missing_state"/g);

      expect(capturedErrorMessage)
          .toMatch(/Animation states via styles must be prefixed with a ":"/);
    });

    it('should throw an error when two or more animation triggers contain the same name', () => {
      var t1Data: any[] = [];
      var t2Data: any[] = [];

      expect(() => {
        compileTriggers([['myTrigger', t1Data], ['myTrigger', t2Data]]);
      }).toThrowError(/The animation trigger "myTrigger" has already been registered on "myCmp"/);
    });
  });
}
