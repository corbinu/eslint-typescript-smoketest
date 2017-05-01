﻿/**
 * Android specific dialogs functions implementation.
 */
import dialogs = require("ui/dialogs");
import dialogsCommon = require("./dialogs-common");
import appmodule = require("application");
import types = require("utils/types");

global.moduleMerge(dialogsCommon, exports);

function createAlertDialog(options?: dialogs.DialogOptions): android.app.AlertDialog.Builder {
    const alert = new android.app.AlertDialog.Builder(appmodule.android.foregroundActivity);
    alert.setTitle(options && types.isString(options.title) ? options.title : "");
    alert.setMessage(options && types.isString(options.message) ? options.message : "");
    if (options && options.cancelable === false) {
        alert.setCancelable(false);
    }
    return alert;
}

function showDialog(builder: android.app.AlertDialog.Builder) {
    const dlg = builder.show();

    const labelColor = dialogsCommon.getLabelColor();
    if (labelColor) {
        const textViewId = dlg.getContext().getResources().getIdentifier("android:id/alertTitle", null, null);
        if (textViewId) {
            const tv = <android.widget.TextView>dlg.findViewById(textViewId);
            if (tv) {
                tv.setTextColor(labelColor.android);
            }
        }

        const messageTextViewId = dlg.getContext().getResources().getIdentifier("android:id/message", null, null);
        if (messageTextViewId) {
            const messageTextView = <android.widget.TextView>dlg.findViewById(messageTextViewId);
            if (messageTextView) {
                messageTextView.setTextColor(labelColor.android);
            }
        }
    }

    let buttonColor = dialogsCommon.getButtonColor();
    let buttonBackgroundColor = dialogsCommon.getButtonBackgroundColor();
    if (buttonColor || buttonBackgroundColor) {
        let buttons : android.widget.Button[] = [];
        for (let i = 0; i < 3; i++) {
            let id = dlg.getContext().getResources().getIdentifier("android:id/button" + i, null, null);
            buttons[i] = <android.widget.Button>dlg.findViewById(id);
        }

        buttons.forEach(button => {
            if (button) {
                if (buttonColor) {
                    button.setTextColor(buttonColor.android);
                }
                if (buttonBackgroundColor) {
                    button.setBackgroundColor(buttonBackgroundColor.android);
                }
            }
        });
    }
}

function addButtonsToAlertDialog(alert: android.app.AlertDialog.Builder, options: dialogs.ConfirmOptions,
    callback: Function): void {

    if (!options) {
        return;
    }

    if (options.okButtonText) {
        alert.setPositiveButton(options.okButtonText, new android.content.DialogInterface.OnClickListener({
            onClick: function (dialog: android.content.DialogInterface, id: number) {
                dialog.cancel();
                callback(true);
            }
        }));
    }

    if (options.cancelButtonText) {
        alert.setNegativeButton(options.cancelButtonText, new android.content.DialogInterface.OnClickListener({
            onClick: function (dialog: android.content.DialogInterface, id: number) {
                dialog.cancel();
                callback(false);
            }
        }));
    }

    if (options.neutralButtonText) {
        alert.setNeutralButton(options.neutralButtonText, new android.content.DialogInterface.OnClickListener({
            onClick: function (dialog: android.content.DialogInterface, id: number) {
                dialog.cancel();
                callback(undefined);
            }
        }));
    }
    alert.setOnDismissListener(new android.content.DialogInterface.OnDismissListener({
        onDismiss: function () {
            callback(false);
        }
    }));
}

export function alert(arg: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            const options = !dialogsCommon.isDialogOptions(arg) ? { title: dialogsCommon.ALERT, okButtonText: dialogsCommon.OK, message: arg + "" } : arg;

            const alert = createAlertDialog(options);

            alert.setPositiveButton(options.okButtonText, new android.content.DialogInterface.OnClickListener({
                onClick: function (dialog: android.content.DialogInterface, id: number) {
                    dialog.cancel();
                    resolve();
                }
            }));
            alert.setOnDismissListener(new android.content.DialogInterface.OnDismissListener({
                onDismiss: function () {
                    resolve();
                }
            }));

            showDialog(alert);

        } catch (ex) {
            reject(ex);
        }
    });
}

export function confirm(arg: any): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        try {
            const options = !dialogsCommon.isDialogOptions(arg) ? { title: dialogsCommon.CONFIRM, okButtonText: dialogsCommon.OK, cancelButtonText: dialogsCommon.CANCEL, message: arg + "" } : arg;
            const alert = createAlertDialog(options);

            addButtonsToAlertDialog(alert, options, function (result) { resolve(result); });

            showDialog(alert);

        } catch (ex) {
            reject(ex);
        }
    });
}

