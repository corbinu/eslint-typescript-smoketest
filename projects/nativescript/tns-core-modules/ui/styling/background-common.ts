import imageSource = require("image-source");
import colorModule = require("color");
import enums = require("ui/enums");
import definition = require("ui/styling/background");
import cssValue = require("css-value");
import utils = require("utils/utils");

import * as typesModule from "utils/types";
var types: typeof typesModule;
function ensureTypes() {
    if (!types) {
        types = require("utils/types");
    }
}

interface CSSValue {
    type: string;
    string: string;
    unit?: string;
    value?: number;
}

export class Background implements definition.Background {
    public static default = new Background();
    
    public color: colorModule.Color;
    public image: imageSource.ImageSource;
    public repeat: string;
    public position: string;
    public size: string;
    public borderTopColor: colorModule.Color;
    public borderRightColor: colorModule.Color;
    public borderBottomColor: colorModule.Color;
    public borderLeftColor: colorModule.Color;
    public borderTopWidth: number = 0;
    public borderRightWidth: number = 0;
    public borderBottomWidth: number = 0;
    public borderLeftWidth: number = 0;
    public borderTopLeftRadius: number = 0;
    public borderTopRightRadius: number = 0;
    public borderBottomLeftRadius: number = 0;
    public borderBottomRightRadius: number = 0;
    public clipPath: string;

    private clone(): Background{
        let clone = new Background();
        
        clone.color = this.color;
        clone.image = this.image;
        clone.repeat = this.repeat;
        clone.position = this.position;
        clone.size = this.size;
        clone.borderTopColor = this.borderTopColor;
        clone.borderRightColor = this.borderRightColor;
        clone.borderBottomColor = this.borderBottomColor;
        clone.borderLeftColor = this.borderLeftColor;
        clone.borderTopWidth = this.borderTopWidth;
        clone.borderRightWidth = this.borderRightWidth;
        clone.borderBottomWidth = this.borderBottomWidth;
        clone.borderLeftWidth = this.borderLeftWidth;
        clone.borderTopLeftRadius = this.borderTopLeftRadius;
        clone.borderTopRightRadius = this.borderTopRightRadius;
        clone.borderBottomRightRadius = this.borderBottomRightRadius;
        clone.borderBottomLeftRadius = this.borderBottomLeftRadius;
        clone.clipPath = this.clipPath;
        
        return clone;        
    }

    public withColor(value: colorModule.Color): Background {
        let clone = this.clone();
        clone.color = value;
        return clone;
    }

    public withImage(value: imageSource.ImageSource): Background {
        let clone = this.clone();
        clone.image = value;
        return clone;
    }

    public withRepeat(value: string): Background {
        let clone = this.clone();
        clone.repeat = value;
        return clone;
    }

    public withPosition(value: string): Background {
        let clone = this.clone();
        clone.position = value;
        return clone;
    }

    public withSize(value: string): Background {
        let clone = this.clone();
        clone.size = value;
        return clone;
    }
    
    public withBorderTopColor(value: colorModule.Color): Background {
        let clone = this.clone();
        clone.borderTopColor = value;
        return clone;
    }
    
    public withBorderRightColor(value: colorModule.Color): Background {
        let clone = this.clone();
        clone.borderRightColor = value;
        return clone;
    }
    
    public withBorderBottomColor(value: colorModule.Color): Background {
        let clone = this.clone();
        clone.borderBottomColor = value;
        return clone;
    }
    
    public withBorderLeftColor(value: colorModule.Color): Background {
        let clone = this.clone();
        clone.borderLeftColor = value;
        return clone;
    }

    public withBorderTopWidth(value: number): Background {
        let clone = this.clone();
        clone.borderTopWidth = value;
        return clone;
    }

    public withBorderRightWidth(value: number): Background {
        let clone = this.clone();
        clone.borderRightWidth = value;
        return clone;
    }

    public withBorderBottomWidth(value: number): Background {
        let clone = this.clone();
        clone.borderBottomWidth = value;
        return clone;
    }

    public withBorderLeftWidth(value: number): Background {
        let clone = this.clone();
        clone.borderLeftWidth = value;
        return clone;
    }

    public withBorderTopLeftRadius(value: number): Background {
        let clone = this.clone();
        clone.borderTopLeftRadius = value;
        return clone;
    }

    public withBorderTopRightRadius(value: number): Background {
        let clone = this.clone();
        clone.borderTopRightRadius = value;
        return clone;
    }

    public withBorderBottomRightRadius(value: number): Background {
        let clone = this.clone();
        clone.borderBottomRightRadius = value;
        return clone;
    }

    public withBorderBottomLeftRadius(value: number): Background {
        let clone = this.clone();
        clone.borderBottomLeftRadius = value;
        return clone;
    }

