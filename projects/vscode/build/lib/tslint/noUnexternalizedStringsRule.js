/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ts = require('typescript');
var Lint = require('tslint/lib/lint');
/**
 * Implementation of the no-unexternalized-strings rule.
 */
var Rule = (function (_super) {
    __extends(Rule, _super);
    function Rule() {
        _super.apply(this, arguments);
    }
    Rule.prototype.apply = function (sourceFile) {
        return this.applyWithWalker(new NoUnexternalizedStringsRuleWalker(sourceFile, this.getOptions()));
    };
    return Rule;
}(Lint.Rules.AbstractRule));
exports.Rule = Rule;
function isStringLiteral(node) {
    return node && node.kind === ts.SyntaxKind.StringLiteral;
}
function isObjectLiteral(node) {
    return node && node.kind === ts.SyntaxKind.ObjectLiteralExpression;
}
function isPropertyAssignment(node) {
    return node && node.kind === ts.SyntaxKind.PropertyAssignment;
}
var NoUnexternalizedStringsRuleWalker = (function (_super) {
    __extends(NoUnexternalizedStringsRuleWalker, _super);
    function NoUnexternalizedStringsRuleWalker(file, opts) {
        var _this = this;
        _super.call(this, file, opts);
        this.signatures = Object.create(null);
        this.ignores = Object.create(null);
        this.messageIndex = undefined;
        this.keyIndex = undefined;
        this.usedKeys = Object.create(null);
        var options = this.getOptions();
        var first = options && options.length > 0 ? options[0] : null;
        if (first) {
            if (Array.isArray(first.signatures)) {
                first.signatures.forEach(function (signature) { return _this.signatures[signature] = true; });
            }
            if (Array.isArray(first.ignores)) {
                first.ignores.forEach(function (ignore) { return _this.ignores[ignore] = true; });
            }
            if (typeof first.messageIndex !== 'undefined') {
                this.messageIndex = first.messageIndex;
            }
            if (typeof first.keyIndex !== 'undefined') {
                this.keyIndex = first.keyIndex;
            }
        }
    }
    NoUnexternalizedStringsRuleWalker.prototype.visitSourceFile = function (node) {
        var _this = this;
        _super.prototype.visitSourceFile.call(this, node);
        Object.keys(this.usedKeys).forEach(function (key) {
            var occurences = _this.usedKeys[key];
            if (occurences.length > 1) {
                occurences.forEach(function (occurence) {
                    _this.addFailure((_this.createFailure(occurence.key.getStart(), occurence.key.getWidth(), "Duplicate key " + occurence.key.getText() + " with different message value.")));
                });
            }
        });
    };
    NoUnexternalizedStringsRuleWalker.prototype.visitStringLiteral = function (node) {
        this.checkStringLiteral(node);
        _super.prototype.visitStringLiteral.call(this, node);
    };
    NoUnexternalizedStringsRuleWalker.prototype.checkStringLiteral = function (node) {
        var text = node.getText();
        var doubleQuoted = text.length >= 2 && text[0] === NoUnexternalizedStringsRuleWalker.DOUBLE_QUOTE && text[text.length - 1] === NoUnexternalizedStringsRuleWalker.DOUBLE_QUOTE;
        var info = this.findDescribingParent(node);
        // Ignore strings in import and export nodes.
        if (info && info.ignoreUsage) {
            return;
        }
        var callInfo = info ? info.callInfo : null;
        var functionName = callInfo ? callInfo.callExpression.expression.getText() : null;
        if (functionName && this.ignores[functionName]) {
            return;
        }
        if (doubleQuoted && (!callInfo || callInfo.argIndex === -1 || !this.signatures[functionName])) {
            this.addFailure(this.createFailure(node.getStart(), node.getWidth(), "Unexternalized string found: " + node.getText()));
            return;
        }
        // We have a single quoted string outside a localize function name.
        if (!doubleQuoted && !this.signatures[functionName]) {
            return;
        }
        // We have a string that is a direct argument into the localize call.
        var keyArg = callInfo.argIndex === this.keyIndex
            ? callInfo.callExpression.arguments[this.keyIndex]
            : null;
        if (keyArg) {
            if (isStringLiteral(keyArg)) {
                this.recordKey(keyArg, this.messageIndex ? callInfo.callExpression.arguments[this.messageIndex] : undefined);
            }
            else if (isObjectLiteral(keyArg)) {
                for (var i = 0; i < keyArg.properties.length; i++) {
                    var property = keyArg.properties[i];
                    if (isPropertyAssignment(property)) {
                        var name_1 = property.name.getText();
                        if (name_1 === 'key') {
                            var initializer = property.initializer;
                            if (isStringLiteral(initializer)) {
                                this.recordKey(initializer, this.messageIndex ? callInfo.callExpression.arguments[this.messageIndex] : undefined);
                            }
                            break;
                        }
                    }
                }
            }
        }
        var messageArg = callInfo.argIndex === this.messageIndex
            ? callInfo.callExpression.arguments[this.messageIndex]
            : null;
        if (messageArg && messageArg !== node) {
            this.addFailure(this.createFailure(messageArg.getStart(), messageArg.getWidth(), "Message argument to '" + callInfo.callExpression.expression.getText() + "' must be a string literal."));
            return;
        }
    };
    NoUnexternalizedStringsRuleWalker.prototype.recordKey = function (keyNode, messageNode) {
        var text = keyNode.getText();
        var occurences = this.usedKeys[text];
        if (!occurences) {
            occurences = [];
            this.usedKeys[text] = occurences;
        }
        if (messageNode) {
            if (occurences.some(function (pair) { return pair.message ? pair.message.getText() === messageNode.getText() : false; })) {
                return;
            }
        }
        occurences.push({ key: keyNode, message: messageNode });
    };
    NoUnexternalizedStringsRuleWalker.prototype.findDescribingParent = function (node) {
        var parent;
        while ((parent = node.parent)) {
            var kind = parent.kind;
            if (kind === ts.SyntaxKind.CallExpression) {
                var callExpression = parent;
                return { callInfo: { callExpression: callExpression, argIndex: callExpression.arguments.indexOf(node) } };
            }
            else if (kind === ts.SyntaxKind.ImportEqualsDeclaration || kind === ts.SyntaxKind.ImportDeclaration || kind === ts.SyntaxKind.ExportDeclaration) {
                return { ignoreUsage: true };
            }
            else if (kind === ts.SyntaxKind.VariableDeclaration || kind === ts.SyntaxKind.FunctionDeclaration || kind === ts.SyntaxKind.PropertyDeclaration
                || kind === ts.SyntaxKind.MethodDeclaration || kind === ts.SyntaxKind.VariableDeclarationList || kind === ts.SyntaxKind.InterfaceDeclaration
                || kind === ts.SyntaxKind.ClassDeclaration || kind === ts.SyntaxKind.EnumDeclaration || kind === ts.SyntaxKind.ModuleDeclaration
                || kind === ts.SyntaxKind.TypeAliasDeclaration || kind === ts.SyntaxKind.SourceFile) {
                return null;
            }
            node = parent;
        }
    };
    NoUnexternalizedStringsRuleWalker.DOUBLE_QUOTE = '"';
    return NoUnexternalizedStringsRuleWalker;
}(Lint.RuleWalker));
