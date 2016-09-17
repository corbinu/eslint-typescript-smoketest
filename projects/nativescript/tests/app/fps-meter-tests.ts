﻿// >> fps-meter-require
import fpsMeter = require("fps-meter");
// << fps-meter-require

export var test_DummyTestForSnippetOnly0 = function () {
    // >> fps-meter-logging
    var callbackId = fpsMeter.addCallback(function (fps: number, minFps: number) {
        console.info("fps=" + fps + " minFps=" + minFps);
    });
    fpsMeter.start();
    ////...
    fpsMeter.removeCallback(callbackId);
    fpsMeter.stop();
    // << fps-meter-logging
}