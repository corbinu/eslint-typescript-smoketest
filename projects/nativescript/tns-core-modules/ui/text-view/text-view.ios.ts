﻿import common = require("./text-view-common");
import {PropertyChangeData} from "ui/core/dependency-observable";
import {TextBase} from "ui/text-base";
import {UpdateTextTrigger} from "ui/enums";
import {View} from "ui/core/view";
import * as style from "ui/styling/style";
import {isNullOrUndefined} from "utils/types";

import * as utils from "utils/utils";

global.moduleMerge(common, exports);

class UITextViewDelegateImpl extends NSObject implements UITextViewDelegate {
    public static ObjCProtocols = [UITextViewDelegate];

    private _owner: WeakRef<TextView>;

    public static initWithOwner(owner: WeakRef<TextView>): UITextViewDelegateImpl {
        let impl = <UITextViewDelegateImpl>UITextViewDelegateImpl.new();
        impl._owner = owner;
        return impl;
    }

    public textViewShouldBeginEditing(textView: UITextView): boolean {
        let owner = this._owner.get();
        if (owner) {
            owner._hideHint();
        }
        
        return true;
    }
    
    public textViewDidEndEditing(textView: UITextView) {
        let owner = this._owner.get();
        if (owner) {
            if (owner.updateTextTrigger === UpdateTextTrigger.focusLost) {
                owner._onPropertyChangedFromNative(TextBase.textProperty, textView.text);
            }

            owner.dismissSoftInput();
            owner._refreshHintState(owner.hint, textView.text);

            if (owner.formattedText) {
                owner.formattedText.createFormattedStringCore();
                 
            }
            
            //RemoveThisDoubleCall
            owner.style._updateTextDecoration();
            owner.style._updateTextTransform();
        }
    }

    public textViewDidChange(textView: UITextView) {
        let owner = this._owner.get();
        if (owner) {
            if (owner.updateTextTrigger === UpdateTextTrigger.textChanged) {
                owner._onPropertyChangedFromNative(TextBase.textProperty, textView.text);
            }
        }        
    }

    public textViewShouldChangeTextInRangeReplacementText(textView: UITextView, range: NSRange, replacementString: string): boolean {
        let owner = this._owner.get();
        if (owner && owner.formattedText) {
            owner.formattedText._updateCharactersInRangeReplacementString(range.location, range.length, replacementString);
        }

        return true;
    }
}

export class TextView extends common.TextView {
    private _ios: UITextView;
    private _delegate: UITextViewDelegateImpl;

    constructor() {
        super();

        this._ios = UITextView.new();
        if (!this._ios.font) {
            this._ios.font = UIFont.systemFontOfSize(12);
        }
        this._delegate = UITextViewDelegateImpl.initWithOwner(new WeakRef(this));
    }

    public onLoaded() {
        super.onLoaded();
        this._ios.delegate = this._delegate;
    }

    public onUnloaded() {
        this._ios.delegate = null;
        super.onUnloaded();
    }

    get ios(): UITextView {
        return this._ios;
    }

    public _onEditablePropertyChanged(data: PropertyChangeData) {
        this._ios.editable = data.newValue;
    }

    public _onHintPropertyChanged(data: PropertyChangeData) {
        this._refreshHintState(data.newValue, this.text);
    }

    public _onTextPropertyChanged(data: PropertyChangeData) {
        super._onTextPropertyChanged(data);
        this._refreshHintState(this.hint, data.newValue);
    }

    public _refreshHintState(hint: string, text: string) {
        if (hint && !text) {
            this._showHint(hint);
        }
        else {
            this._hideHint();
        }
    }

    public _showHint(hint: string) {
        this.ios.textColor = this.ios.textColor ? this.ios.textColor.colorWithAlphaComponent(0.22) : utils.ios.getter(UIColor, UIColor.blackColor).colorWithAlphaComponent(0.22);
        this.ios.text = isNullOrUndefined(hint) ? "" : hint + "";
        (<any>this.ios).isShowingHint = true;
    }

    public _hideHint() {
        this.ios.textColor = this.color ? this.color.ios : null;
        this.ios.text = isNullOrUndefined(this.text) ? "" : this.text + "";
        (<any>this.ios).isShowingHint = false;
    }
} 

export class TextViewStyler implements style.Styler {
    // Color methods
    private static setColorProperty(v: View, newValue: any) {
        var textView: UITextView = <UITextView>v._nativeView;
        TextViewStyler._setTextViewColor(textView, newValue);
    }

    private static resetColorProperty(v: View, nativeValue: any) {
        var textView: UITextView = <UITextView>v._nativeView;
        TextViewStyler._setTextViewColor(textView, nativeValue);
    }

    private static _setTextViewColor(textView: UITextView, newValue: any) {
        var color: UIColor = <UIColor>newValue;
        if ((<any>textView).isShowingHint && color) {
            textView.textColor = (<UIColor>color).colorWithAlphaComponent(0.22);
        }
        else {
            textView.textColor = color;
            textView.tintColor = color;
        }
    }

    private static getNativeColorValue(v: View): any {
        var textView: UITextView = <UITextView>v._nativeView;
        if ((<any>textView).isShowingHint && textView.textColor) {
            return textView.textColor.colorWithAlphaComponent(1);
        }
        else {
            return textView.textColor;
        }
    }

    // Padding
    private static setPaddingProperty(view: View, newValue: any) {
        var top = newValue.top + view.borderWidth;
        var left = newValue.left + view.borderWidth;
        var bottom = newValue.bottom + view.borderWidth;
        var right = newValue.right + view.borderWidth;
        (<UITextView>view._nativeView).textContainerInset = UIEdgeInsetsFromString(`{${top},${left},${bottom},${right}}`);
    }

    private static resetPaddingProperty(view: View, nativeValue: any) {
        (<UITextView>view._nativeView).textContainerInset = UIEdgeInsetsFromString("{0,0,0,0}");
    }

    public static registerHandlers() {
        style.registerHandler(style.colorProperty, new style.StylePropertyChangedHandler(
            TextViewStyler.setColorProperty,
            TextViewStyler.resetColorProperty,
            TextViewStyler.getNativeColorValue), "TextView");

        style.registerHandler(style.nativePaddingsProperty, new style.StylePropertyChangedHandler(
            TextViewStyler.setPaddingProperty,
            TextViewStyler.resetPaddingProperty), "TextView");
    }
}

TextViewStyler.registerHandlers();
