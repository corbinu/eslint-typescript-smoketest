﻿import enums = require("ui/enums");
import color = require("color");
import types = require("utils/types");

export function colorConverter(value: string): color.Color {
    return new color.Color(value);
}

export function floatConverter(value: string): number {
    // TODO: parse different unit types
    var result: number = parseFloat(value);
    return result;
}

export function fontSizeConverter(value: string): number {
    return floatConverter(value);
}

export function textAlignConverter(value: string): string {
    switch (value) {
        case enums.TextAlignment.left:
        case enums.TextAlignment.center:
        case enums.TextAlignment.right:
            return value;
        default:
            throw new Error("CSS text-align \"" + value + "\" is not supported.");
    }
}

export function textDecorationConverter(value: string): string {
    var values = (value + "").split(" ");

    if (values.indexOf(enums.TextDecoration.none) !== -1 || values.indexOf(enums.TextDecoration.underline) !== -1 || values.indexOf(enums.TextDecoration.lineThrough) !== -1) {
        return value;
    } else {
        throw new Error("CSS text-decoration \"" + value + "\" is not supported.");
    }
}

export function whiteSpaceConverter(value: string): string {
    switch (value) {
        case enums.WhiteSpace.normal:
        case enums.WhiteSpace.nowrap:
            return value;
        default:
            throw new Error("CSS white-space \"" + value + "\" is not supported.");
    }
}

export function textTransformConverter(value: string): string {
    switch (value) {
        case enums.TextTransform.none:
        case enums.TextTransform.uppercase:
        case enums.TextTransform.lowercase:
        case enums.TextTransform.capitalize:
            return value;
        default:
            throw new Error("CSS text-transform \"" + value + "\" is not supported.");
    }
}

export var numberConverter = parseFloat;

export function visibilityConverter(value: string): string {
    if (value.toLowerCase() === enums.Visibility.collapsed) {
        return enums.Visibility.collapsed;
    } else if (value.toLowerCase() === enums.Visibility.collapse) {
        return enums.Visibility.collapse;
    }
    return enums.Visibility.visible;
}

export function opacityConverter(value: string): number {
    var result = parseFloat(value);
    result = Math.max(0.0, result);
    result = Math.min(1.0, result);

    return result;
}

export function timeConverter(value: string): number {
    var result = parseFloat(value);
    if (value.indexOf("ms") === -1) {
        result = result*1000;
    }
    result = Math.max(0.0, result);

    return result;
}

export function bezieArgumentConverter(value: string): number {
    var result = parseFloat(value);
    result = Math.max(0.0, result);
    result = Math.min(1.0, result);

    return result;
}

export function animationTimingFunctionConverter(value: string): Object {
    let result: Object = enums.AnimationCurve.ease;
    switch (value) {
        case "ease":
            result = enums.AnimationCurve.ease;
            break;
        case "linear":
            result = enums.AnimationCurve.linear;
            break;
        case "ease-in":
            result = enums.AnimationCurve.easeIn;
            break;
        case "ease-out":
            result = enums.AnimationCurve.easeOut;
            break;
        case "ease-in-out":
            result = enums.AnimationCurve.easeInOut;
            break;
        case "spring":
            result = enums.AnimationCurve.spring;
            break;
        default:
            if (value.indexOf("cubic-bezier(") === 0) {
                let bezierArr = value.substring(13).split(/[,]+/);
                if (bezierArr.length !== 4) {
                    throw new Error("Invalid value for animation: " + value);
                }
                result = enums.AnimationCurve.cubicBezier(bezieArgumentConverter(bezierArr[0]),
                    bezieArgumentConverter(bezierArr[1]),
                    bezieArgumentConverter(bezierArr[2]),
                    bezieArgumentConverter(bezierArr[3]));
            }
            else {
                throw new Error("Invalid value for animation: " + value);
            }
            break;
    }

    return result;
}

export function transformConverter(value: any): Object {
    if (value === "none") {
        let operations = {};
        operations[value] = value;
        return operations;
    }
    else if (types.isString(value)) {
        let operations = {};
        let operator = "";
        let pos = 0;
        while (pos < value.length) {
            if (value[pos] === " " || value[pos] === ",") {
                pos ++;
            }
            else if (value[pos] === "(") {
                let start = pos + 1;
                while (pos < value.length && value[pos] !== ")") {
                    pos ++;
                }
                let operand = value.substring(start, pos);
                operations[operator] = operand.trim();
                operator = "";
                pos ++;
            }
            else {
                operator += value[pos ++];
            }
        }
        return operations;
    }
    else {
        return undefined;
    }
}