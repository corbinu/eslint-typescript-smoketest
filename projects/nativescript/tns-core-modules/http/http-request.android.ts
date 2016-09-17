﻿/**
 * Android specific http request implementation.
 */
import types = require("utils/types");
import * as utilsModule from "utils/utils";
import * as imageSourceModule from "image-source";
import * as platformModule from "platform";
import * as fsModule from "file-system";

// this is imported for definition purposes only
import http = require("http");

var requestIdCounter = 0;
var pendingRequests = {};

var utils: typeof utilsModule;
function ensureUtils() {
    if (!utils) {
        utils = require("utils/utils");
    }
}

var imageSource: typeof imageSourceModule;
function ensureImageSource() {
    if (!imageSource) {
        imageSource = require("image-source");
    }
}

var platform: typeof platformModule;
function ensurePlatform() {
    if (!platform) {
        platform = require("platform");
    }
}

var completeCallback: org.nativescript.widgets.Async.CompleteCallback;
function ensureCompleteCallback() {
    if (completeCallback) {
        return;
    }

    completeCallback = new org.nativescript.widgets.Async.CompleteCallback({
        onComplete: function (result: any, context: any) {
            // as a context we will receive the id of the request
            onRequestComplete(context, result);
        }
    });
}

function onRequestComplete(requestId: number, result: org.nativescript.widgets.Async.Http.RequestResult) {
    var callbacks = pendingRequests[requestId];
    delete pendingRequests[requestId];

    if (result.error) {
        callbacks.rejectCallback(new Error(result.error.toString()));
        return;
    }

    // read the headers
    var headers: http.Headers = {};
    if (result.headers) {
        var jHeaders = result.headers;
        var length = jHeaders.size();
        var i;
        var pair: org.nativescript.widgets.Async.Http.KeyValuePair;
        for (i = 0; i < length; i++) {
            pair = jHeaders.get(i);
            
            (<any>http).addHeader(headers, pair.key, pair.value);
        }
    }

    callbacks.resolveCallback({
        content: {
            raw: result.raw,
            toString: () => {
                if (types.isString(result.responseAsString)) {
                    return result.responseAsString;
                } else {
                    throw new Error("Response content may not be converted to string");
                }
            },
            toJSON: () => {
                ensureUtils();
                return utils.parseJSON(result.responseAsString);
            },
            toImage: () => {
                ensureImageSource();

                return new Promise<any>((resolveImage, rejectImage) => {
                    if (result.responseAsImage != null) {
                        resolveImage(imageSource.fromNativeSource(result.responseAsImage));
                    }
                    else {
                        rejectImage(new Error("Response content may not be converted to an Image"));
                    }
                });
            },
            toFile: (destinationFilePath?: string) => {
                var fs: typeof fsModule = require("file-system");
                var fileName = callbacks.url;
                if (!destinationFilePath) {
                    destinationFilePath = fs.path.join(fs.knownFolders.documents().path, fileName.substring(fileName.lastIndexOf('/') + 1));
                }
                var stream: java.io.FileOutputStream;
                try {
                    var javaFile = new java.io.File(destinationFilePath);
                    stream = new java.io.FileOutputStream(javaFile);
                    stream.write(result.raw.toByteArray());
                    return fs.File.fromPath(destinationFilePath);
                }
                catch (exception) {
                    throw new Error(`Cannot save file with path: ${destinationFilePath}.`);
                }
                finally {
                    if (stream) {
                        stream.close();
                    }
                }
            }
        },
        statusCode: result.statusCode,
        headers: headers
    });
}

function buildJavaOptions(options: http.HttpRequestOptions) {
    if (!types.isString(options.url)) {
        throw new Error("Http request must provide a valid url.");
    }

    var javaOptions = new org.nativescript.widgets.Async.Http.RequestOptions();

    javaOptions.url = options.url;

    if (types.isString(options.method)) {
        javaOptions.method = options.method;
    }
    if (types.isString(options.content) || options.content instanceof FormData) {
        javaOptions.content = options.content.toString();
    }
    if (types.isNumber(options.timeout)) {
        javaOptions.timeout = options.timeout;
    }

    if (options.headers) {
        var arrayList = new java.util.ArrayList<org.nativescript.widgets.Async.Http.KeyValuePair>();
        var pair = org.nativescript.widgets.Async.Http.KeyValuePair;

        for (var key in options.headers) {
            arrayList.add(new pair(key, options.headers[key] + ""));
        }

        javaOptions.headers = arrayList;
    }

    ensurePlatform();

    // pass the maximum available image size to the request options in case we need a bitmap conversion
    var screen = platform.screen.mainScreen;
    javaOptions.screenWidth = screen.widthPixels;
    javaOptions.screenHeight = screen.heightPixels;

    return javaOptions;
}

export function request(options: http.HttpRequestOptions): Promise<http.HttpResponse> {
    if (!types.isDefined(options)) {
        // TODO: Shouldn't we throw an error here - defensive programming
        return;
    }
    return new Promise<http.HttpResponse>((resolve, reject) => {

        try {
            // initialize the options
            var javaOptions = buildJavaOptions(options);

            // remember the callbacks so that we can use them when the CompleteCallback is called
            var callbacks = {
                url: options.url,
                resolveCallback: resolve,
                rejectCallback: reject
            };
            pendingRequests[requestIdCounter] = callbacks;

            ensureCompleteCallback();
            //make the actual async call
            org.nativescript.widgets.Async.Http.MakeRequest(javaOptions, completeCallback, new java.lang.Integer(requestIdCounter));

            // increment the id counter
            requestIdCounter++;
        } catch (ex) {
            reject(ex);
        }
    });
}
