﻿import definition = require("ui/gestures");
import view = require("ui/core/view");

export enum GestureTypes {
    tap = 1 << 0,
    doubleTap = 1 << 1,
    pinch = 1 << 2,
    pan = 1 << 3,
    swipe = 1 << 4,
    rotation = 1 << 5,
    longPress = 1 << 6,
    touch = 1 << 7
}

export enum GestureStateTypes {
    cancelled,
    began,
    changed,
    ended
}

export enum SwipeDirection {
    right = 1 << 0,
    left = 1 << 1,
    up = 1 << 2,
    down = 1 << 3
}

export module TouchAction {
    export var down = "down";
    export var up = "up";
    export var move = "move";
    export var cancel = "cancel";
}

export function observe(target: view.View, type: definition.GestureTypes, callback: (args: definition.GestureEventData) => void, context?: any): definition.GesturesObserver {
    var observer = new definition.GesturesObserver(target, callback, context);
    observer.observe(type);
    return observer;
}

export function toString(type: GestureTypes, separator?: string): string {
    var types = new Array<string>();

    if (type & definition.GestureTypes.tap) {
        types.push("tap");
    }

    if (type & definition.GestureTypes.doubleTap) {
        types.push("doubleTap");
    }

    if (type & definition.GestureTypes.pinch) {
        types.push("pinch");
    }

    if (type & definition.GestureTypes.pan) {
        types.push("pan");
    }

    if (type & definition.GestureTypes.swipe) {
        types.push("swipe");
    }

    if (type & definition.GestureTypes.rotation) {
        types.push("rotation");
    }

    if (type & definition.GestureTypes.longPress) {
        types.push("longPress");
    }

    if (type & definition.GestureTypes.touch) {
        types.push("touch");
    }

    return types.join(separator);
}

export function fromString(type: string): definition.GestureTypes {
    var t = type.trim().toLowerCase();

    if (t === "tap") {
        return definition.GestureTypes.tap;
    } else if (t === "doubletap") {
        return definition.GestureTypes.doubleTap;
    } else if (t === "pinch") {
        return definition.GestureTypes.pinch;
    } else if (t === "pan") {
        return definition.GestureTypes.pan;
    } else if (t === "swipe") {
        return definition.GestureTypes.swipe;
    } else if (t === "rotation") {
        return definition.GestureTypes.rotation;
    } else if (t === "longpress") {
        return definition.GestureTypes.longPress;
    } else if (t === "touch") {
        return definition.GestureTypes.touch;
    }

    return undefined;
}

export class GesturesObserver implements definition.GesturesObserver {
    private _callback: (args: definition.GestureEventData) => void;
    private _target: view.View;
    private _context: any;

    public type: definition.GestureTypes;

    public get callback(): (args: definition.GestureEventData) => void {
        return this._callback;
    }

    public get target(): view.View {
        return this._target;
    }

    public get context() {
        return this._context;
    }

    constructor(target: view.View, callback: (args: definition.GestureEventData) => void, context: any) {
        this._target = target;
        this._callback = callback;
        this._context = context;
    }

    public androidOnTouchEvent(motionEvent: android.view.MotionEvent) {
        //
    }

    public observe(type: definition.GestureTypes) {
        //
    }

    public disconnect() {
        // remove gesture observer from map
        if (this.target) {
            var list = this.target.getGestureObservers(this.type);
            if (list && list.length > 0) {
                for (let i = 0; i < list.length; i++) {
                    if (list[i].callback === this.callback) {
                        break;
                    }
                }
                list.length = 0;

                this.target._gestureObservers[this.type] = undefined;
                delete this.target._gestureObservers[this.type];
            }
        }
        this._target = null;
        this._callback = null;
        this._context = null;
    }
}