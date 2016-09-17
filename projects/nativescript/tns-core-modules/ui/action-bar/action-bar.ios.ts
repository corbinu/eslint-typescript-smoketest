﻿import common = require("./action-bar-common");
import dts = require("ui/action-bar");
import imageSource = require("image-source");
import frameModule = require("ui/frame");
import enums = require("ui/enums");
import view = require("ui/core/view");
import utils = require("utils/utils");
import types = require("utils/types");
import style = require("ui/styling/style");
import frame = require("ui/frame");

global.moduleMerge(common, exports);

export class ActionItem extends common.ActionItem {
    private _ios: dts.IOSActionItemSettings = {
        position: enums.IOSActionItemPosition.left,
        systemIcon: undefined
    };
    public get ios(): dts.IOSActionItemSettings {
        return this._ios;
    }
    public set ios(value: dts.IOSActionItemSettings) {
        throw new Error("ActionItem.android is read-only");
    }
}

export class NavigationButton extends ActionItem {

}

export class ActionBar extends common.ActionBar {

     get ios(): UIView {

        if (!(this.page && this.page.parent)) {
            return;
        }

        let viewController = (<UIViewController>this.page.ios);
        if (viewController.navigationController !== null) {
            return viewController.navigationController.navigationBar;
        }
        return null;
     }

     public update() {
        // Page should be attached to frame to update the action bar.
        if (!(this.page && this.page.parent)) {
            return;
        }

        var viewController = (<UIViewController>this.page.ios);
        var navigationItem: UINavigationItem = viewController.navigationItem;
        var navController = frameModule.topmost().ios.controller; 
        var navigationBar = navController ? <UINavigationBar>navController.navigationBar : null;
        var previousController: UIViewController;

        // Set Title
        navigationItem.title = this.title;

        if (this.titleView && this.titleView.ios) {
            navigationItem.titleView = this.titleView.ios;
        }

        // Find previous ViewController in the navigation stack
        var indexOfViewController = navController.viewControllers.indexOfObject(viewController);
        if (indexOfViewController < navController.viewControllers.count && indexOfViewController > 0) {
            previousController = navController.viewControllers[indexOfViewController - 1];
        }

        // Set back button text
        if (previousController) {
            if (this.navigationButton) {
                var tapHandler = TapBarItemHandlerImpl.initWithOwner(new WeakRef(this.navigationButton));
                var barButtonItem = UIBarButtonItem.alloc().initWithTitleStyleTargetAction(this.navigationButton.text + "", UIBarButtonItemStyle.Plain, tapHandler, "tap");
                previousController.navigationItem.backBarButtonItem = barButtonItem;
            }
            else {
                previousController.navigationItem.backBarButtonItem = null;
            }
        }

        // Set back button image
        var img: imageSource.ImageSource;
        if (this.navigationButton && common.isVisible(this.navigationButton) && this.navigationButton.icon) {
            img = imageSource.fromFileOrResource(this.navigationButton.icon);
        }

        // TODO: This could cause issue when canceling BackEdge gesture - we will change the backIndicator to 
        // show the one from the old page but the new page will still be visible (because we canceled EdgeBackSwipe gesutre)
        // Consider moving this to new method and call it from - navigationControllerDidShowViewControllerAnimated.
        if (img && img.ios) {
            var image = img.ios.imageWithRenderingMode(UIImageRenderingMode.AlwaysOriginal)
            navigationBar.backIndicatorImage = image;
            navigationBar.backIndicatorTransitionMaskImage = image;
        }
        else {
            navigationBar.backIndicatorImage = null;
            navigationBar.backIndicatorTransitionMaskImage = null;
        }

        // Set back button visibility 
        if (this.navigationButton) {
            navigationItem.setHidesBackButtonAnimated(!common.isVisible(this.navigationButton), true);
        }

        // Populate action items
        this.populateMenuItems(navigationItem);

        // update colors explicitly - they may have to be cleared form a previous page
        this.updateColors(navigationBar);
    }