    public withClipPath(value: string): Background {
        let clone = this.clone();
        clone.clipPath = value;
        return clone;
    }

    public getDrawParams(width: number, height: number): definition.BackgroundDrawParams {
        if (!this.image) {
            return null;
        }

        var res: definition.BackgroundDrawParams = {
            repeatX: true,
            repeatY: true,
            posX: 0,
            posY: 0,
        }

        // repeat
        if (this.repeat) {
            switch (this.repeat.toLowerCase()) {
                case enums.BackgroundRepeat.noRepeat:
                    res.repeatX = false;
                    res.repeatY = false;
                    break;

                case enums.BackgroundRepeat.repeatX:
                    res.repeatY = false;
                    break;

                case enums.BackgroundRepeat.repeatY:
                    res.repeatX = false;
                    break;
            }
        }

        var imageWidth = this.image.width;
        var imageHeight = this.image.height;

        // size
        if (this.size) {
            let values = cssValue(this.size);

            if (values.length === 2) {
                let vx = values[0];
                let vy = values[1];
                if (vx.unit === "%" && vy.unit === "%") {
                    imageWidth = width * vx.value / 100;
                    imageHeight = height * vy.value / 100;

                    res.sizeX = imageWidth;
                    res.sizeY = imageHeight;
                }
                else if (vx.type === "number" && vy.type === "number" &&
                    ((vx.unit === "px" && vy.unit === "px") || (vx.unit === "" && vy.unit === ""))) {
                    imageWidth = vx.value;
                    imageHeight = vy.value;

                    res.sizeX = imageWidth;
                    res.sizeY = imageHeight;
                }
            }
            else if (values.length === 1 && values[0].type === "ident") {
                let scale = 0;

                if (values[0].string === "cover") {
                    scale = Math.max(width / imageWidth, height / imageHeight);
                }
                else if (values[0].string === "contain") {
                    scale = Math.min(width / imageWidth, height / imageHeight);
                }

                if (scale > 0) {
                    imageWidth *= scale;
                    imageHeight *= scale;

                    res.sizeX = imageWidth;
                    res.sizeY = imageHeight;
                }
            }
        }

        // position
        if (this.position) {
            let v = Background.parsePosition(this.position);
            if (v) {
                let spaceX = width - imageWidth;
                let spaceY = height - imageHeight;

                if (v.x.unit === "%" && v.y.unit === "%") {
                    res.posX = spaceX * v.x.value / 100;
                    res.posY = spaceY * v.y.value / 100;
                }
                else if (v.x.type === "number" && v.y.type === "number" &&
                    ((v.x.unit === "px" && v.y.unit === "px") || (v.x.unit === "" && v.y.unit === ""))) {
                    res.posX = v.x.value;
                    res.posY = v.y.value;
                }
                else if (v.x.type === "ident" && v.y.type === "ident") {
                    if (v.x.string.toLowerCase() === "center") {
                        res.posX = spaceX / 2;
                    }
                    else if (v.x.string.toLowerCase() === "right") {
                        res.posX = spaceX;
                    }

                    if (v.y.string.toLowerCase() === "center") {
                        res.posY = spaceY / 2;
                    }
                    else if (v.y.string.toLowerCase() === "bottom") {
                        res.posY = spaceY;
                    }
                }
            }
        }

        return res;
    }

    private static parsePosition(pos: string): { x: CSSValue, y: CSSValue } {
        let values = cssValue(pos);

        if (values.length === 2) {
            return {
                x: values[0],
                y: values[1]
            };
        }

        if (values.length === 1 && values[0].type === "ident") {
            let val = values[0].string.toLocaleLowerCase();
            let center = {
                type: "ident",
                string: "center"
            };
            
            // If you only one keyword is specified, the other value is "center"
            if (val === "left" || val === "right") {
                return {
                    x: values[0],
                    y: center
                };
            }

            else if (val === "top" || val === "bottom") {
                return {
                    x: center,
                    y: values[0]
                };
            }

            else if (val === "center") {
                return {
                    x: center,
                    y: center
                };
            }
        }

        return null;
    };

    public isEmpty(): boolean {
        ensureTypes();

        return types.isNullOrUndefined(this.color)
            && types.isNullOrUndefined(this.image) 
            && !this.hasBorderWidth()
            && !this.hasBorderRadius()
            && !this.clipPath;
    }

