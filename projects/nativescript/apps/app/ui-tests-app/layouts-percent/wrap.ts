﻿import enums = require("ui/enums");
import pageModule = require("ui/page");
import model = require("./myview");

export function onLoaded(args: { eventName: string, object: any }) {
    var page = <pageModule.Page>args.object;
    page.bindingContext = new model.ViewModel();
}

export function onOrientation(args: { eventName: string, object: any }) {
    var layout = args.object.parent;
    if (layout.orientation === enums.Orientation.vertical) {
        layout.orientation = enums.Orientation.horizontal;
    } else {
        layout.orientation = enums.Orientation.vertical;
    }
}

export function onItemWidthItemHeight(args: { eventName: string, object: any }) {
    var layout = args.object.parent;
    layout.itemWidth = 100;
    layout.itemHeight = 100;
}