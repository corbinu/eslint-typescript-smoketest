import definition = require("ui/animation/keyframe-animation");
import animationModule = require("ui/animation");
import view = require("ui/core/view");
import enums = require("ui/enums");
import style = require("ui/styling/style");

export class KeyframeDeclaration implements definition.KeyframeDeclaration {
    public property: string;
    public value: any;
}

export class KeyframeInfo implements definition.KeyframeInfo {
    public duration: number;
    public curve: any;
    public declarations: Array<KeyframeDeclaration>;
}

export class KeyframeAnimationInfo implements definition.KeyframeAnimationInfo {
    public name: string = "";
    public duration: number = 0.3;
    public delay: number = 0;
    public iterations: number = 1;
    public curve: any = enums.AnimationCurve.ease;
    public isForwards: boolean = false;
    public isReverse: boolean = false;
    public keyframes: Array<KeyframeInfo>;
}

export class KeyframeAnimation {
    public animations: Array<Object>;
    public delay: number = 0;
    public iterations: number = 1;

    private _resolve;
    private _reject;
    private _isPlaying: boolean;
    private _isForwards: boolean;
    private _nativeAnimations: Array<animationModule.Animation>;
    private _target: view.View;

    public static keyframeAnimationFromInfo(info: KeyframeAnimationInfo, valueSourceModifier: number) {
        let animations = new Array<Object>();
        let length = info.keyframes.length;
        let startDuration = 0;
        if (info.isReverse) {
            for (let index = length - 1; index >= 0; index --) {
                let keyframe = info.keyframes[index];
                startDuration = KeyframeAnimation.parseKeyframe(info, keyframe, animations, startDuration, valueSourceModifier);
            }
        }
        else {
            for (let index = 0; index < length; index ++) {
                let keyframe = info.keyframes[index];
                startDuration = KeyframeAnimation.parseKeyframe(info, keyframe, animations, startDuration, valueSourceModifier);
            }
            for (let index = length - 1; index > 0; index --) {
                let a1 = animations[index];
                let a2 = animations[index - 1];
                if (a2["curve"] !== undefined) {
                    a1["curve"] = a2["curve"];
                    a2["curve"] = undefined;
                }
            }
        }
        for (let index = 1; index < length; index++) {
            let a = animations[index];
            if (a["curve"] === undefined) {
                a["curve"] = info.curve;
            }
        }
        let animation: KeyframeAnimation = new KeyframeAnimation();
        animation.delay = info.delay;
        animation.iterations = info.iterations;
        animation.animations = animations;
        animation._isForwards = info.isForwards;
        return animation;
    }

    private static parseKeyframe(info: KeyframeAnimationInfo, keyframe: KeyframeInfo, animations: Array<Object>, startDuration: number, valueSourceModifier: number): number {
        let animation = {};
        for (let declaration of keyframe.declarations) {
            animation[declaration.property] = declaration.value;
        }
        let duration = keyframe.duration;
        if (duration === 0) {
            duration = 0.01;
        }
        else {
            duration = (info.duration * duration) - startDuration;
            startDuration += duration;
        }
        animation["duration"] = info.isReverse ? info.duration - duration : duration;
        animation["curve"] = keyframe.curve;
        animation["forceLayer"] = true;
        animation["valueSource"] = valueSourceModifier;
        animations.push(animation);
        return startDuration;
    }

    public get isPlaying(): boolean {
        return this._isPlaying;
    }

    public cancel() {
        if (this._isPlaying) {
            this._isPlaying = false;
            for (let i = this._nativeAnimations.length - 1; i >= 0; i--) {
                let animation = this._nativeAnimations[i];
                if (animation.isPlaying) {
                    animation.cancel();
                }
            }
            if (this._nativeAnimations.length > 0) {
                let animation = this._nativeAnimations[0];
                this._resetAnimationValues(this._target, animation);
            }
            this._rejectAnimationFinishedPromise();
        }
    }

    public play(view: view.View): Promise<void> {
        if (this._isPlaying) {
            throw new Error("Animation is already playing.");
        }

        let animationFinishedPromise = new Promise<void>((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });

        this._isPlaying = true;
        this._nativeAnimations = new Array<animationModule.Animation>();
        this._target = view;

        if (this.delay !== 0) {
            setTimeout(() => this.animate(view, 0, this.iterations), this.delay);
        }
        else {
            this.animate(view, 0, this.iterations);
        }

        return animationFinishedPromise;
    }

    private animate(view: view.View, index: number, iterations: number) {
        if (!this._isPlaying) {
            return;
        }
        if (index === 0) {
            let animation = this.animations[0];
            let modifier = animation["valueSource"];

            if ("backgroundColor" in animation) {
                view.style._setValue(style.backgroundColorProperty, animation["backgroundColor"], modifier);
            }
            if ("scale" in animation) {
                view.style._setValue(style.scaleXProperty, animation["scale"].x, modifier);
                view.style._setValue(style.scaleYProperty, animation["scale"].y, modifier);
            }
            if ("translate" in animation) {
                view.style._setValue(style.translateXProperty, animation["translate"].x, modifier);
                view.style._setValue(style.translateYProperty, animation["translate"].y, modifier);
            }
            if ("rotate" in animation) {
                view.style._setValue(style.rotateProperty, animation["rotate"], modifier);
            }
            if ("opacity" in animation) {
                view.style._setValue(style.opacityProperty, animation["opacity"], modifier);
            }

            setTimeout(() => this.animate(view, 1, iterations), 1);
        }
        else if (index < 0 || index >= this.animations.length) {
            iterations -= 1;
            if (iterations > 0) {
                this.animate(view, 0, iterations);
            }
            else {
                if (this._isForwards === false) {
                    let animation = this.animations[this.animations.length - 1];
                    this._resetAnimationValues(view, animation);
                }
                this._resolveAnimationFinishedPromise();
            }
        }
        else {
            let animationDef = this.animations[index];
            (<any>animationDef).target = view;
            let animation = new animationModule.Animation([animationDef]);
            animation.play().then(() => {
                this.animate(view, index + 1, iterations);
            });
            this._nativeAnimations.push(animation);
        }
    }

    public _resolveAnimationFinishedPromise() {
        this._nativeAnimations = new Array<animationModule.Animation>();
        this._isPlaying = false;
        this._target = null;
        this._resolve();
    }

    public _rejectAnimationFinishedPromise() {
        this._nativeAnimations = new Array<animationModule.Animation>();
        this._isPlaying = false;
        this._target = null;
        this._reject(new Error("Animation cancelled."));
    }

    private _resetAnimationValues(view: view.View, animation: Object) {
        let modifier = animation["valueSource"];
        if ("backgroundColor" in animation) {
            view.style._resetValue(style.backgroundColorProperty, modifier);
        }
        if ("scale" in animation) {
            view.style._resetValue(style.scaleXProperty, modifier);
            view.style._resetValue(style.scaleYProperty, modifier);
        }
        if ("translate" in animation) {
            view.style._resetValue(style.translateXProperty, modifier);
            view.style._resetValue(style.translateYProperty, modifier);
        }
        if ("rotate" in animation) {
            view.style._resetValue(style.rotateProperty, modifier);
        }
        if ("opacity" in animation) {
            view.style._resetValue(style.opacityProperty, modifier);
        }
    }
}
