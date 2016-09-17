﻿import {Page} from "ui/page";
import {View} from "ui/core/view";
import trace = require("trace");
import navHelper = require("./ui/helper");
import TKUnit = require("./TKUnit");

export class UITest<T extends View> implements trace.TraceWriter {
    
    private _testPage: Page;
    private _testView: T;
    private _errorMessage;

    public get errorMessage(): string {
        return this._errorMessage;
    }

    public get testPage(): Page {
        return this._testPage;
    }

    public get testView(): T {
        return this._testView;
    }

    public waitUntilTestElementIsLoaded(timeoutSec?: number): void {
        TKUnit.waitUntilReady(() => {
            return this.testView.isLoaded;
        }, timeoutSec || 1);
    }

    public waitUntilTestElementLayoutIsValid(timeoutSec?: number): void {
        TKUnit.waitUntilReady(() => {
            return this.testView.isLayoutValid;
        }, timeoutSec || 1);
    }

    public create(): T {
        throw new Error(this + " should implement Create method.");
    }

    public setUpModule(): void {
        
        var pageFactory = () => {
            var page = new Page();
            this._testPage = page;
            return page;
        };

        trace.addWriter(this);
        navHelper.navigate(pageFactory);
    }

    public tearDownModule() {
        this._testPage = null;
        this._testView = null;
        trace.removeWriter(this);
    }

    public setUp() {        
        this._testView = this.create();
        this._testPage.content = this._testView;
    }

    public tearDown() {
        this._testPage.content = null;
        this._testPage.bindingContext = null;
        this._testPage.css = "";
        this._testView = null;
        this._errorMessage = undefined;
    }

    public write(message: any, category: string, type?: number): void {
        if (category === trace.categories.Error) {
            this._errorMessage = message;
        }
    }
}

export function createTestCase(): UITest<View> {
    return null;
}