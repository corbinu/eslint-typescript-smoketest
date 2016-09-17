﻿import definition = require("file-system/file-name-resolver");
import fs = require("file-system");
import types = require("utils/types");
import trace = require("trace");
import platform = require("platform");
import * as appModule from "application";

var MIN_WH: string = "minWH";
var MIN_W: string = "minW";
var MIN_H: string = "minH";
var PRIORITY_STEP = 10000;

interface QualifierSpec {
    isMatch(value: string): boolean;
    getMatchValue(value: string, context: definition.PlatformContext): number;
}

var minWidthHeightQualifier: QualifierSpec = {
    isMatch: function (value: string): boolean {
        return value.indexOf(MIN_WH) === 0;

    },
    getMatchValue(value: string, context: definition.PlatformContext): number {
        var numVal = parseInt(value.substr(MIN_WH.length));
        if (isNaN(numVal)) {
            return -1;
        }

        var actualLength = Math.min(context.width, context.height);
        if (actualLength < numVal) {
            return -1;
        }

        return PRIORITY_STEP - (actualLength - numVal);
    }
}

var minWidthQualifier: QualifierSpec = {
    isMatch: function (value: string): boolean {
        return value.indexOf(MIN_W) === 0 && value.indexOf(MIN_WH) < 0;

    },
    getMatchValue(value: string, context: definition.PlatformContext): number {
        var numVal = parseInt(value.substr(MIN_W.length));
        if (isNaN(numVal)) {
            return -1;
        }

        var actualWidth = context.width;
        if (actualWidth < numVal) {
            return -1;
        }

        return PRIORITY_STEP - (actualWidth - numVal);
    }
}

var minHeightQualifier: QualifierSpec = {
    isMatch: function (value: string): boolean {
        return value.indexOf(MIN_H) === 0 && value.indexOf(MIN_WH) < 0;

    },
    getMatchValue(value: string, context: definition.PlatformContext): number {
        var numVal = parseInt(value.substr(MIN_H.length));
        if (isNaN(numVal)) {
            return -1;
        }

        var actualHeight = context.height;
        if (actualHeight < numVal) {
            return -1;
        }

        return PRIORITY_STEP - (actualHeight - numVal)
    }
}

var paltformQualifier: QualifierSpec = {
    isMatch: function (value: string): boolean {
        return value === "android" ||
            value === "ios";

    },
    getMatchValue(value: string, context: definition.PlatformContext): number {
        return value === context.os.toLowerCase() ? 1 : -1;
    }
}

var orientationQualifier: QualifierSpec = {
    isMatch: function (value: string): boolean {
        return value === "land" ||
            value === "port";

    },
    getMatchValue(value: string, context: definition.PlatformContext): number {
        var isLandscape: number = (context.width > context.height) ? 1 : -1;
        return (value === "land") ? isLandscape : -isLandscape;
    }
}

// List of supported qualifiers ordered by priority
var supportedQualifiers: Array<QualifierSpec> = [
    minWidthHeightQualifier,
    minWidthQualifier,
    minHeightQualifier,
    orientationQualifier,
    paltformQualifier
];

export class FileNameResolver implements definition.FileNameResolver {
    private _context: definition.PlatformContext;
    private _cache = {};

    constructor(context: definition.PlatformContext) {
        this._context = context;
    }

    public resolveFileName(path: string, ext: string): string {
        var key = path + ext;
        var result: string = this._cache[key];
        if (types.isUndefined(result)) {
            result = this.resolveFileNameImpl(path, ext);
            this._cache[key] = result;
        }

        return result;
    }

    public clearCache(): void {
        this._cache = {};
    }

    private resolveFileNameImpl(path: string, ext: string): string {
        var result: string = null;
        path = fs.path.normalize(path);
        ext = "." + ext;

        var candidates = this.getFileCandidatesFromFolder(path, ext);
        result = findFileMatch(path, ext, candidates, this._context);

        if (trace.enabled) {
            trace.write("Resolved file name for \"" + path + ext + "\" result: " + (result ? result : "no match found"), trace.categories.Navigation);
        }
        return result;
    }

    private getFileCandidatesFromFolder(path: string, ext: string): Array<string> {
        var candidates = new Array<string>();
        var folderPath = path.substring(0, path.lastIndexOf(fs.path.separator) + 1);

        if (fs.Folder.exists(folderPath)) {
            var folder = fs.Folder.fromPath(folderPath);
            folder.eachEntity((e) => {
                if (e instanceof fs.File) {
                    var file = <fs.File>e;
                    if (file.path.indexOf(path) === 0 && file.extension === ext) {
                        candidates.push(file.path);
                    }
                }

                return true;
            });
        }
        else {
            if (trace.enabled) {
                trace.write("Could not find folder " + folderPath + " when loading " + path + ext, trace.categories.Navigation);
            }
        }

        return candidates;
    }
}

export function findFileMatch(path: string, ext: string, candidates: Array<string>, context: definition.PlatformContext): string {
    var bestValue = -1
    var result: string = null;

    if (trace.enabled) {
        trace.write("Candidates for " + path + ext + ": " + candidates.join(", "), trace.categories.Navigation);
    }
    for (var i = 0; i < candidates.length; i++) {
        var filePath = candidates[i];
        var qualifiersStr: string = filePath.substr(path.length, filePath.length - path.length - ext.length);

        var qualifiers = qualifiersStr.split(".");

        var value = checkQualifiers(qualifiers, context);

        if (value >= 0 && value > bestValue) {
            bestValue = value;
            result = candidates[i];
        }
    }

    return result;
}

function checkQualifiers(qualifiers: Array<string>, context: definition.PlatformContext): number {
    var result = 0;
    for (var i = 0; i < qualifiers.length; i++) {
        if (qualifiers[i]) {
            var value = checkQualifier(qualifiers[i], context);
            if (value < 0) {
                // Non of the supported qualifiers matched this or the match was not satisified
                return -1;
            }

            result += value;
        }
    }

    return result;
}

function checkQualifier(value: string, context: definition.PlatformContext) {
    for (var i = 0; i < supportedQualifiers.length; i++) {
        if (supportedQualifiers[i].isMatch(value)) {
            var result = supportedQualifiers[i].getMatchValue(value, context);
            if (result > 0) {
                result += (supportedQualifiers.length - i) * PRIORITY_STEP;
            }
            return result;
        }
    }

    return -1;
}

var appEventAttached: boolean = false;
var resolverInstance: FileNameResolver;

export function resolveFileName(path: string, ext: string): string {
    if (!appEventAttached) {
        var app: typeof appModule = require("application");
        app.on(app.orientationChangedEvent, (data) => {
            resolverInstance = undefined;
        });
        appEventAttached = true;
    }

    if (!resolverInstance) {
        resolverInstance = new FileNameResolver({
            width: platform.screen.mainScreen.widthDIPs,
            height: platform.screen.mainScreen.heightDIPs,
            os: platform.device.os,
            deviceType: platform.device.deviceType
        });
    }

    return resolverInstance.resolveFileName(path, ext);
}

export function clearCache(): void {
    if (resolverInstance) {
        resolverInstance.clearCache();
    }
}