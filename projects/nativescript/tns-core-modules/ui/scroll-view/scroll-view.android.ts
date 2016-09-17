﻿import dependencyObservable = require("ui/core/dependency-observable");
import definition = require("ui/scroll-view");
import common = require("./scroll-view-common");
import utils = require("utils/utils");
import enums = require("ui/enums");

global.moduleMerge(common, exports);

common.orientationProperty.onValueChanged = function scrollViewOrientationChanged(data: dependencyObservable.PropertyChangeData) {
    (<ScrollView>data.object)._onOrientationChanged(data.oldValue, data.newValue);
}

export class ScrollView extends common.ScrollView implements definition.ScrollView {
    private _android: org.nativescript.widgets.VerticalScrollView | org.nativescript.widgets.HorizontalScrollView;
    private _androidViewId: number = -1;
    private handler: android.view.ViewTreeObserver.OnScrollChangedListener;
    get android(): android.view.ViewGroup {
        return this._android;
    }

    get _nativeView(): android.view.ViewGroup {
        return this._android;
    }

    get horizontalOffset(): number {
        if (!this._android) {
            return 0;
        }

        return this._android.getScrollX() / utils.layout.getDisplayDensity();
    }

    get verticalOffset(): number {
        if (!this._android) {
            return 0;
        }

        return this._android.getScrollY() / utils.layout.getDisplayDensity();
    }

    get scrollableWidth(): number {
        if (!this._android || this.orientation !== enums.Orientation.horizontal) {
            return 0;
        }

        return this._android.getScrollableLength() / utils.layout.getDisplayDensity();
    }

    get scrollableHeight(): number {
        if (!this._android || this.orientation !== enums.Orientation.vertical) {
            return 0;
        }

        return this._android.getScrollableLength() / utils.layout.getDisplayDensity();
    }

    public scrollToVerticalOffset(value: number, animated: boolean) {
        if (this._android && this.orientation === enums.Orientation.vertical) {
            value *= utils.layout.getDisplayDensity();

            if (animated) {
                this._android.smoothScrollTo(0, value);
            } else {
                this._android.scrollTo(0, value);
            }
        }
    }

    public scrollToHorizontalOffset(value: number, animated: boolean) {
        if (this._android && this.orientation === enums.Orientation.horizontal) {
            value *= utils.layout.getDisplayDensity();

            if (animated) {
                this._android.smoothScrollTo(value, 0);
            } else {
                this._android.scrollTo(value, 0);
            }
        }
    }

    public _createUI() {
        if (this.orientation === enums.Orientation.horizontal) {
            this._android = new org.nativescript.widgets.HorizontalScrollView(this._context);
        } else {
            this._android = new org.nativescript.widgets.VerticalScrollView(this._context);
        }

        if (this._androidViewId < 0) {
            this._androidViewId = android.view.View.generateViewId();
        }

        this._android.setId(this._androidViewId);
    }

    public _onOrientationChanged(oldValue: string, newValue: string) {
        if (this._android) {
            var parent = this.parent;

            if (parent) {
                parent._removeView(this);
            }

            if (parent) {
                parent._addView(this);
            }
        }
    }

    protected attachNative() {
        var that = new WeakRef(this);
        this.handler = new android.view.ViewTreeObserver.OnScrollChangedListener({
            onScrollChanged: function () {
                var owner: ScrollView = that.get();
                if (owner){
                    owner._onScrollChanged();
                }
            }
        });

        this._android.getViewTreeObserver().addOnScrollChangedListener(this.handler);
    }
    
    private _lastScrollX: number = -1;
    private _lastScrollY: number = -1;
    private _onScrollChanged(){
        if (this.android) {
            // Event is only raised if the scroll values differ from the last time in order to wokraround a native Android bug.
            // https://github.com/NativeScript/NativeScript/issues/2362
            let newScrollX = this.android.getScrollX(); 
            let newScrollY = this.android.getScrollY();
            if (newScrollX !== this._lastScrollX || newScrollY !== this._lastScrollY){
                this.notify(<definition.ScrollEventData>{
                    object: this,
                    eventName: ScrollView.scrollEvent,
                    scrollX: newScrollX / utils.layout.getDisplayDensity(),
                    scrollY: newScrollY / utils.layout.getDisplayDensity()
                });
                this._lastScrollX = newScrollX;
                this._lastScrollY = newScrollY;
            } 
        }
    }

    protected dettachNative() {
        this._android.getViewTreeObserver().removeOnScrollChangedListener(this.handler);
        this.handler = null;
    }
}
