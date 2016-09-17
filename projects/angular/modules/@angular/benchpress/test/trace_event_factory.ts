/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {PerfLogEvent} from '../index';
import {isPresent} from '../src/facade/lang';

export class TraceEventFactory {
  constructor(private _cat: string, private _pid: string) {}

  create(ph: any, name: string, time: number, args: any = null) {
    var res:
        PerfLogEvent = {'name': name, 'cat': this._cat, 'ph': ph, 'ts': time, 'pid': this._pid};
    if (isPresent(args)) {
      res['args'] = args;
    }
    return res;
  }

  markStart(name: string, time: number) { return this.create('b', name, time); }

  markEnd(name: string, time: number) { return this.create('e', name, time); }

  start(name: string, time: number, args: any = null) { return this.create('B', name, time, args); }

  end(name: string, time: number, args: any = null) { return this.create('E', name, time, args); }

  instant(name: string, time: number, args: any = null) {
    return this.create('i', name, time, args);
  }

  complete(name: string, time: number, duration: number, args: any = null) {
    var res = this.create('X', name, time, args);
    res['dur'] = duration;
    return res;
  }
}