    private populateMenuItems(navigationItem: UINavigationItem) {
        let items = this.actionItems.getVisibleItems();
        let leftBarItems = [];
        let rightBarItems = [];
        for (let i = 0; i < items.length; i++) {
            let barButtonItem = this.createBarButtonItem(items[i]);
            if (items[i].ios.position === enums.IOSActionItemPosition.left) {
                leftBarItems.push(barButtonItem);
            }
            else {
                rightBarItems.splice(0, 0, barButtonItem);
            }
        }
        navigationItem.setLeftBarButtonItemsAnimated(<any>leftBarItems, false);
        navigationItem.setRightBarButtonItemsAnimated(<any>rightBarItems, false);
        if (leftBarItems.length > 0) {
            navigationItem.leftItemsSupplementBackButton = true;
        }
    }

    private createBarButtonItem(item: dts.ActionItem): UIBarButtonItem {
        var tapHandler = TapBarItemHandlerImpl.initWithOwner(new WeakRef(item));
        // associate handler with menuItem or it will get collected by JSC.
        (<any>item).handler = tapHandler;

        var barButtonItem: UIBarButtonItem;

        if (item.actionView && item.actionView.ios) {
            var recognizer = UITapGestureRecognizer.alloc().initWithTargetAction(tapHandler, "tap");
            item.actionView.ios.addGestureRecognizer(recognizer);
            barButtonItem = UIBarButtonItem.alloc().initWithCustomView(item.actionView.ios);
        }
        else if (types.isNumber(item.ios.systemIcon)) {
            barButtonItem = UIBarButtonItem.alloc().initWithBarButtonSystemItemTargetAction(item.ios.systemIcon, tapHandler, "tap");
        }
        else if (item.icon) {
            var img = imageSource.fromFileOrResource(item.icon);
            if (img && img.ios) {
                barButtonItem = UIBarButtonItem.alloc().initWithImageStyleTargetAction(img.ios, UIBarButtonItemStyle.Plain, tapHandler, "tap");
            }
            else {
                throw new Error("Error loading icon from " + item.icon);
            }
        }
        else {
            barButtonItem = UIBarButtonItem.alloc().initWithTitleStyleTargetAction(item.text + "", UIBarButtonItemStyle.Plain, tapHandler, "tap");
        }

        return barButtonItem;
    }

    private updateColors(navBar: UINavigationBar) {
        var color = this.color;
        if (color) {
            navBar.titleTextAttributes = <any>{ [NSForegroundColorAttributeName]: color.ios };
            navBar.tintColor = color.ios;
        }
        else {
            navBar.titleTextAttributes = null;
            navBar.tintColor = null;
        }

        var bgColor = this.backgroundColor;
        navBar.barTintColor = bgColor ? bgColor.ios : null;
    }

    public _onTitlePropertyChanged() {
        if (!this.page) {
            return;
        }

        if (this.page.frame) {
            this.page.frame._updateActionBar();
        }

        var navigationItem: UINavigationItem = (<UIViewController>this.page.ios).navigationItem;
        navigationItem.title = this.title;
    }

    private _navigationBarHeight: number = 0;
    public onMeasure(widthMeasureSpec: number, heightMeasureSpec: number) {

        let width = utils.layout.getMeasureSpecSize(widthMeasureSpec);
        let widthMode = utils.layout.getMeasureSpecMode(widthMeasureSpec);

        let height = utils.layout.getMeasureSpecSize(heightMeasureSpec);
        let heightMode = utils.layout.getMeasureSpecMode(heightMeasureSpec);

        let navBarWidth = 0;
        let navBarHeight = 0;

        let frame = <frameModule.Frame>this.page.frame;
        if (frame) {
            let navBar: UIView = frame.ios.controller.navigationBar;
            if (!navBar.hidden) {
                let navBarSize = navBar.sizeThatFits(CGSizeMake(
                    (widthMode === utils.layout.UNSPECIFIED) ? Number.POSITIVE_INFINITY : width,
                    (heightMode === utils.layout.UNSPECIFIED) ? Number.POSITIVE_INFINITY : height));
                navBarWidth = navBarSize.width;
                navBarHeight = navBarSize.height;
            }
        }

        this._navigationBarHeight = navBarHeight;
        if (this.titleView) {
            view.View.measureChild(this, this.titleView,
                utils.layout.makeMeasureSpec(width, utils.layout.AT_MOST),
                utils.layout.makeMeasureSpec(navBarHeight, utils.layout.AT_MOST));
        }

        this.actionItems.getItems().forEach((actionItem) => {
            if (actionItem.actionView) {
                view.View.measureChild(this, actionItem.actionView, 
                    utils.layout.makeMeasureSpec(width, utils.layout.AT_MOST),
                    utils.layout.makeMeasureSpec(navBarHeight, utils.layout.AT_MOST));
            }
        });

        // We ignore our width/height, minWidth/minHeight dimensions because it is against Apple policy to change height of NavigationBar.
        this.setMeasuredDimension(navBarWidth, navBarHeight);
    }

