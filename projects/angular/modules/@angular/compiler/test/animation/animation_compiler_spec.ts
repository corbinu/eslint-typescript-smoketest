/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {AnimationMetadata, animate, sequence, style, transition, trigger} from '@angular/core';
import {beforeEach, describe, expect, inject, it} from '@angular/core/testing/testing_internal';
import {AnimationCompiler, AnimationEntryCompileResult} from '../../src/animation/animation_compiler';
import {AnimationParser} from '../../src/animation/animation_parser';
import {CompileAnimationEntryMetadata, CompileDirectiveMetadata, CompileTemplateMetadata, CompileTypeMetadata, identifierName} from '../../src/compile_metadata';
import {CompileMetadataResolver} from '../../src/metadata_resolver';
import {ElementSchemaRegistry} from '../../src/schema/element_schema_registry';

export function main() {
  describe('RuntimeAnimationCompiler', () => {
    let resolver: CompileMetadataResolver;
    let parser: AnimationParser;
    beforeEach(inject(
        [CompileMetadataResolver, ElementSchemaRegistry],
        (res: CompileMetadataResolver, schema: ElementSchemaRegistry) => {
          resolver = res;
          parser = new AnimationParser(schema);
        }));

    const compiler = new AnimationCompiler();

    const compileAnimations =
        (component: CompileDirectiveMetadata): AnimationEntryCompileResult[] => {
          const parsedAnimations = parser.parseComponent(component);
          return compiler.compile(identifierName(component.type), parsedAnimations);
        };

    const compileTriggers = (input: any[]) => {
      const entries: CompileAnimationEntryMetadata[] = input.map(entry => {
        const animationTriggerData = trigger(entry[0], entry[1]);
        return resolver.getAnimationEntryMetadata(animationTriggerData);
      });

      const component = CompileDirectiveMetadata.create({
        type: {reference: {name: 'myCmp', filePath: ''}, diDeps: [], lifecycleHooks: []},
        template: new CompileTemplateMetadata({animations: entries})
      });

      return compileAnimations(component);
    };

    const compileSequence = (seq: AnimationMetadata) => {
      return compileTriggers([['myAnimation', [transition('state1 => state2', seq)]]]);
    };

    it('should throw an exception containing all the inner animation parser errors', () => {
      const animation = sequence([
        style({'color': 'red'}), animate(1000, style({'font-size': '100px'})),
        style({'color': 'blue'}), animate(1000, style(':missing_state')), style({'color': 'gold'}),
        animate(1000, style('broken_state'))
      ]);

      let capturedErrorMessage: string;
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
  });
}
