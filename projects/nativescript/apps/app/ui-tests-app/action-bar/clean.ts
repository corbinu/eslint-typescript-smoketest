﻿import frame = require("ui/frame");

export function navigate(args) {
    frame.topmost().goBack();
}