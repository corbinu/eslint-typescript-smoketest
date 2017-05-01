﻿require("globals");
import definition = require("application");
import observable = require("data/observable");
import frame = require("ui/frame");
import {RuleSet} from "ui/styling/css-selector";
import * as fileSystemModule from "file-system";
import * as styleScopeModule from "ui/styling/style-scope";
import * as fileResolverModule  from "file-system/file-name-resolver";
import * as builderModule from "ui/builder";
import * as platformModule from "platform";
import "../bundle-entry-points";

var builder: typeof builderModule;
function ensureBuilder() {
    if (!builder) {
        builder = require("ui/builder");
    }
}

var platform: typeof platformModule;
function ensurePlatform() {
    if (!platform) {
        platform = require("platform");
    }
}

var fileNameResolver: typeof fileResolverModule;
function ensureFileNameResolver() {
    if (!fileNameResolver) {
        fileNameResolver = require("file-system/file-name-resolver");
    }
}

var styleScope: typeof styleScopeModule = undefined;

var events = new observable.Observable();
global.moduleMerge(events, exports);

export var launchEvent = "launch";
export var suspendEvent = "suspend";
export var resumeEvent = "resume";
export var exitEvent = "exit";
export var lowMemoryEvent = "lowMemory";
export var uncaughtErrorEvent = "uncaughtError";
export var orientationChangedEvent = "orientationChanged";

export var mainModule: string;
export var mainEntry: frame.NavigationEntry;

export var cssFile: string = "app.css"

export function setCssFileName(cssFileName: string) {
    cssFile = cssFileName;
}

export var appSelectors: RuleSet[] = [];
export var additionalSelectors: RuleSet[] = [];
export var cssSelectors: RuleSet[] = [];
export var cssSelectorVersion: number = 0;
export var keyframes: any = {};

export var resources: any = {};

export function setResources(res: any) {
    resources = res;
}

export var onUncaughtError: (error: definition.NativeScriptError) => void = undefined;

export var onLaunch: (context: any) => any = undefined;

export var onSuspend: () => any = undefined;

export var onResume: () => any = undefined;

export var onExit: () => any = undefined;

export var onLowMemory: () => any = undefined;

export var android = undefined;

export var ios = undefined;

export function loadCss(cssFile?: string): RuleSet[] {
    if (!cssFile) {
        return undefined;
    }

    var result: RuleSet[];

    var fs: typeof fileSystemModule = require("file-system");
    if (!styleScope) {
        styleScope = require("ui/styling/style-scope");
    }

    var cssFileName = fs.path.join(fs.knownFolders.currentApp().path, cssFile);
    if (fs.File.exists(cssFileName)) {
        var file = fs.File.fromPath(cssFileName);
        var applicationCss = file.readTextSync();
        if (applicationCss) {
            result = parseCss(applicationCss, cssFileName);
        }
    }

    return result;
}

export function mergeCssSelectors(module: any): void {
    //HACK: pass the merged module and work with its exported vars.
    module.cssSelectors = module.appSelectors.slice();
    module.cssSelectors.push.apply(module.cssSelectors, module.additionalSelectors);
    module.cssSelectorVersion++;
}

export function parseCss(cssText: string, cssFileName?: string): RuleSet[] {
    if (!styleScope) {
        styleScope = require("ui/styling/style-scope");
    }
    return styleScope.StyleScope.createSelectorsFromCss(cssText, cssFileName, keyframes);
}

export function __onLiveSync() {
    // Close the error page if available and remove the reference from global context.
    if (global.errorPage) {
        global.errorPage.closeModal();
        global.errorPage = undefined;
    }

    try {
        ensureFileNameResolver();

        // Clear file resolver cache to respect newly added files.
        fileNameResolver.clearCache();

        // Reload app.css in case it was changed.
        loadCss();

        global.__onLiveSyncCore();

    } catch (ex) {
        // Show the error as modal page, save reference to the page in global context.
        ensureBuilder();
        global.errorPage = builder.parse(`<Page><ScrollView><Label text="${ex}" textWrap="true" style="color: red;" /></ScrollView></Page>`);
        global.errorPage.showModal();
    }
}

export function __onLiveSyncCore() {
    // Reload current page.
    frame.reloadPage();
}
global.__onLiveSyncCore = __onLiveSyncCore;

export function _onOrientationChanged(){
    ensurePlatform();
    platform.screen.mainScreen._invalidate();

    ensureFileNameResolver();
    fileNameResolver._invalidateResolverInstance();
}