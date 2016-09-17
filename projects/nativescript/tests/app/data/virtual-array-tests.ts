import TKUnit = require("../TKUnit");
import types = require("utils/types");

// >> virtual-array-require
import virtualArrayModule = require("data/virtual-array");
// << virtual-array-require

require("globals");

export var test_VirtualArray_shouldCreateArrayFromSpecifiedLength = function () {
    var array = new virtualArrayModule.VirtualArray<number>(100);

    TKUnit.assert(array.length === 100, "VirtualArray<T> should create array from specified length!");
};

export var test_VirtualArray_setItemShouldSetCorrectItem = function () {
    var array = new virtualArrayModule.VirtualArray<number>(100);
    array.setItem(0, 0);
    TKUnit.assert(array.getItem(0) === 0, "VirtualArray<T> setItem() should set correct item!");
};

export var test_VirtualArray_setItemShouldRaiseChangeEventWhenYouSetDifferentItem = function () {
    // >> virtual-array-itemsloading
    var array = new virtualArrayModule.VirtualArray<number>(100);
    array.loadSize = 15;

    // >> (hide)
    var result: virtualArrayModule.ChangedData<number>;
    var index = 0;

    array.on(virtualArrayModule.VirtualArray.changeEvent, (args: virtualArrayModule.ChangedData<number>) => {
        result = args;
    });

    array.setItem(index, 0);

    TKUnit.assert(result && result.eventName === "change" && result.action === virtualArrayModule.ChangeType.Update &&
        result.removed.length === 1 && result.index === index && result.addedCount === 1, "VirtualArray<T> setItem() should raise 'change' event with correct args!");

    result = undefined;

    array.setItem(index, 1);

    TKUnit.assert(result && result.eventName === "change" && result.action === virtualArrayModule.ChangeType.Update &&
        result.removed.length === 1 && result.index === index && result.addedCount === 1, "VirtualArray<T> setItem() should raise 'change' event with correct args!");
    // << (hide)

    array.on(virtualArrayModule.VirtualArray.itemsLoadingEvent, (args: virtualArrayModule.ItemsLoading) => {
        // Argument (args) is ItemsLoading.
        // args.index is start index of the page where the requested index is located.
        // args.count number of requested items.
        //
        // Note: Virtual array will divide total number of items to pages using "loadSize" property value. When you request an 
        // item at specific index the array will raise "itemsLoading" event with "ItemsLoading" argument index set to the first index of the requested page
        // and count set to number of items in this page. 
        //
        // Important: If you have already loaded items in the requested page the array will raise multiple times "itemsLoading" event to request 
        // all ranges of still not loaded items in this page. 

        var itemsToLoad = new Array<number>();
        for (var i = 0; i < args.count; i++) {
            itemsToLoad.push(i + args.index);
        }

        array.load(args.index, itemsToLoad);
    });
    // << virtual-array-itemsloading
};

export var test_VirtualArray_loadShouldRaiseChangeEventWithCorrectArgs = function () {
    // >> virtual-array-change
    var array = new virtualArrayModule.VirtualArray<number>(100);
    array.loadSize = 15;

    // >> (hide)
    var result: virtualArrayModule.ChangedData<number>;
    var index = 0;
    // << (hide)

    array.on(virtualArrayModule.VirtualArray.changeEvent, (args: virtualArrayModule.ChangedData<number>) => {
        // Argument (args) is ChangedData<T>.
        // args.eventName is "change".
        // args.action is "update".
        // args.removed.length and result.addedCount are equal to number of loaded items with load() method.

        // >> (hide)
        result = args;
        // << (hide)
    });

    var itemsToLoad = [0, 1, 2];

    array.load(index, itemsToLoad);
    // << virtual-array-change

    TKUnit.assert(result && result.eventName === "change" && result.action === virtualArrayModule.ChangeType.Update &&
        result.removed.length === itemsToLoad.length && result.index === index && result.addedCount === itemsToLoad.length,
        "VirtualArray<T> load() should raise 'change' event with correct args!");
};

