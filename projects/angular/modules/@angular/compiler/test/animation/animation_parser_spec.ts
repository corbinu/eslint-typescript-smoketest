/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {AnimationMetadata, animate, group, keyframes, sequence, style, transition, trigger} from '@angular/core';
import {beforeEach, describe, inject, it} from '@angular/core/testing/testing_internal';
import {expect} from '@angular/platform-browser/testing/matchers';

import {AnimationEntryAst, AnimationGroupAst, AnimationKeyframeAst, AnimationSequenceAst, AnimationStepAst, AnimationStylesAst} from '../../src/animation/animation_ast';
import {AnimationParser} from '../../src/animation/animation_parser';
import {CompileMetadataResolver} from '../../src/metadata_resolver';
import {ElementSchemaRegistry} from '../../src/schema/element_schema_registry';
import {FILL_STYLE_FLAG, flattenStyles} from '../private_import_core';

export function main() {
  describe('parseAnimationEntry', () => {
    const combineStyles = (styles: AnimationStylesAst): {[key: string]: string | number} => {
      const flatStyles: {[key: string]: string | number} = {};
      styles.styles.forEach(
          entry => Object.keys(entry).forEach(prop => { flatStyles[prop] = entry[prop]; }));
      return flatStyles;
    };

    const collectKeyframeStyles =
        (keyframe: AnimationKeyframeAst): {[key: string]: string | number} =>
            combineStyles(keyframe.styles);

    const collectStepStyles = (step: AnimationStepAst): {[key: string]: string | number}[] => {
      const keyframes = step.keyframes;
      const styles: {[key: string]: string | number}[] = [];
      if (step.startingStyles.styles.length > 0) {
        styles.push(combineStyles(step.startingStyles));
      }
      keyframes.forEach(keyframe => styles.push(collectKeyframeStyles(keyframe)));
      return styles;
    };

    let resolver: CompileMetadataResolver;
    let schema: ElementSchemaRegistry;
    beforeEach(inject(
        [CompileMetadataResolver, ElementSchemaRegistry],
        (res: CompileMetadataResolver, sch: ElementSchemaRegistry) => {
          resolver = res;
          schema = sch;
        }));

    const parseAnimation = (data: AnimationMetadata[]) => {
      const entry = trigger('myAnimation', [transition('state1 => state2', sequence(data))]);
      const compiledAnimationEntry = resolver.getAnimationEntryMetadata(entry);
      const parser = new AnimationParser(schema);
      return parser.parseEntry(compiledAnimationEntry);
    };

    const getAnimationAstFromEntryAst =
        (ast: AnimationEntryAst) => { return ast.stateTransitions[0].animation; };

    const parseAnimationAst = (data: AnimationMetadata[]) =>
        getAnimationAstFromEntryAst(parseAnimation(data).ast);

    const parseAnimationAndGetErrors = (data: AnimationMetadata[]) => parseAnimation(data).errors;

    it('should merge repeated style steps into a single style ast step entry', () => {
      const ast = parseAnimationAst([
        style({'color': 'black'}), style({'background': 'red'}), style({'opacity': '0'}),
        animate(1000, style({'color': 'white', 'background': 'black', 'opacity': '1'}))
      ]);

      expect(ast.steps.length).toEqual(1);

      const step = <AnimationStepAst>ast.steps[0];
      expect(step.startingStyles.styles[0])
          .toEqual({'color': 'black', 'background': 'red', 'opacity': '0'});

      expect(step.keyframes[0].styles.styles[0])
          .toEqual({'color': 'black', 'background': 'red', 'opacity': '0'});

      expect(step.keyframes[1].styles.styles[0])
          .toEqual({'color': 'white', 'background': 'black', 'opacity': '1'});
    });

    it('should animate only the styles requested within an animation step', () => {
      const ast = parseAnimationAst([
        style({'color': 'black', 'background': 'blue'}),
        animate(1000, style({'background': 'orange'}))
      ]);

      expect(ast.steps.length).toEqual(1);

      const animateStep = <AnimationStepAst>ast.steps[0];
      const fromKeyframe = animateStep.keyframes[0].styles.styles[0];
      const toKeyframe = animateStep.keyframes[1].styles.styles[0];
      expect(fromKeyframe).toEqual({'background': 'blue'});
      expect(toKeyframe).toEqual({'background': 'orange'});
    });

    it('should populate the starting and duration times propertly', () => {
      const ast = parseAnimationAst([
        style({'color': 'black', 'opacity': '1'}),
        animate(1000, style({'color': 'red'})),
        animate(4000, style({'color': 'yellow'})),
        sequence(
            [animate(1000, style({'color': 'blue'})), animate(1000, style({'color': 'grey'}))]),
        group([animate(500, style({'color': 'pink'})), animate(1000, style({'opacity': '0.5'}))]),
        animate(300, style({'color': 'black'})),
      ]);

      expect(ast.steps.length).toEqual(5);

      const step1 = <AnimationStepAst>ast.steps[0];
      expect(step1.playTime).toEqual(1000);
      expect(step1.startTime).toEqual(0);

      const step2 = <AnimationStepAst>ast.steps[1];
      expect(step2.playTime).toEqual(4000);
      expect(step2.startTime).toEqual(1000);

      const seq = <AnimationSequenceAst>ast.steps[2];
      expect(seq.playTime).toEqual(2000);
      expect(seq.startTime).toEqual(5000);

      const step4 = <AnimationStepAst>seq.steps[0];
      expect(step4.playTime).toEqual(1000);
      expect(step4.startTime).toEqual(5000);

      const step5 = <AnimationStepAst>seq.steps[1];
      expect(step5.playTime).toEqual(1000);
      expect(step5.startTime).toEqual(6000);

      const grp = <AnimationGroupAst>ast.steps[3];
      expect(grp.playTime).toEqual(1000);
      expect(grp.startTime).toEqual(7000);

      const step6 = <AnimationStepAst>grp.steps[0];
      expect(step6.playTime).toEqual(500);
      expect(step6.startTime).toEqual(7000);

      const step7 = <AnimationStepAst>grp.steps[1];
      expect(step7.playTime).toEqual(1000);
      expect(step7.startTime).toEqual(7000);

      const step8 = <AnimationStepAst>ast.steps[4];
      expect(step8.playTime).toEqual(300);
      expect(step8.startTime).toEqual(8000);
    });

    it('should apply the correct animate() styles when parallel animations are active and use the same properties',
       () => {
         const details = parseAnimation([
           style({'opacity': '0', 'color': 'red'}), group([
             sequence([
               animate(2000, style({'color': 'black'})),
               animate(2000, style({'opacity': '0.5'})),
             ]),
             sequence([
               animate(2000, style({'opacity': '0.8'})),
               animate(2000, style({'color': 'blue'}))
             ])
           ])
         ]);

         const errors = details.errors;
         expect(errors.length).toEqual(0);

         const ast = <AnimationSequenceAst>getAnimationAstFromEntryAst(details.ast);
         const g1 = <AnimationGroupAst>ast.steps[1];

         const sq1 = <AnimationSequenceAst>g1.steps[0];
         const sq2 = <AnimationSequenceAst>g1.steps[1];

         const sq1a1 = <AnimationStepAst>sq1.steps[0];
         expect(collectStepStyles(sq1a1)).toEqual([{'color': 'red'}, {'color': 'black'}]);

         const sq1a2 = <AnimationStepAst>sq1.steps[1];
         expect(collectStepStyles(sq1a2)).toEqual([{'opacity': '0.8'}, {'opacity': '0.5'}]);

         const sq2a1 = <AnimationStepAst>sq2.steps[0];
         expect(collectStepStyles(sq2a1)).toEqual([{'opacity': '0'}, {'opacity': '0.8'}]);

         const sq2a2 = <AnimationStepAst>sq2.steps[1];
         expect(collectStepStyles(sq2a2)).toEqual([{'color': 'black'}, {'color': 'blue'}]);
       });

    it('should throw errors when animations animate a CSS property at the same time', () => {
      const animation1 = parseAnimation([
        style({'opacity': '0'}),
        group([animate(1000, style({'opacity': '1'})), animate(2000, style({'opacity': '0.5'}))])
      ]);

      const errors1 = animation1.errors;
      expect(errors1.length).toEqual(1);
      expect(errors1[0].msg)
          .toContainError(
              'The animated CSS property "opacity" unexpectedly changes between steps "0ms" and "2000ms" at "1000ms"');

      const animation2 = parseAnimation([
        style({'color': 'red'}),
        group(
            [animate(5000, style({'color': 'blue'})), animate(2500, style({'color': 'black'}))])
      ]);

      const errors2 = animation2.errors;
      expect(errors2.length).toEqual(1);
      expect(errors2[0].msg)
          .toContainError(
              'The animated CSS property "color" unexpectedly changes between steps "0ms" and "5000ms" at "2500ms"');
    });

    it('should return an error when an animation style contains an invalid timing value', () => {
      const errors = parseAnimationAndGetErrors(
          [style({'opacity': '0'}), animate('one second', style({'opacity': '1'}))]);
      expect(errors[0].msg).toContainError(`The provided timing value "one second" is invalid.`);
    });

    it('should collect and return any errors collected when parsing the metadata', () => {
      const errors = parseAnimationAndGetErrors([
        style({'opacity': '0'}), animate('one second', style({'opacity': '1'})),
        style({'opacity': '0'}), animate('one second', null), style({'background': 'red'})
      ]);
      expect(errors.length).toBeGreaterThan(1);
    });

    it('should normalize a series of keyframe styles into a list of offset steps', () => {
      const ast =
          parseAnimationAst([animate(1000, keyframes([
                                       style({'width': '0'}), style({'width': '25px'}),
                                       style({'width': '50px'}), style({'width': '75px'})
                                     ]))]);

      const step = <AnimationStepAst>ast.steps[0];
      expect(step.keyframes.length).toEqual(4);

      expect(step.keyframes[0].offset).toEqual(0);
      expect(step.keyframes[1].offset).toMatch(/^0\.33/);
      expect(step.keyframes[2].offset).toMatch(/^0\.66/);
      expect(step.keyframes[3].offset).toEqual(1);
    });

    it('should use an existing collection of offset steps if provided', () => {
      const ast = parseAnimationAst([animate(
          1000, keyframes([
            style({'height': '0', 'offset': 0}), style({'height': '25px', 'offset': 0.6}),
            style({'height': '50px', 'offset': 0.7}), style({'height': '75px', 'offset': 1})
          ]))]);

      const step = <AnimationStepAst>ast.steps[0];
      expect(step.keyframes.length).toEqual(4);

      expect(step.keyframes[0].offset).toEqual(0);
      expect(step.keyframes[1].offset).toEqual(0.6);
      expect(step.keyframes[2].offset).toEqual(0.7);
      expect(step.keyframes[3].offset).toEqual(1);
    });

    it('should sort the provided collection of steps that contain offsets', () => {
      const ast = parseAnimationAst([animate(
          1000, keyframes([
            style({'opacity': '0', 'offset': 0.9}), style({'opacity': '0.25', 'offset': 0}),
            style({'opacity': '0.50', 'offset': 1}),
            style({'opacity': '0.75', 'offset': 0.91})
          ]))]);

      const step = <AnimationStepAst>ast.steps[0];
      expect(step.keyframes.length).toEqual(4);

      expect(step.keyframes[0].offset).toEqual(0);
      expect(step.keyframes[0].styles.styles[0]['opacity']).toEqual('0.25');

      expect(step.keyframes[1].offset).toEqual(0.9);
      expect(step.keyframes[1].styles.styles[0]['opacity']).toEqual('0');

      expect(step.keyframes[2].offset).toEqual(0.91);
      expect(step.keyframes[2].styles.styles[0]['opacity']).toEqual('0.75');

      expect(step.keyframes[3].offset).toEqual(1);
      expect(step.keyframes[3].styles.styles[0]['opacity']).toEqual('0.50');
    });

    it('should throw an error if a partial amount of keyframes contain an offset', () => {
      const errors = parseAnimationAndGetErrors(
          [animate(1000, keyframes([
                     style({'z-index': 0, 'offset': 0}), style({'z-index': 1}),
                     style({'z-index': 2, 'offset': 1})
                   ]))]);

      expect(errors.length).toEqual(1);
      const error = errors[0];

      expect(error.msg).toMatch(/Not all style\(\) entries contain an offset/);
    });

    it('should use an existing style used earlier in the animation sequence if not defined in the first keyframe',
       () => {
         const ast = parseAnimationAst([animate(
             1000,
             keyframes(
                 [style({'color': 'red'}), style({'background': 'blue', 'color': 'white'})]))]);

         const keyframesStep = <AnimationStepAst>ast.steps[0];
         const kf1 = keyframesStep.keyframes[0];
         const kf2 = keyframesStep.keyframes[1];

         expect(flattenStyles(kf1.styles.styles))
             .toEqual({'color': 'red', 'background': FILL_STYLE_FLAG});
       });

    it('should copy over any missing styles to the final keyframe if not already defined', () => {
      const ast = parseAnimationAst([animate(
          1000, keyframes([
            style({'color': 'white', 'borderColor': 'white'}),
            style({'color': 'red', 'background': 'blue'}), style({'background': 'blue'})
          ]))]);

      const keyframesStep = <AnimationStepAst>ast.steps[0];
      const kf1 = keyframesStep.keyframes[0];
      const kf2 = keyframesStep.keyframes[1];
      const kf3 = keyframesStep.keyframes[2];

      expect(flattenStyles(kf3.styles.styles))
          .toEqual({'background': 'blue', 'color': 'red', 'borderColor': 'white'});
    });

    it('should create an initial keyframe if not detected and place all keyframes styles there',
       () => {
         const ast = parseAnimationAst([animate(
             1000, keyframes([
               style({'color': 'white', 'background': 'black', 'offset': 0.5}),
               style(
                   {'color': 'orange', 'background': 'red', 'fontSize': '100px', 'offset': 1})
             ]))]);

         const keyframesStep = <AnimationStepAst>ast.steps[0];
         expect(keyframesStep.keyframes.length).toEqual(3);
         const kf1 = keyframesStep.keyframes[0];
         const kf2 = keyframesStep.keyframes[1];
         const kf3 = keyframesStep.keyframes[2];

         expect(kf1.offset).toEqual(0);
         expect(flattenStyles(kf1.styles.styles)).toEqual({
           'fontSize': FILL_STYLE_FLAG,
           'background': FILL_STYLE_FLAG,
           'color': FILL_STYLE_FLAG
         });
       });

    it('should create an destination keyframe if not detected and place all keyframes styles there',
       () => {
         const ast = parseAnimationAst([animate(1000, keyframes([
                                                  style({
                                                    'color': 'white',
                                                    'background': 'black',
                                                    'transform': 'rotate(360deg)',
                                                    'offset': 0
                                                  }),
                                                  style({
                                                    'color': 'orange',
                                                    'background': 'red',
                                                    'fontSize': '100px',
                                                    'offset': 0.5
                                                  })
                                                ]))]);

         const keyframesStep = <AnimationStepAst>ast.steps[0];
         expect(keyframesStep.keyframes.length).toEqual(3);
         const kf1 = keyframesStep.keyframes[0];
         const kf2 = keyframesStep.keyframes[1];
         const kf3 = keyframesStep.keyframes[2];

         expect(kf3.offset).toEqual(1);
         expect(flattenStyles(kf3.styles.styles)).toEqual({
           'color': 'orange',
           'background': 'red',
           'transform': 'rotate(360deg)',
           'fontSize': '100px'
         });
       });

    describe('easing / duration / delay', () => {
      it('should parse simple string-based values', () => {
        const ast = parseAnimationAst([animate('1s .5s ease-out', style({'opacity': '1'}))]);

        const step = <AnimationStepAst>ast.steps[0];
        expect(step.duration).toEqual(1000);
        expect(step.delay).toEqual(500);
        expect(step.easing).toEqual('ease-out');
      });

      it('should parse a numeric duration value', () => {
        const ast = parseAnimationAst([animate(666, style({'opacity': '1'}))]);

        const step = <AnimationStepAst>ast.steps[0];
        expect(step.duration).toEqual(666);
        expect(step.delay).toEqual(0);
        expect(step.easing).toBeFalsy();
      });

      it('should parse an easing value without a delay', () => {
        const ast = parseAnimationAst([animate('5s linear', style({'opacity': '1'}))]);

        const step = <AnimationStepAst>ast.steps[0];
        expect(step.duration).toEqual(5000);
        expect(step.delay).toEqual(0);
        expect(step.easing).toEqual('linear');
      });

      it('should parse a complex easing value', () => {
        const ast =
            parseAnimationAst([animate('30ms cubic-bezier(0, 0,0, .69)', style({'opacity': '1'}))]);

        const step = <AnimationStepAst>ast.steps[0];
        expect(step.duration).toEqual(30);
        expect(step.delay).toEqual(0);
        expect(step.easing).toEqual('cubic-bezier(0, 0,0, .69)');
      });
    });
  });
}
