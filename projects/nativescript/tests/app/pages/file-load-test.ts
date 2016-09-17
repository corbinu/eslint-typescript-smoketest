﻿import label = require("ui/label");
import pages = require("ui/page");
import fs = require("file-system");
import fileResolverModule = require("file-system/file-name-resolver");

export function createPage() {
    var page = new pages.Page();
    var lbl = new label.Label();

    var moduleName = "tests/pages/files/test";

    var resolver = new fileResolverModule.FileNameResolver({
        width: 400,
        height: 600,
        os: "android",
        deviceType: "phone"
    });

    // Current app full path.
    var currentAppPath = fs.knownFolders.currentApp().path;
    var moduleNamePath = fs.path.join(currentAppPath, moduleName);

    var fileName = resolver.resolveFileName(moduleNamePath, "xml");
    lbl.text = fileName;
    lbl.textWrap = true;;

    page.content = lbl;
    return page;
}