export var test_VirtualArray_lengthIncreaseShouldRaiseChangeEventWithCorrectArgs = function () {
    // >> virtual-array-lenght
    var array = new virtualArrayModule.VirtualArray<number>(100);
    array.loadSize = 15;

    // >> (hide)
    var result: virtualArrayModule.ChangedData<number>;
    var index = array.length;
    // << (hide)

    array.on(virtualArrayModule.VirtualArray.changeEvent, (args: virtualArrayModule.ChangedData<number>) => {
        // Argument (args) is ChangedData<T>.
        // args.eventName is "change".
        // args.action is "add".
        // args.removed.length is 0, result.addedCount is equal to the delta between new and old "length" property values.

        // >> (hide)
        result = args;
        // << (hide)
    });

    array.length += array.loadSize;
    // << virtual-array-lenght

    TKUnit.assert(result && result.eventName === "change" && result.action === virtualArrayModule.ChangeType.Add
        && result.index === index && result.addedCount === array.loadSize && result.removed.length === 0,
        "VirtualArray<T> length++ should raise 'change' event with correct args!");
};

export var test_VirtualArray_lengthDecreaseShouldRaiseChangeEventWithCorrectArgs = function () {
    // <snippet module="data/virtual-array" title="virtual-array">
    // ### Handle "change" event when you increase "length" property.
    // ``` JavaScript
    var array = new virtualArrayModule.VirtualArray<number>(100);
    array.loadSize = 15;

    // <hide>
    var result: virtualArrayModule.ChangedData<number>;
    var index = array.length;
    // </hide>

    array.on(virtualArrayModule.VirtualArray.changeEvent, (args: virtualArrayModule.ChangedData<number>) => {
        // Argument (args) is ChangedData<T>.
        // args.eventName is "change".
        // args.action is "remove".
        // result.addedCount is 0, args.removed.length is equal to the delta between new and old "length" property values.

        // <hide>
        result = args;
        // </hide>
    });

    array.length -= array.loadSize;

    TKUnit.assert(result && result.eventName === "change" && result.action === virtualArrayModule.ChangeType.Delete
        && result.index === index && result.removed.length === array.loadSize && result.addedCount === 0,
        "VirtualArray<T> length++ should raise 'change' event with correct args!");
};

export var test_VirtualArray_shouldRaiseItemsLoadingIfIndexIsNotLoadedAndGetItemIsCalled = function () {
    var array = new virtualArrayModule.VirtualArray<number>(100);
    array.loadSize = 15;

    var result: virtualArrayModule.ItemsLoading;

    array.on(virtualArrayModule.VirtualArray.itemsLoadingEvent, (args: virtualArrayModule.ItemsLoading) => {
        result = args;
    });

    array.getItem(0);

    TKUnit.assert(result.eventName === virtualArrayModule.VirtualArray.itemsLoadingEvent && result.index === 0 &&
        result.count === array.loadSize, "VirtualArray<T> getItem() should raise 'itemsLoading' event with correct args if item is not loaded!");
};

export var test_VirtualArray_shouldNotRaiseItemsLoadingIfIndexIsLoadedAndGetItemIsCalled = function () {
    var array = new virtualArrayModule.VirtualArray<number>(100);
    array.setItem(0, 0);
    array.loadSize = 15;

    var result: virtualArrayModule.ItemsLoading;

    array.on(virtualArrayModule.VirtualArray.itemsLoadingEvent, (args: virtualArrayModule.ItemsLoading) => {
        result = args;
    });

    array.getItem(0);

    TKUnit.assert(types.isUndefined(result), "VirtualArray<T> getItem() should not raise 'itemsLoading' event if item is loaded!");
};

export var test_VirtualArray_shouldRaiseItemsLoadingIfIndexIsNotLoadedAndGetItemIsCalledCorrectNumberOfTimesWithCorrectArgs = function () {
    var array = new virtualArrayModule.VirtualArray<number>(100);
    array.loadSize = 15;

    array.setItem(0, 0);

    array.setItem(5, 5);

    var result = new Array<virtualArrayModule.ItemsLoading>();

    array.on(virtualArrayModule.VirtualArray.itemsLoadingEvent, (args: virtualArrayModule.ItemsLoading) => {
        result.push(args);
    });

    array.getItem(1);

    TKUnit.assert(result.length === 2 &&
        result[0].eventName === virtualArrayModule.VirtualArray.itemsLoadingEvent && result[0].index === 1 && result[0].count === 4 &&
        result[1].eventName === virtualArrayModule.VirtualArray.itemsLoadingEvent && result[1].index === 6 && result[1].count === 9,
        "VirtualArray<T> getItem() should raise 'itemsLoading' event with correct args!");
};
