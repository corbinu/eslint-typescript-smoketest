﻿import definition = require("ui/animation");
import common = require("./animation-common");
import utils = require("utils/utils");
import color = require("color");
import trace = require("trace");
import types = require("utils/types");
import enums = require("ui/enums");
import styleModule = require("ui/styling/style");
import lazy from "utils/lazy";
import { CacheLayerType } from "utils/utils";
import dependencyObservable = require("ui/core/dependency-observable");

global.moduleMerge(common, exports);

interface AnimationDefinitionInternal extends definition.AnimationDefinition {
    valueSource?: number;
}

let argbEvaluator: android.animation.ArgbEvaluator;
function ensureArgbEvaluator() {
    if (!argbEvaluator) {
        argbEvaluator = new android.animation.ArgbEvaluator();
    }
}

let keyPrefix = "ui.animation.";
let propertyKeys = {};
propertyKeys[common.Properties.backgroundColor] = Symbol(keyPrefix + common.Properties.backgroundColor);
propertyKeys[common.Properties.opacity] = Symbol(keyPrefix + common.Properties.opacity);
propertyKeys[common.Properties.rotate] = Symbol(keyPrefix + common.Properties.rotate);
propertyKeys[common.Properties.scale] = Symbol(keyPrefix + common.Properties.scale);
propertyKeys[common.Properties.translate] = Symbol(keyPrefix + common.Properties.translate);

export class Animation extends common.Animation implements definition.Animation {
    private _animatorListener: android.animation.Animator.AnimatorListener;
    private _nativeAnimatorsArray: any;
    private _animatorSet: android.animation.AnimatorSet;
    private _animators: Array<android.animation.Animator>;
    private _propertyUpdateCallbacks: Array<Function>;
    private _propertyResetCallbacks: Array<Function>;
    private _valueSource: number;

    public play(): definition.AnimationPromise {
        let animationFinishedPromise = super.play();

        this._animators = new Array<android.animation.Animator>();
        this._propertyUpdateCallbacks = new Array<Function>();
        this._propertyResetCallbacks = new Array<Function>();

        for (let i = 0, length = this._propertyAnimations.length; i < length; i++) {
            this._createAnimators(this._propertyAnimations[i]);
        }

        this._nativeAnimatorsArray = (<any>Array).create(android.animation.Animator, this._animators.length);
        for (let i = 0, length = this._animators.length; i < length; i++) {
            this._nativeAnimatorsArray[i] = this._animators[i];
        }

        this._animatorSet = new android.animation.AnimatorSet();
        this._animatorSet.addListener(this._animatorListener);
        if (this._animators.length > 0) {
            if (this._playSequentially) {
                this._animatorSet.playSequentially(this._nativeAnimatorsArray);
            }
            else {
                this._animatorSet.playTogether(this._nativeAnimatorsArray);
            }
        }

        this._enableHardwareAcceleration();

        if (trace.enabled) {
            trace.write("Starting " + this._nativeAnimatorsArray.length + " animations " + (this._playSequentially ? "sequentially." : "together."), trace.categories.Animation);
        }
        this._animatorSet.setupStartValues();
        this._animatorSet.start();
        return animationFinishedPromise;
    }

    public cancel(): void {
        super.cancel();
        if (trace.enabled) {
            trace.write("Cancelling AnimatorSet.", trace.categories.Animation);
        }
        this._animatorSet.cancel();
    }

    constructor(animationDefinitions: Array<AnimationDefinitionInternal>, playSequentially?: boolean) {
        super(animationDefinitions, playSequentially);

        if (animationDefinitions.length > 0 && animationDefinitions[0].valueSource !== undefined) {
            this._valueSource = animationDefinitions[0].valueSource;
        }

        let that = this;
        this._animatorListener = new android.animation.Animator.AnimatorListener({
            onAnimationStart: function (animator: android.animation.Animator): void {
                if (trace.enabled) {
                    trace.write("MainAnimatorListener.onAndroidAnimationStart(" + animator +")", trace.categories.Animation);
                }
            },
            onAnimationRepeat: function (animator: android.animation.Animator): void {
                if (trace.enabled) {
                    trace.write("MainAnimatorListener.onAnimationRepeat(" + animator + ")", trace.categories.Animation);
                }
            },
            onAnimationEnd: function (animator: android.animation.Animator): void {
                if (trace.enabled) {
                    trace.write("MainAnimatorListener.onAnimationEnd(" + animator + ")", trace.categories.Animation);
                }
                that._onAndroidAnimationEnd();
            },
            onAnimationCancel: function (animator: android.animation.Animator): void {
                if (trace.enabled) {
                    trace.write("MainAnimatorListener.onAnimationCancel(" + animator + ")", trace.categories.Animation);
                }
                that._onAndroidAnimationCancel();
            }
        });
    }

