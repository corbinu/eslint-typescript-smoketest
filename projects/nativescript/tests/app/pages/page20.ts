﻿import observable = require("data/observable");
import trace = require("trace");
import {Button} from "ui/button";
import {Page} from "ui/page";
trace.addCategories(trace.categories.Layout);
trace.enable();

export function onTap(args: observable.EventData) {
    var btn = <Button>args.object;
    (<Page>btn.page).showModal("tests/pages/page21", null, null);
}