    public onLayout(left: number, top: number, right: number, bottom: number) {
        view.View.layoutChild(this, this.titleView, 0, 0, right - left, this._navigationBarHeight);
        this.actionItems.getItems().forEach((actionItem) => {
            if (actionItem.actionView && actionItem.actionView.ios) {
                let measuredWidth = actionItem.actionView.getMeasuredWidth();
                let measuredHeight = actionItem.actionView.getMeasuredHeight();
                view.View.layoutChild(this, actionItem.actionView, 0, 0, measuredWidth, measuredHeight);
            }
        });

        super.onLayout(left, top, right, bottom);
        let navigationBar = this.ios;
        if (navigationBar) {
            navigationBar.setNeedsLayout();
        }
    }

    public layoutNativeView(left: number, top: number, right: number, bottom: number) {
        return;
    }

    public _shouldApplyStyleHandlers() {
        var topFrame = frameModule.topmost();
        return !!topFrame;
    }
}

class TapBarItemHandlerImpl extends NSObject {
    private _owner: WeakRef<dts.ActionItem>;

    public static initWithOwner(owner: WeakRef<dts.ActionItem>): TapBarItemHandlerImpl {
        let handler = <TapBarItemHandlerImpl>TapBarItemHandlerImpl.new();
        handler._owner = owner;
        return handler;
    }

    public tap(args) {
        let owner = this._owner.get();
        if (owner) {
            owner._raiseTap();
        }
    }

    public static ObjCExposedMethods = {
        "tap": { returns: interop.types.void, params: [interop.types.id] }
    };
}

export class ActionBarStyler implements style.Styler {
    // color
    private static setColorProperty(v: view.View, newValue: any) {
        var topFrame = frame.topmost();
        if (topFrame) {
            var navBar = topFrame.ios.controller.navigationBar;
            navBar.titleTextAttributes = <any>{ [NSForegroundColorAttributeName]: newValue };
            navBar.tintColor = newValue;
        }
    }

    private static resetColorProperty(v: view.View, nativeValue: any) {
        var topFrame = frame.topmost();
        if (topFrame) {
            var navBar = topFrame.ios.controller.navigationBar;
            navBar.titleTextAttributes = null;
            navBar.tintColor = null;
        }
    }

    // background-color
    private static setBackgroundColorProperty(v: view.View, newValue: any) {
        var topFrame = frame.topmost();
        if (topFrame) {
            var navBar = topFrame.ios.controller.navigationBar;
            navBar.barTintColor = newValue;
        }
    }

    private static resetBackgroundColorProperty(v: view.View, nativeValue: any) {
        var topFrame = frame.topmost();
        if (topFrame) {
            var navBar = topFrame.ios.controller.navigationBar;
            navBar.barTintColor = null;
        }
    }

    public static registerHandlers() {
        style.registerHandler(style.colorProperty, new style.StylePropertyChangedHandler(
            ActionBarStyler.setColorProperty,
            ActionBarStyler.resetColorProperty), "ActionBar");

        style.registerHandler(style.backgroundColorProperty, new style.StylePropertyChangedHandler(
            ActionBarStyler.setBackgroundColorProperty,
            ActionBarStyler.resetBackgroundColorProperty), "ActionBar");

        style.registerHandler(style.backgroundInternalProperty, style.ignorePropertyHandler, "ActionBar");
    }
}

ActionBarStyler.registerHandlers();