    private _onAndroidAnimationEnd() {
        if (!this.isPlaying) {
            // It has been cancelled
            return;
        }

        let i = 0;
        let length = this._propertyUpdateCallbacks.length;
        for (; i < length; i++) {
            this._propertyUpdateCallbacks[i]();
        }
        this._disableHardwareAcceleration();
        this._resolveAnimationFinishedPromise();
    }

    private _onAndroidAnimationCancel() {
        let i = 0;
        let length = this._propertyResetCallbacks.length;
        for (; i < length; i++) {
            this._propertyResetCallbacks[i]();
        }
        this._disableHardwareAcceleration();
        this._rejectAnimationFinishedPromise();
    }

    private _createAnimators(propertyAnimation: common.PropertyAnimation): void {
        if (!propertyAnimation.target._nativeView) {
            return;
        }

        if (trace.enabled) {
            trace.write("Creating ObjectAnimator(s) for animation: " + common.Animation._getAnimationInfo(propertyAnimation) + "...", trace.categories.Animation);
        }

        if (types.isNullOrUndefined(propertyAnimation.target)) {
            throw new Error("Animation target cannot be null or undefined!");
        }

        if (types.isNullOrUndefined(propertyAnimation.property)) {
            throw new Error("Animation property cannot be null or undefined!");
        }

        if (types.isNullOrUndefined(propertyAnimation.value)) {
            throw new Error("Animation value cannot be null or undefined!");
        }

        let nativeArray;
        let nativeView = <android.view.View>propertyAnimation.target._nativeView;
        let animators = new Array<android.animation.Animator>();
        let propertyUpdateCallbacks = new Array<Function>();
        let propertyResetCallbacks = new Array<Function>();
        let originalValue1;
        let originalValue2;
        let density = utils.layout.getDisplayDensity();
        let xyObjectAnimators: any;
        let animatorSet: android.animation.AnimatorSet;

        let key = propertyKeys[propertyAnimation.property];
        if (key) {
            propertyAnimation.target[key] = propertyAnimation;
        }
        function checkAnimation(cb) {
            return () => {
                if (propertyAnimation.target[key] === propertyAnimation) {
                    delete propertyAnimation.target[key];
                    cb();
                }
            }
        }

        let valueSource = this._valueSource !== undefined ? this._valueSource : dependencyObservable.ValueSource.Local;

        switch (propertyAnimation.property) {

            case common.Properties.opacity:
                originalValue1 = nativeView.getAlpha();
                nativeArray = (<any>Array).create("float", 1);
                nativeArray[0] = propertyAnimation.value;
                propertyUpdateCallbacks.push(checkAnimation(() => {
                    propertyAnimation.target.style._setValue(styleModule.opacityProperty, propertyAnimation.value, valueSource);
                }));
                propertyResetCallbacks.push(checkAnimation(() => {
                    propertyAnimation.target.style._setValue(styleModule.opacityProperty, originalValue1, valueSource);
                }));
                animators.push(android.animation.ObjectAnimator.ofFloat(nativeView, "alpha", nativeArray));
                break;

            case common.Properties.backgroundColor:
                ensureArgbEvaluator();
                originalValue1 = propertyAnimation.target.backgroundColor;
                nativeArray = (<any>Array).create(java.lang.Object, 2);
                nativeArray[0] = propertyAnimation.target.backgroundColor ? java.lang.Integer.valueOf((<color.Color>propertyAnimation.target.backgroundColor).argb) : java.lang.Integer.valueOf(-1);
                nativeArray[1] = java.lang.Integer.valueOf((<color.Color>propertyAnimation.value).argb);
                let animator = android.animation.ValueAnimator.ofObject(argbEvaluator, nativeArray);
                animator.addUpdateListener(new android.animation.ValueAnimator.AnimatorUpdateListener({
                    onAnimationUpdate(animator: android.animation.ValueAnimator) {
                        let argb = (<java.lang.Integer>animator.getAnimatedValue()).intValue();
                        propertyAnimation.target.style._setValue(styleModule.backgroundColorProperty, new color.Color(argb), valueSource);
                    }
                }));

                propertyUpdateCallbacks.push(checkAnimation(() => {
                    propertyAnimation.target.style._setValue(styleModule.backgroundColorProperty, propertyAnimation.value, valueSource);
                }));
                propertyResetCallbacks.push(checkAnimation(() => {
                    propertyAnimation.target.style._setValue(styleModule.backgroundColorProperty, originalValue1, valueSource);
                }));
                animators.push(animator);
                break;

            case common.Properties.translate:
                xyObjectAnimators = (<any>Array).create(android.animation.Animator, 2);

                nativeArray = (<any>Array).create("float", 1);
                nativeArray[0] = propertyAnimation.value.x * density;
                xyObjectAnimators[0] = android.animation.ObjectAnimator.ofFloat(nativeView, "translationX", nativeArray);
                xyObjectAnimators[0].setRepeatCount(Animation._getAndroidRepeatCount(propertyAnimation.iterations));

                nativeArray = (<any>Array).create("float", 1);
                nativeArray[0] = propertyAnimation.value.y * density;
                xyObjectAnimators[1] = android.animation.ObjectAnimator.ofFloat(nativeView, "translationY", nativeArray);
                xyObjectAnimators[1].setRepeatCount(Animation._getAndroidRepeatCount(propertyAnimation.iterations));

                originalValue1 = nativeView.getTranslationX();
                originalValue2 = nativeView.getTranslationY();

                propertyUpdateCallbacks.push(checkAnimation(() => {
                    propertyAnimation.target.style._setValue(styleModule.translateXProperty, propertyAnimation.value.x, valueSource);
                    propertyAnimation.target.style._setValue(styleModule.translateYProperty, propertyAnimation.value.y, valueSource);
                }));

                propertyResetCallbacks.push(checkAnimation(() => {
                    propertyAnimation.target.style._setValue(styleModule.translateXProperty, originalValue1, valueSource);
                    propertyAnimation.target.style._setValue(styleModule.translateYProperty, originalValue2, valueSource);
                }));

                animatorSet = new android.animation.AnimatorSet();
                animatorSet.playTogether(xyObjectAnimators);
                animatorSet.setupStartValues();
                animators.push(animatorSet);
                break;

            case common.Properties.scale:
                xyObjectAnimators = (<any>Array).create(android.animation.Animator, 2);

                nativeArray = (<any>Array).create("float", 1);
                nativeArray[0] = propertyAnimation.value.x;
                xyObjectAnimators[0] = android.animation.ObjectAnimator.ofFloat(nativeView, "scaleX", nativeArray);
                xyObjectAnimators[0].setRepeatCount(Animation._getAndroidRepeatCount(propertyAnimation.iterations));

                nativeArray = (<any>Array).create("float", 1);
                nativeArray[0] = propertyAnimation.value.y;
                xyObjectAnimators[1] = android.animation.ObjectAnimator.ofFloat(nativeView, "scaleY", nativeArray);
                xyObjectAnimators[1].setRepeatCount(Animation._getAndroidRepeatCount(propertyAnimation.iterations));

                originalValue1 = nativeView.getScaleX();
                originalValue2 = nativeView.getScaleY();

                propertyUpdateCallbacks.push(checkAnimation(() => {
                    propertyAnimation.target.style._setValue(styleModule.scaleXProperty, propertyAnimation.value.x, valueSource);
                    propertyAnimation.target.style._setValue(styleModule.scaleYProperty, propertyAnimation.value.y, valueSource);
                }));

                propertyResetCallbacks.push(checkAnimation(() => {
                    propertyAnimation.target.style._setValue(styleModule.scaleXProperty, originalValue1, valueSource);
                    propertyAnimation.target.style._setValue(styleModule.scaleYProperty, originalValue2, valueSource);
                }));

                animatorSet = new android.animation.AnimatorSet();
                animatorSet.playTogether(xyObjectAnimators);
                animatorSet.setupStartValues();
                animators.push(animatorSet);
                break;

            case common.Properties.rotate:
                originalValue1 = nativeView.getRotation();
                nativeArray = (<any>Array).create("float", 1);
                nativeArray[0] = propertyAnimation.value;
                propertyUpdateCallbacks.push(checkAnimation(() => {
                    propertyAnimation.target.style._setValue(styleModule.rotateProperty, propertyAnimation.value, valueSource);
                }));
                propertyResetCallbacks.push(checkAnimation(() => {
                    propertyAnimation.target.style._setValue(styleModule.rotateProperty, originalValue1, valueSource);
                }));
                animators.push(android.animation.ObjectAnimator.ofFloat(nativeView, "rotation", nativeArray));
                break;

            default:
                throw new Error("Cannot animate " + propertyAnimation.property);
        }

        let i = 0;
        let length = animators.length;
        for (; i < length; i++) {

            // Duration
            if (propertyAnimation.duration !== undefined) {
                animators[i].setDuration(propertyAnimation.duration);
            }

            // Delay
            if (propertyAnimation.delay !== undefined) {
                animators[i].setStartDelay(propertyAnimation.delay);
            }

            // Repeat Count
            if (propertyAnimation.iterations !== undefined && animators[i] instanceof android.animation.ValueAnimator) {
                (<android.animation.ValueAnimator>animators[i]).setRepeatCount(Animation._getAndroidRepeatCount(propertyAnimation.iterations));
            }

            // Interpolator
            if (propertyAnimation.curve !== undefined) {
                animators[i].setInterpolator(propertyAnimation.curve);
            }

            if (trace.enabled) {
                trace.write("Animator created: " + animators[i], trace.categories.Animation);
            }
        }

        this._animators = this._animators.concat(animators);
        this._propertyUpdateCallbacks = this._propertyUpdateCallbacks.concat(propertyUpdateCallbacks);
        this._propertyResetCallbacks = this._propertyResetCallbacks.concat(propertyResetCallbacks);
    }

