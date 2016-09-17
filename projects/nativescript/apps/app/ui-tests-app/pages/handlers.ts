import observable = require("data/observable");
import gestures = require("ui/gestures");
import pages = require("ui/page");

export function pageLoaded(args: observable.EventData) {
    var page = <pages.Page>args.object;
    page.bindingContext = { tapAction: tapAction, doubleTapAction: doubleTapAction };
}

export function tapAction(args: gestures.GestureEventData) {
    console.log("tapAction")
}

export function doubleTapAction(args: gestures.GestureEventData) {
    console.log("doubleTapAction")
}