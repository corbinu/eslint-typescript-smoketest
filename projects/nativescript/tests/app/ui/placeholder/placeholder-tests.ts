﻿import TKUnit = require("../../TKUnit");
// >> article-creating-view
import platform = require("platform");
//var utils = require("utils/utils");
import utils = require("utils/utils");
import helper = require("../helper");
import viewModule = require("ui/core/view");

// >> article-require-placeholder-module
import placeholderModule = require("ui/placeholder");
// << article-require-placeholder-module

function creatingView(args) {
   var nativeView;
   if (platform.device.os === platform.platformNames.ios) {
       nativeView = UITextView.new();
       nativeView.text = "Native";
   } else if (platform.device.os === platform.platformNames.android) {
       nativeView = new android.widget.TextView(utils.ad.getApplicationContext());
       nativeView.setText("Native");
   }

   args.view = nativeView;
}

exports.creatingView = creatingView;
// << article-creating-view

export function test_placeholder_creatingView() {
    var nativeView;

    var p = new placeholderModule.Placeholder();
    p.id = "test";
    p.on(placeholderModule.Placeholder.creatingViewEvent, (args: placeholderModule.CreateViewEventData) => {
        if (platform.device.os === platform.platformNames.ios) {
        nativeView = UITextView.new();
            nativeView.text = "Native";
        } else if (platform.device.os === platform.platformNames.android) {
            nativeView = new android.widget.TextView(utils.ad.getApplicationContext());
            nativeView.setText("Native");
        }
    
        args.view = nativeView;
    });

    if (platform.device.os === platform.platformNames.ios) {
       TKUnit.assert(p.ios instanceof UITextView, "ios property should be UITextView. Current value: " + p.ios);
    } else if (platform.device.os === platform.platformNames.android) {
       p._emit("creatingView");
       TKUnit.assert(nativeView instanceof android.widget.TextView, "Native view should be android.widget.TextView. Current value: " + nativeView);
    }
}

export function test_placeholder_will_not_crash_wihout_creatingView() {
    var p = new placeholderModule.Placeholder();   

    function testAction(views: Array<viewModule.View>) {
        if (platform.device.os === platform.platformNames.ios) {
            TKUnit.assert(p.ios === undefined, "ios property should be undefined. Current value: " + p.ios);
        } else if (platform.device.os === platform.platformNames.android) {
            TKUnit.assert(p.android === undefined, "android view should be undefined. Current value: " + p.android);
        }
    };

    helper.buildUIAndRunTest(p, testAction);
}
