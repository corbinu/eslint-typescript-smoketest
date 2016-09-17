﻿import segmentedBarModule = require("ui/segmented-bar");

export function getNativeItemsCount(bar: segmentedBarModule.SegmentedBar): number {
    return (<android.widget.TabHost>bar.android).getTabWidget().getTabCount();
}

export function checkNativeItemsTextColor(bar: segmentedBarModule.SegmentedBar): boolean {
    var isValid = true;

    for (var tabIndex = 0; tabIndex < bar.android.getTabWidget().getTabCount(); tabIndex++) {
        var tabChild = <android.view.ViewGroup>bar.android.getTabWidget().getChildTabViewAt(tabIndex);
        var t = <android.widget.TextView>tabChild.getChildAt(1);

        isValid = bar.color && bar.color.android === t.getCurrentTextColor();
    }

    return isValid;
}

export function setNativeSelectedIndex(bar: segmentedBarModule.SegmentedBar, index: number): void {
    (<android.widget.TabHost>bar.android).setCurrentTab(index);
}