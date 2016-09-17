﻿import observable = require("data/observable");
import common = require("./list-view-common");
import viewModule = require("ui/core/view");
import stackLayout = require("ui/layouts/stack-layout");
import proxy = require("ui/core/proxy");
import dependencyObservable = require("ui/core/dependency-observable");
import definition = require("ui/list-view");
import {ProxyViewContainer} from "ui/proxy-view-container";
import * as layoutBase from "ui/layouts/layout-base";
import * as colorModule from "color";

let color: typeof colorModule;
function ensureColor() {
    if (!color) {
        color = require("color");
    }
}

let ITEMLOADING = common.ListView.itemLoadingEvent;
let LOADMOREITEMS = common.ListView.loadMoreItemsEvent;
let ITEMTAP = common.ListView.itemTapEvent;

global.moduleMerge(common, exports);

function onSeparatorColorPropertyChanged(data: dependencyObservable.PropertyChangeData) {
    let bar = <ListView>data.object;
    if (!bar.android) {
        return;
    }

    ensureColor();

    if (data.newValue instanceof color.Color) {
        bar.android.setDivider(new android.graphics.drawable.ColorDrawable(data.newValue.android));
        bar.android.setDividerHeight(1);
    }
}

// register the setNativeValue callbacks
(<proxy.PropertyMetadata>common.ListView.separatorColorProperty.metadata).onSetNativeValue = onSeparatorColorPropertyChanged;

export class ListView extends common.ListView {
    private _androidViewId: number = -1;
    private _android: android.widget.ListView;
    public _realizedItems = new Map<android.view.View, viewModule.View>();

    public _createUI() {
        this._android = new android.widget.ListView(this._context);

        // Fixes issue with black random black items when scrolling
        this._android.setCacheColorHint(android.graphics.Color.TRANSPARENT);
        if (this._androidViewId < 0) {
            this._androidViewId = android.view.View.generateViewId();
        }
        this._android.setId(this._androidViewId);

        ensureListViewAdapterClass();
        this.android.setAdapter(new ListViewAdapterClass(this));

        let that = new WeakRef(this);
        this.android.setOnItemClickListener(new android.widget.AdapterView.OnItemClickListener({
            onItemClick: function (parent: any, convertView: android.view.View, index: number, id: number) {
                let owner = that.get();
                if (owner) {
                    owner.notify({ eventName: ITEMTAP, object: owner, index: index, view: owner._getRealizedView(convertView, index) });
                }
            }
        }));
    }

    get android(): android.widget.ListView {
        return this._android;
    }

    public refresh() {
        if (!this._android || !this._android.getAdapter()) {
            return;
        }

        // clear bindingContext when it is not observable because otherwise bindings to items won't reevaluate
        this._realizedItems.forEach((view, nativeView, map) => {            
            if (!(view.bindingContext instanceof observable.Observable)) {
                view.bindingContext = null;
            }
        });

        (<android.widget.BaseAdapter>this.android.getAdapter()).notifyDataSetChanged();
    }

    public scrollToIndex(index: number) {
        if (this._android) {
            this._android.setSelection(index);
        }
    }

    public _onDetached(force?: boolean) {
        super._onDetached(force);
        this.clearRealizedCells();
    }

    get _childrenCount(): number {
        return this._realizedItems.size;
    }

    public _eachChildView(callback: (child: viewModule.View) => boolean): void {
        this._realizedItems.forEach((view, nativeView, map) => {
            if (view.parent instanceof ListView) {
                callback(view);
            }
            else {
                // in some cases (like item is unloaded from another place (like angular) view.parent becomes undefined)
                if (view.parent) {
                    callback(view.parent);
                }
            }
        });
    }

    public _getRealizedView(convertView: android.view.View, index: number) {
        if (!convertView) {
            return this._getItemTemplateContent(index);
        }

        return this._realizedItems.get(convertView);
    }

    private clearRealizedCells(): void {
        // clear the cache
        this._realizedItems.forEach((view, nativeView, map) => {
            if (view.parent) {
                // This is to clear the StackLayout that is used to wrap non LayoutBase & ProxyViewContainer instances.
                if (!(view.parent instanceof ListView)) {
                    this._removeView(view.parent);
                }
                view.parent._removeView(view);
            }
        });

        this._realizedItems.clear();
    }
}

let ListViewAdapterClass;
function ensureListViewAdapterClass() {
    if (ListViewAdapterClass) {
        return;
    }

    class ListViewAdapter extends android.widget.BaseAdapter {
        private _listView: ListView;

        constructor(listView: ListView) {
            super();

            this._listView = listView;

            return global.__native(this);
        }

        public getCount() {
            return this._listView && this._listView.items ? this._listView.items.length : 0;
        }

        public getItem(i: number) {
            if (this._listView && this._listView.items && i < this._listView.items.length) {
                return this._listView.items.getItem ? this._listView.items.getItem(i) : this._listView.items[i];
            }

            return null;
        }

        public getItemId(i: number) {
            return long(i);
        }

        public hasStableIds(): boolean {
            return true;
        }

        public getView(index: number, convertView: android.view.View, parent: android.view.ViewGroup): android.view.View {
            if (!this._listView) {
                return null;
            }

            let totalItemCount = this._listView.items ? this._listView.items.length : 0;
            if (index === (totalItemCount - 1)) {
                this._listView.notify({ eventName: LOADMOREITEMS, object: this._listView });
            }

            let view = this._listView._getRealizedView(convertView, index);
            let args: definition.ItemEventData = {
                eventName: ITEMLOADING, object: this._listView, index: index, view: view,
                android: parent,
                ios: undefined
            };

            this._listView.notify(args);

            if (!args.view) {
                args.view = this._listView._getDefaultItemContent(index);
            }

            if (args.view) {
                if (this._listView.rowHeight > -1) {
                    args.view.height = this._listView.rowHeight;
                }
                else {
                    args.view.height = Number.NaN;
                }

                this._listView._prepareItem(args.view, index);
                if (!args.view.parent) {
                    // Proxy containers should not get treated as layouts.
                    // Wrap them in a real layout as well.
                    if (args.view instanceof layoutBase.LayoutBase &&
                        !(args.view instanceof ProxyViewContainer)) {
                        this._listView._addView(args.view);
                        convertView = args.view.android;
                    } else {
                        let sp = new stackLayout.StackLayout();
                        sp.addChild(args.view);
                        this._listView._addView(sp);

                        convertView = sp.android;
                    }
                }

                this._listView._realizedItems.set(convertView, args.view);
            }

            return convertView;
        }
    }

    ListViewAdapterClass = ListViewAdapter;
}