    public static equals(value1: Background, value2: Background): boolean {
        // both values are falsy
        if (!value1 && !value2) {
            return true;
        }

        // only one is falsy
        if (!value1 || !value2) {
            return false;
        }

        return colorModule.Color.equals(value1.color, value2.color)
            && value1.image === value2.image 
            && value1.position === value2.position 
            && value1.repeat === value2.repeat 
            && value1.size === value2.size 
            && colorModule.Color.equals(value1.borderTopColor, value2.borderTopColor) 
            && colorModule.Color.equals(value1.borderRightColor, value2.borderRightColor) 
            && colorModule.Color.equals(value1.borderBottomColor, value2.borderBottomColor) 
            && colorModule.Color.equals(value1.borderLeftColor, value2.borderLeftColor) 
            && value1.borderTopWidth === value2.borderTopWidth
            && value1.borderRightWidth === value2.borderRightWidth
            && value1.borderBottomWidth === value2.borderBottomWidth
            && value1.borderLeftWidth === value2.borderLeftWidth
            && value1.borderTopLeftRadius === value2.borderTopLeftRadius
            && value1.borderTopRightRadius === value2.borderTopRightRadius
            && value1.borderBottomRightRadius === value2.borderBottomRightRadius
            && value1.borderBottomLeftRadius === value2.borderBottomLeftRadius
            && value1.clipPath === value2.clipPath;
    }

    public hasBorderColor(): boolean {
        return !types.isNullOrUndefined(this.borderTopColor) 
            || !types.isNullOrUndefined(this.borderRightColor) 
            || !types.isNullOrUndefined(this.borderBottomColor) 
            || !types.isNullOrUndefined(this.borderLeftColor);
    }

    public hasBorderWidth(): boolean {
        return this.borderTopWidth > 0 
            || this.borderRightWidth > 0 
            || this.borderBottomWidth > 0 
            || this.borderLeftWidth > 0
    }
    
    public hasBorderRadius(): boolean {
        return this.borderTopLeftRadius > 0 
            || this.borderTopRightRadius > 0 
            || this.borderBottomRightRadius > 0 
            || this.borderBottomLeftRadius > 0
    }

    public hasUniformBorderColor(): boolean {
        return colorModule.Color.equals(this.borderTopColor, this.borderRightColor) 
            && colorModule.Color.equals(this.borderTopColor, this.borderBottomColor)
            && colorModule.Color.equals(this.borderTopColor, this.borderLeftColor); 
    }
    
    public hasUniformBorderWidth(): boolean {
        return this.borderTopWidth === this.borderRightWidth 
            && this.borderTopWidth === this.borderBottomWidth
            && this.borderTopWidth === this.borderLeftWidth;
    }
    
    public hasUniformBorderRadius(): boolean {
        return this.borderTopLeftRadius === this.borderTopRightRadius 
            && this.borderTopLeftRadius === this.borderBottomRightRadius
            && this.borderTopLeftRadius === this.borderBottomLeftRadius;
    }
    
    public hasUniformBorder(): boolean {
        return this.hasUniformBorderColor() 
            && this.hasUniformBorderWidth() 
            && this.hasUniformBorderRadius();
    }
    
    public getUniformBorderColor(): colorModule.Color {
        if (this.hasUniformBorderColor()){
            return this.borderTopColor;
        }
        return undefined;
    };

    public getUniformBorderWidth(): number {
        if (this.hasUniformBorderWidth()){
            return this.borderTopWidth;
        }
        return 0;
    };

    public getUniformBorderRadius(): number {
        if (this.hasUniformBorderRadius()){
            return this.borderTopLeftRadius;
        }
        return 0;
    };

    public toString(): string {
        return `isEmpty: ${this.isEmpty()}; color: ${this.color}; image: ${this.image}; repeat: ${this.repeat}; position: ${this.position}; size: ${this.size}; borderTopColor: ${this.borderTopColor}; borderRightColor: ${this.borderRightColor}; borderBottomColor: ${this.borderBottomColor}; borderLeftColor: ${this.borderLeftColor}; borderTopWidth: ${this.borderTopWidth}; borderRightWidth: ${this.borderRightWidth}; borderBottomWidth: ${this.borderBottomWidth}; borderLeftWidth: ${this.borderLeftWidth}; borderTopLeftRadius: ${this.borderTopLeftRadius}; borderTopRightRadius: ${this.borderTopRightRadius}; borderBottomRightRadius: ${this.borderBottomRightRadius}; borderBottomLeftRadius: ${this.borderBottomLeftRadius}; clipPath: ${this.clipPath};`;
    }
}

export function cssValueToDevicePixels(source: string, total: number): number {
    var result;
    source = source.trim();

    if (source.indexOf("px") !== -1) {
        result = parseFloat(source.replace("px", ""));
    }
    else if (source.indexOf("%") !== -1 && total > 0) {
        result = (parseFloat(source.replace("%", "")) / 100) * utils.layout.toDeviceIndependentPixels(total);
    } else {
        result = parseFloat(source);
    }
    return utils.layout.toDevicePixels(result);
}