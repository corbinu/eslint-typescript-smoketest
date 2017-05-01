﻿import {Page} from "ui/page";
import * as trace from "trace";
import tests = require("../testRunner");
import {Label} from "ui/label";
import * as application from "application";
import * as platform from "platform";

trace.enable();
trace.addCategories(trace.categories.Test + "," + trace.categories.Error);

// When debugging
//trace.setCategories(trace.categories.concat(
//    trace.categories.Test,
//    trace.categories.Navigation,
//    trace.categories.Transition,
//    trace.categories.NativeLifecycle,
//    trace.categories.ViewHierarchy,
//    trace.categories.VisualTreeEvents
//));

let page = new Page();
page.id = "mainPage";

page.on(Page.navigatedToEvent, onNavigatedTo);

function runTests() {
    setTimeout(function () {
        tests.runAll();
    }, 10);
}

function onNavigatedTo(args) {
    let label = new Label();
    label.text = "Running non-UI tests...";
    page.content = label;
    args.object.off(Page.navigatedToEvent, onNavigatedTo);

    if (platform.isAndroid && parseInt(platform.device.sdkVersion) >= 23) {
        let handler = (args: application.AndroidActivityRequestPermissionsEventData) => {
            application.android.off(application.AndroidApplication.activityRequestPermissionsEvent, handler);    
            if (args.requestCode === 1234 && args.grantResults.length > 0 && args.grantResults[0] === android.content.pm.PackageManager.PERMISSION_GRANTED) {
                runTests();             
            } else {
                trace.write("Permission for write to external storage not granted!", trace.categories.Error, trace.messageType.error);
            }
        };

        application.android.on(application.AndroidApplication.activityRequestPermissionsEvent, handler);

        if ((<any>android.support.v4.content.ContextCompat).checkSelfPermission(application.android.currentContext, (<any>android).Manifest.permission.WRITE_EXTERNAL_STORAGE) !== android.content.pm.PackageManager.PERMISSION_GRANTED) {
            (<any>android.support.v4.app.ActivityCompat).requestPermissions(application.android.currentContext, [(<any>android).Manifest.permission.WRITE_EXTERNAL_STORAGE], 1234);
        } else {
            runTests();
        }
    } else {
        runTests();
    }

}
export function createPage() {
    return page;
}