export function prompt(arg: any): Promise<dialogs.PromptResult> {
    let options: dialogs.PromptOptions;

    const defaultOptions = {
        title: dialogsCommon.PROMPT,
        okButtonText: dialogsCommon.OK,
        cancelButtonText: dialogsCommon.CANCEL,
        inputType: dialogsCommon.inputType.text,
    };

    if (arguments.length === 1) {
        if (types.isString(arg)) {
            options = defaultOptions;
            options.message = arg;
        } else {
            options = arg;
        }
    } else if (arguments.length === 2) {
        if (types.isString(arguments[0]) && types.isString(arguments[1])) {
            options = defaultOptions;
            options.message = arguments[0];
            options.defaultText = arguments[1];
        }
    }

    return new Promise<dialogs.PromptResult>((resolve, reject) => {
        try {
            const alert = createAlertDialog(options);

            const input = new android.widget.EditText(appmodule.android.foregroundActivity);

            if (options && options.inputType === dialogsCommon.inputType.password) {
                input.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);
            }

            input.setText(options && options.defaultText || "");

            alert.setView(input);

            const getText = function () { return input.getText().toString(); };

            addButtonsToAlertDialog(alert, options, function (r) { resolve({ result: r, text: getText() }); });

            showDialog(alert);

        } catch (ex) {
            reject(ex);
        }

    });
}

export function login(arg: any): Promise<dialogs.LoginResult> {
    let options: dialogs.LoginOptions;

    const defaultOptions = { title: dialogsCommon.LOGIN, okButtonText: dialogsCommon.OK, cancelButtonText: dialogsCommon.CANCEL };

    if (arguments.length === 1) {
        if (types.isString(arguments[0])) {
            options = defaultOptions;
            options.message = arguments[0];
        } else {
            options = arguments[0];
        }
    } else if (arguments.length === 2) {
        if (types.isString(arguments[0]) && types.isString(arguments[1])) {
            options = defaultOptions;
            options.message = arguments[0];
            options.userName = arguments[1];
        }
    } else if (arguments.length === 3) {
        if (types.isString(arguments[0]) && types.isString(arguments[1]) && types.isString(arguments[2])) {
            options = defaultOptions;
            options.message = arguments[0];
            options.userName = arguments[1];
            options.password = arguments[2];
        }
    }

    return new Promise<dialogs.LoginResult>((resolve, reject) => {
        try {
            const context = appmodule.android.foregroundActivity;

            const alert = createAlertDialog(options);

            const userNameInput = new android.widget.EditText(context);
            userNameInput.setText(options.userName ? options.userName : "");

            const passwordInput = new android.widget.EditText(context);
            passwordInput.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);
            passwordInput.setText(options.password ? options.password : "");

            const layout = new android.widget.LinearLayout(context);
            layout.setOrientation(1);
            layout.addView(userNameInput);
            layout.addView(passwordInput);

            alert.setView(layout);

            addButtonsToAlertDialog(alert, options, function (r) {
                resolve({
                    result: r,
                    userName: userNameInput.getText().toString(),
                    password: passwordInput.getText().toString()
                });
            });

            showDialog(alert);

        } catch (ex) {
            reject(ex);
        }

    });
}

export function action(arg: any): Promise<string> {
    let options: dialogs.ActionOptions;

    const defaultOptions = { title: null, cancelButtonText: dialogsCommon.CANCEL };

    if (arguments.length === 1) {
        if (types.isString(arguments[0])) {
            options = defaultOptions;
            options.message = arguments[0];
        } else {
            options = arguments[0];
        }
    } else if (arguments.length === 2) {
        if (types.isString(arguments[0]) && types.isString(arguments[1])) {
            options = defaultOptions;
            options.message = arguments[0];
            options.cancelButtonText = arguments[1];
        }
    } else if (arguments.length === 3) {
        if (types.isString(arguments[0]) && types.isString(arguments[1]) && types.isDefined(arguments[2])) {
            options = defaultOptions;
            options.message = arguments[0];
            options.cancelButtonText = arguments[1];
            options.actions = arguments[2];
        }
    }

    return new Promise<string>((resolve, reject) => {
        try {
            const activity = appmodule.android.foregroundActivity || appmodule.android.startActivity;
            const alert = new android.app.AlertDialog.Builder(activity);
            const message = options && types.isString(options.message) ? options.message : "";
            const title = options && types.isString(options.title) ? options.title : "";
            if (options && options.cancelable === false) {
                alert.setCancelable(false);
            }

            if (title) {
                alert.setTitle(title);
                if (!options.actions) {
                    alert.setMessage(message);
                }
            }
            else {
                alert.setTitle(message);
            }

            if (options.actions) {
                alert.setItems(options.actions, new android.content.DialogInterface.OnClickListener({
                    onClick: function (dialog: android.content.DialogInterface, which: number) {
                        resolve(options.actions[which])
                    }
                }));
            }

            if (types.isString(options.cancelButtonText)) {
                alert.setNegativeButton(options.cancelButtonText, new android.content.DialogInterface.OnClickListener({
                    onClick: function (dialog: android.content.DialogInterface, id: number) {
                        dialog.cancel();
                        resolve(options.cancelButtonText)
                    }
                }));
            }

            alert.setOnDismissListener(new android.content.DialogInterface.OnDismissListener({
                onDismiss: function () {
                    if (types.isString(options.cancelButtonText)) {
                        resolve(options.cancelButtonText);
                    } else {
                        resolve("");
                    }
                }
            }));

            showDialog(alert);

        } catch (ex) {
            reject(ex);
        }
    });
}