    private static _getAndroidRepeatCount(iterations: number): number {
        return (iterations === Number.POSITIVE_INFINITY) ? android.view.animation.Animation.INFINITE : iterations - 1;
    }

    private _enableHardwareAcceleration() {
        for (let i = 0, length = this._propertyAnimations.length; i < length; i++) {
            let cache = <CacheLayerType>this._propertyAnimations[i].target._nativeView;
            if (cache){
                let layerType = cache.getLayerType();
                if (layerType !== android.view.View.LAYER_TYPE_HARDWARE) {
                    cache.layerType = layerType;
                    cache.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null);
                }
            }
        }
    }

    private _disableHardwareAcceleration() {
        for (let i = 0, length = this._propertyAnimations.length; i < length; i++) {
            let cache = <CacheLayerType>this._propertyAnimations[i].target._nativeView;
            if (cache && cache.layerType !== undefined) {
                cache.setLayerType(cache.layerType, null);
                cache.layerType = undefined;
            }
        }
    }
}

let easeIn = lazy(() => new android.view.animation.AccelerateInterpolator(1));
let easeOut = lazy(() => new android.view.animation.DecelerateInterpolator(1));
let easeInOut = lazy(() => new android.view.animation.AccelerateDecelerateInterpolator());
let linear = lazy(() => new android.view.animation.LinearInterpolator());
let bounce = lazy(() => new android.view.animation.BounceInterpolator());
export function _resolveAnimationCurve(curve: any): any {
    switch (curve) {
        case enums.AnimationCurve.easeIn:
            if (trace.enabled) {
                trace.write("Animation curve resolved to android.view.animation.AccelerateInterpolator(1).", trace.categories.Animation);
            }
            return easeIn();
        case enums.AnimationCurve.easeOut:
            if (trace.enabled) {
                trace.write("Animation curve resolved to android.view.animation.DecelerateInterpolator(1).", trace.categories.Animation);
            }
            return easeOut();
        case enums.AnimationCurve.easeInOut:
            if (trace.enabled) {
                trace.write("Animation curve resolved to android.view.animation.AccelerateDecelerateInterpolator().", trace.categories.Animation);
            }
            return easeInOut();
        case enums.AnimationCurve.linear:
            if (trace.enabled) {
                trace.write("Animation curve resolved to android.view.animation.LinearInterpolator().", trace.categories.Animation);
            }
            return linear();
        case enums.AnimationCurve.spring:
            if (trace.enabled) {
                trace.write("Animation curve resolved to android.view.animation.BounceInterpolator().", trace.categories.Animation);
            }
            return bounce();
        case enums.AnimationCurve.ease:
            return (<any>android).support.v4.view.animation.PathInterpolatorCompat.create(0.25, 0.1, 0.25, 1.0);
        default:
            if (trace.enabled) {
                trace.write("Animation curve resolved to original: " + curve, trace.categories.Animation);
            }
            if (curve instanceof common.CubicBezierAnimationCurve) {
                let animationCurve = <common.CubicBezierAnimationCurve>curve;
                let interpolator = (<any>android).support.v4.view.animation.PathInterpolatorCompat.create(animationCurve.x1, animationCurve.y1, animationCurve.x2, animationCurve.y2);
                return interpolator;
            }
            return curve;
    }
} 