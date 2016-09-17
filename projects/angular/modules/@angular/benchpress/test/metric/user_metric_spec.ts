/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Provider, ReflectiveInjector} from '@angular/core';
import {AsyncTestCompleter, afterEach, beforeEach, ddescribe, describe, expect, iit, inject, it, xit} from '@angular/core/testing/testing_internal';

import {Injector, Metric, MultiMetric, Options, PerfLogEvent, PerfLogFeatures, PerflogMetric, UserMetric, WebDriverAdapter, WebDriverExtension} from '../../index';
import {StringMapWrapper} from '../../src/facade/collection';
import {Json, isBlank, isPresent} from '../../src/facade/lang';

export function main() {
  var wdAdapter: MockDriverAdapter;

  function createMetric(
      perfLogs: PerfLogEvent[], perfLogFeatures: PerfLogFeatures,
      {userMetrics}: {userMetrics?: {[key: string]: string}} = {}): UserMetric {
    if (isBlank(perfLogFeatures)) {
      perfLogFeatures =
          new PerfLogFeatures({render: true, gc: true, frameCapture: true, userTiming: true});
    }
    if (isBlank(userMetrics)) {
      userMetrics = StringMapWrapper.create();
    }
    wdAdapter = new MockDriverAdapter();
    var providers: Provider[] = [
      Options.DEFAULT_PROVIDERS, UserMetric.PROVIDERS,
      {provide: Options.USER_METRICS, useValue: userMetrics},
      {provide: WebDriverAdapter, useValue: wdAdapter}
    ];
    return ReflectiveInjector.resolveAndCreate(providers).get(UserMetric);
  }

  describe('user metric', () => {

    it('should describe itself based on userMetrics', () => {
      expect(createMetric([[]], new PerfLogFeatures(), {
               userMetrics: {'loadTime': 'time to load'}
             }).describe())
          .toEqual({'loadTime': 'time to load'});
    });

    describe('endMeasure', () => {
      it('should stop measuring when all properties have numeric values',
         inject([AsyncTestCompleter], (async: AsyncTestCompleter) => {
           let metric = createMetric(
               [[]], new PerfLogFeatures(),
               {userMetrics: {'loadTime': 'time to load', 'content': 'time to see content'}});
           metric.beginMeasure()
               .then((_) => metric.endMeasure(true))
               .then((values: {[key: string]: string}) => {
                 expect(values['loadTime']).toBe(25);
                 expect(values['content']).toBe(250);
                 async.done();
               });

           wdAdapter.data['loadTime'] = 25;
           // Wait before setting 2nd property.
           setTimeout(() => { wdAdapter.data['content'] = 250; }, 50);

         }), 600);
    });
  });
}

class MockDriverAdapter extends WebDriverAdapter {
  data: any = {};

  executeScript(script: string): any {
    // Just handles `return window.propName` ignores `delete window.propName`.
    if (script.indexOf('return window.') == 0) {
      let metricName = script.substring('return window.'.length);
      return Promise.resolve(this.data[metricName]);
    } else if (script.indexOf('delete window.') == 0) {
      return Promise.resolve(null);
    } else {
      return Promise.reject(`Unexpected syntax: ${script}`);
    }
  }
}
