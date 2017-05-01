/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {getDOM} from '@angular/platform-browser/src/dom/dom_adapter';
import {el} from '@angular/platform-browser/testing/browser_util';

import {ViewAnimationMap} from '../../src/animation/view_animation_map';
import {MockAnimationPlayer} from '../../testing/mock_animation_player';
import {beforeEach, describe, expect, it} from '../../testing/testing_internal';

export function main() {
  describe('ActiveAnimationsPlayersMap', function() {
    let playersMap: any /** TODO #9100 */;
    let elementNode: any /** TODO #9100 */;
    const animationName = 'animationName';

    beforeEach(() => {
      playersMap = new ViewAnimationMap();
      elementNode = el('<div></div>');
    });

    afterEach(() => {
      getDOM().remove(elementNode);
      elementNode = null;
    });

    it('should register a player an allow it to be accessed', () => {
      const player = new MockAnimationPlayer();
      playersMap.set(elementNode, animationName, player);

      expect(playersMap.find(elementNode, animationName)).toBe(player);
      expect(playersMap.findAllPlayersByElement(elementNode)).toEqual([player]);
      expect(playersMap.getAllPlayers()).toEqual([player]);
      expect(countPlayers(playersMap)).toEqual(1);
    });

    it('should remove a registered player when remove() is called', () => {
      const player = new MockAnimationPlayer();
      playersMap.set(elementNode, animationName, player);
      expect(playersMap.find(elementNode, animationName)).toBe(player);
      expect(countPlayers(playersMap)).toEqual(1);
      playersMap.remove(elementNode, animationName);
      expect(playersMap.find(elementNode, animationName)).not.toBe(player);
      expect(countPlayers(playersMap)).toEqual(0);
    });

    it('should allow multiple players to be registered on the same element', () => {
      const player1 = new MockAnimationPlayer();
      const player2 = new MockAnimationPlayer();
      playersMap.set(elementNode, 'myAnimation1', player1);
      playersMap.set(elementNode, 'myAnimation2', player2);
      expect(countPlayers(playersMap)).toEqual(2);
      expect(playersMap.findAllPlayersByElement(elementNode)).toEqual([player1, player2]);
    });

    it('should only allow one player to be set for a given element/animationName pair', () => {
      const player1 = new MockAnimationPlayer();
      const player2 = new MockAnimationPlayer();
      playersMap.set(elementNode, animationName, player1);
      expect(playersMap.find(elementNode, animationName)).toBe(player1);
      expect(countPlayers(playersMap)).toEqual(1);
      playersMap.set(elementNode, animationName, player2);
      expect(playersMap.find(elementNode, animationName)).toBe(player2);
      expect(countPlayers(playersMap)).toEqual(1);
    });
  });
}

function countPlayers(map: ViewAnimationMap): number {
  return map.getAllPlayers().length;
}
