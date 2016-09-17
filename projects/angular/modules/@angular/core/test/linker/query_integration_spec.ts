/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {AfterContentChecked, AfterContentInit, AfterViewChecked, AfterViewInit, Component, ContentChild, ContentChildren, Directive, QueryList, TemplateRef, ViewChild, ViewChildren, ViewContainerRef, asNativeElements} from '@angular/core';
import {TestBed, async} from '@angular/core/testing';
import {expect} from '@angular/platform-browser/testing/matchers';

import {isPresent, stringify} from '../../src/facade/lang';

export function main() {
  describe('Query API', () => {

    beforeEach(() => TestBed.configureTestingModule({
      declarations: [
        MyComp0,
        NeedsQuery,
        NeedsQueryDesc,
        NeedsQueryByLabel,
        NeedsQueryByTwoLabels,
        NeedsQueryAndProject,
        NeedsViewQuery,
        NeedsViewQueryIf,
        NeedsViewQueryNestedIf,
        NeedsViewQueryOrder,
        NeedsViewQueryByLabel,
        NeedsViewQueryOrderWithParent,
        NeedsContentChildren,
        NeedsViewChildren,
        NeedsViewChild,
        NeedsStaticContentAndViewChild,
        NeedsContentChild,
        NeedsTpl,
        NeedsNamedTpl,
        TextDirective,
        InertDirective,
        NeedsFourQueries,
        NeedsContentChildrenWithRead,
        NeedsContentChildWithRead,
        NeedsViewChildrenWithRead,
        NeedsViewChildWithRead,
        NeedsViewContainerWithRead
      ]
    }));

    describe('querying by directive type', () => {
      it('should contain all direct child directives in the light dom (constructor)', () => {
        const template = '<div text="1"></div>' +
            '<needs-query text="2"><div text="3">' +
            '<div text="too-deep"></div>' +
            '</div></needs-query>' +
            '<div text="4"></div>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        view.detectChanges();

        expect(asNativeElements(view.debugElement.children)).toHaveText('2|3|');
      });

      it('should contain all direct child directives in the content dom', () => {
        const template =
            '<needs-content-children #q><div text="foo"></div></needs-content-children>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        view.detectChanges();

        var q = view.debugElement.children[0].references['q'];

        view.detectChanges();

        expect(q.textDirChildren.length).toEqual(1);
        expect(q.numberOfChildrenAfterContentInit).toEqual(1);
      });

      it('should contain the first content child', () => {
        const template =
            '<needs-content-child #q><div *ngIf="shouldShow" text="foo"></div></needs-content-child>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        view.componentInstance.shouldShow = true;
        view.detectChanges();

        var q: NeedsContentChild = view.debugElement.children[0].references['q'];

        expect(q.logs).toEqual([['setter', 'foo'], ['init', 'foo'], ['check', 'foo']]);

        view.componentInstance.shouldShow = false;
        view.detectChanges();

        expect(q.logs).toEqual([
          ['setter', 'foo'], ['init', 'foo'], ['check', 'foo'], ['setter', null], ['check', null]
        ]);
      });

      it('should contain the first view child', () => {
        const template = '<needs-view-child #q></needs-view-child>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        view.detectChanges();
        var q: NeedsViewChild = view.debugElement.children[0].references['q'];

        expect(q.logs).toEqual([['setter', 'foo'], ['init', 'foo'], ['check', 'foo']]);

        q.shouldShow = false;
        view.detectChanges();

        expect(q.logs).toEqual([
          ['setter', 'foo'], ['init', 'foo'], ['check', 'foo'], ['setter', null], ['check', null]
        ]);
      });

      it('should set static view and content children already after the constructor call', () => {
        const template =
            '<needs-static-content-view-child #q><div text="contentFoo"></div></needs-static-content-view-child>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        var q: NeedsStaticContentAndViewChild = view.debugElement.children[0].references['q'];
        expect(q.contentChild.text).toBeFalsy();
        expect(q.viewChild.text).toBeFalsy();

        view.detectChanges();

        expect(q.contentChild.text).toEqual('contentFoo');
        expect(q.viewChild.text).toEqual('viewFoo');
      });

      it('should contain the first view child accross embedded views', () => {
        TestBed.overrideComponent(
            MyComp0, {set: {template: '<needs-view-child #q></needs-view-child>'}});
        TestBed.overrideComponent(NeedsViewChild, {
          set: {
            template:
                '<div *ngIf="true"><div *ngIf="shouldShow" text="foo"></div></div><div *ngIf="shouldShow2" text="bar"></div>'
          }
        });
        const view = TestBed.createComponent(MyComp0);

        view.detectChanges();
        var q: NeedsViewChild = view.debugElement.children[0].references['q'];

        expect(q.logs).toEqual([['setter', 'foo'], ['init', 'foo'], ['check', 'foo']]);

        q.shouldShow = false;
        q.shouldShow2 = true;
        q.logs = [];
        view.detectChanges();

        expect(q.logs).toEqual([['setter', 'bar'], ['check', 'bar']]);

        q.shouldShow = false;
        q.shouldShow2 = false;
        q.logs = [];
        view.detectChanges();

        expect(q.logs).toEqual([['setter', null], ['check', null]]);
      });

      it('should contain all directives in the light dom when descendants flag is used', () => {
        const template = '<div text="1"></div>' +
            '<needs-query-desc text="2"><div text="3">' +
            '<div text="4"></div>' +
            '</div></needs-query-desc>' +
            '<div text="5"></div>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        view.detectChanges();
        expect(asNativeElements(view.debugElement.children)).toHaveText('2|3|4|');
      });

      it('should contain all directives in the light dom', () => {
        const template = '<div text="1"></div>' +
            '<needs-query text="2"><div text="3"></div></needs-query>' +
            '<div text="4"></div>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        view.detectChanges();
        expect(asNativeElements(view.debugElement.children)).toHaveText('2|3|');
      });

      it('should reflect dynamically inserted directives', () => {
        const template = '<div text="1"></div>' +
            '<needs-query text="2"><div *ngIf="shouldShow" [text]="\'3\'"></div></needs-query>' +
            '<div text="4"></div>';
        ;
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        view.detectChanges();
        expect(asNativeElements(view.debugElement.children)).toHaveText('2|');

        view.componentInstance.shouldShow = true;
        view.detectChanges();
        expect(asNativeElements(view.debugElement.children)).toHaveText('2|3|');
      });

      it('should be cleanly destroyed when a query crosses view boundaries', () => {
        const template = '<div text="1"></div>' +
            '<needs-query text="2"><div *ngIf="shouldShow" [text]="\'3\'"></div></needs-query>' +
            '<div text="4"></div>';
        ;
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const fixture = TestBed.createComponent(MyComp0);

        fixture.componentInstance.shouldShow = true;
        fixture.detectChanges();
        fixture.destroy();
      });

      it('should reflect moved directives', () => {
        const template = '<div text="1"></div>' +
            '<needs-query text="2"><div *ngFor="let  i of list" [text]="i"></div></needs-query>' +
            '<div text="4"></div>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        view.detectChanges();

        expect(asNativeElements(view.debugElement.children)).toHaveText('2|1d|2d|3d|');

        view.componentInstance.list = ['3d', '2d'];
        view.detectChanges();
        expect(asNativeElements(view.debugElement.children)).toHaveText('2|3d|2d|');
      });

      it('should throw with descriptive error when query selectors are not present', () => {
        TestBed.configureTestingModule({declarations: [MyCompBroken0, HasNullQueryCondition]});
        const template = '<has-null-query-condition></has-null-query-condition>';
        TestBed.overrideComponent(MyCompBroken0, {set: {template}});
        expect(() => TestBed.createComponent(MyCompBroken0))
            .toThrowError(
                `Can't construct a query for the property "errorTrigger" of "${stringify(HasNullQueryCondition)}" since the query selector wasn't defined.`);
      });
    });

    describe('query for TemplateRef', () => {
      it('should find TemplateRefs in the light and shadow dom', () => {
        const template = '<needs-tpl><template><div>light</div></template></needs-tpl>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        view.detectChanges();
        var needsTpl: NeedsTpl = view.debugElement.children[0].injector.get(NeedsTpl);

        expect(needsTpl.vc.createEmbeddedView(needsTpl.query.first).rootNodes[0])
            .toHaveText('light');
        expect(needsTpl.vc.createEmbeddedView(needsTpl.viewQuery.first).rootNodes[0])
            .toHaveText('shadow');
      });

      it('should find named TemplateRefs', () => {
        const template =
            '<needs-named-tpl><template #tpl><div>light</div></template></needs-named-tpl>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        view.detectChanges();
        var needsTpl: NeedsNamedTpl = view.debugElement.children[0].injector.get(NeedsNamedTpl);
        expect(needsTpl.vc.createEmbeddedView(needsTpl.contentTpl).rootNodes[0])
            .toHaveText('light');
        expect(needsTpl.vc.createEmbeddedView(needsTpl.viewTpl).rootNodes[0]).toHaveText('shadow');
      });
    });

    describe('read a different token', () => {
      it('should contain all content children', () => {
        const template =
            '<needs-content-children-read #q text="ca"><div #q text="cb"></div></needs-content-children-read>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        view.detectChanges();

        var comp: NeedsContentChildrenWithRead =
            view.debugElement.children[0].injector.get(NeedsContentChildrenWithRead);
        expect(comp.textDirChildren.map(textDirective => textDirective.text)).toEqual(['ca', 'cb']);
      });

      it('should contain the first content child', () => {
        const template =
            '<needs-content-child-read><div #q text="ca"></div></needs-content-child-read>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        view.detectChanges();

        var comp: NeedsContentChildWithRead =
            view.debugElement.children[0].injector.get(NeedsContentChildWithRead);
        expect(comp.textDirChild.text).toEqual('ca');
      });

      it('should contain the first view child', () => {
        const template = '<needs-view-child-read></needs-view-child-read>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        view.detectChanges();

        var comp: NeedsViewChildWithRead =
            view.debugElement.children[0].injector.get(NeedsViewChildWithRead);
        expect(comp.textDirChild.text).toEqual('va');
      });

      it('should contain all child directives in the view', () => {
        const template = '<needs-view-children-read></needs-view-children-read>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        view.detectChanges();

        var comp: NeedsViewChildrenWithRead =
            view.debugElement.children[0].injector.get(NeedsViewChildrenWithRead);
        expect(comp.textDirChildren.map(textDirective => textDirective.text)).toEqual(['va', 'vb']);
      });

      it('should support reading a ViewContainer', () => {
        const template =
            '<needs-viewcontainer-read><template>hello</template></needs-viewcontainer-read>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        view.detectChanges();

        var comp: NeedsViewContainerWithRead =
            view.debugElement.children[0].injector.get(NeedsViewContainerWithRead);
        comp.createView();
        expect(view.debugElement.children[0].nativeElement).toHaveText('hello');
      });
    });

    describe('changes', () => {
      it('should notify query on change', async(() => {
           const template = '<needs-query #q>' +
               '<div text="1"></div>' +
               '<div *ngIf="shouldShow" text="2"></div>' +
               '</needs-query>';
           TestBed.overrideComponent(MyComp0, {set: {template}});
           const view = TestBed.createComponent(MyComp0);

           var q = view.debugElement.children[0].references['q'];
           view.detectChanges();

           q.query.changes.subscribe({
             next: () => {
               expect(q.query.first.text).toEqual('1');
               expect(q.query.last.text).toEqual('2');
             }
           });

           view.componentInstance.shouldShow = true;
           view.detectChanges();
         }));

      it('should correctly clean-up when destroyed together with the directives it is querying',
         () => {
           const template =
               '<needs-query #q *ngIf="shouldShow"><div text="foo"></div></needs-query>';
           TestBed.overrideComponent(MyComp0, {set: {template}});
           const view = TestBed.createComponent(MyComp0);

           view.componentInstance.shouldShow = true;
           view.detectChanges();

           var q: NeedsQuery = view.debugElement.children[0].references['q'];

           expect(q.query.length).toEqual(1);

           view.componentInstance.shouldShow = false;
           view.detectChanges();

           view.componentInstance.shouldShow = true;
           view.detectChanges();

           var q2: NeedsQuery = view.debugElement.children[0].references['q'];

           expect(q2.query.length).toEqual(1);
         });
    });

    describe('querying by var binding', () => {
      it('should contain all the child directives in the light dom with the given var binding',
         () => {
           const template = '<needs-query-by-ref-binding #q>' +
               '<div *ngFor="let item of list" [text]="item" #textLabel="textDir"></div>' +
               '</needs-query-by-ref-binding>';
           TestBed.overrideComponent(MyComp0, {set: {template}});
           const view = TestBed.createComponent(MyComp0);

           var q = view.debugElement.children[0].references['q'];

           view.componentInstance.list = ['1d', '2d'];

           view.detectChanges();

           expect(q.query.first.text).toEqual('1d');
           expect(q.query.last.text).toEqual('2d');
         });

      it('should support querying by multiple var bindings', () => {
        const template = '<needs-query-by-ref-bindings #q>' +
            '<div text="one" #textLabel1="textDir"></div>' +
            '<div text="two" #textLabel2="textDir"></div>' +
            '</needs-query-by-ref-bindings>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        var q = view.debugElement.children[0].references['q'];
        view.detectChanges();

        expect(q.query.first.text).toEqual('one');
        expect(q.query.last.text).toEqual('two');
      });

      it('should support dynamically inserted directives', () => {
        const template = '<needs-query-by-ref-binding #q>' +
            '<div *ngFor="let item of list" [text]="item" #textLabel="textDir"></div>' +
            '</needs-query-by-ref-binding>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        var q = view.debugElement.children[0].references['q'];

        view.componentInstance.list = ['1d', '2d'];

        view.detectChanges();

        view.componentInstance.list = ['2d', '1d'];

        view.detectChanges();

        expect(q.query.last.text).toEqual('1d');
      });

      it('should contain all the elements in the light dom with the given var binding', () => {
        const template = '<needs-query-by-ref-binding #q>' +
            '<div template="ngFor: let item of list">' +
            '<div #textLabel>{{item}}</div>' +
            '</div>' +
            '</needs-query-by-ref-binding>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        var q = view.debugElement.children[0].references['q'];

        view.componentInstance.list = ['1d', '2d'];

        view.detectChanges();

        expect(q.query.first.nativeElement).toHaveText('1d');
        expect(q.query.last.nativeElement).toHaveText('2d');
      });

      it('should contain all the elements in the light dom even if they get projected', () => {
        const template = '<needs-query-and-project #q>' +
            '<div text="hello"></div><div text="world"></div>' +
            '</needs-query-and-project>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        view.detectChanges();

        expect(asNativeElements(view.debugElement.children)).toHaveText('hello|world|');
      });

      it('should support querying the view by using a view query', () => {
        const template = '<needs-view-query-by-ref-binding #q></needs-view-query-by-ref-binding>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        var q: NeedsViewQueryByLabel = view.debugElement.children[0].references['q'];
        view.detectChanges();

        expect(q.query.first.nativeElement).toHaveText('text');
      });

      it('should contain all child directives in the view dom', () => {
        const template = '<needs-view-children #q></needs-view-children>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        view.detectChanges();

        var q = view.debugElement.children[0].references['q'];

        view.detectChanges();

        expect(q.textDirChildren.length).toEqual(1);
        expect(q.numberOfChildrenAfterViewInit).toEqual(1);
      });
    });

    describe('querying in the view', () => {
      it('should contain all the elements in the view with that have the given directive', () => {
        const template = '<needs-view-query #q><div text="ignoreme"></div></needs-view-query>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        var q: NeedsViewQuery = view.debugElement.children[0].references['q'];

        view.detectChanges();

        expect(q.query.map((d: TextDirective) => d.text)).toEqual(['1', '2', '3', '4']);
      });

      it('should not include directive present on the host element', () => {
        const template = '<needs-view-query #q text="self"></needs-view-query>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        var q: NeedsViewQuery = view.debugElement.children[0].references['q'];

        view.detectChanges();

        expect(q.query.map((d: TextDirective) => d.text)).toEqual(['1', '2', '3', '4']);
      });

      it('should reflect changes in the component', () => {
        const template = '<needs-view-query-if #q></needs-view-query-if>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        var q: NeedsViewQueryIf = view.debugElement.children[0].references['q'];

        view.detectChanges();

        expect(q.query.length).toBe(0);

        q.show = true;
        view.detectChanges();
        expect(q.query.length).toBe(1);

        expect(q.query.first.text).toEqual('1');
      });

      it('should not be affected by other changes in the component', () => {
        const template = '<needs-view-query-nested-if #q></needs-view-query-nested-if>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        var q: NeedsViewQueryNestedIf = view.debugElement.children[0].references['q'];

        view.detectChanges();

        expect(q.query.length).toEqual(1);
        expect(q.query.first.text).toEqual('1');

        q.show = false;
        view.detectChanges();

        expect(q.query.length).toEqual(1);
        expect(q.query.first.text).toEqual('1');
      });

      it('should maintain directives in pre-order depth-first DOM order after dynamic insertion',
         () => {
           const template = '<needs-view-query-order #q></needs-view-query-order>';
           TestBed.overrideComponent(MyComp0, {set: {template}});
           const view = TestBed.createComponent(MyComp0);

           var q: NeedsViewQueryOrder = view.debugElement.children[0].references['q'];

           view.detectChanges();

           expect(q.query.map((d: TextDirective) => d.text)).toEqual(['1', '2', '3', '4']);

           q.list = ['-3', '2'];
           view.detectChanges();


           expect(q.query.map((d: TextDirective) => d.text)).toEqual(['1', '-3', '2', '4']);
         });

      it('should maintain directives in pre-order depth-first DOM order after dynamic insertion',
         () => {
           const template = '<needs-view-query-order-with-p #q></needs-view-query-order-with-p>';
           TestBed.overrideComponent(MyComp0, {set: {template}});
           const view = TestBed.createComponent(MyComp0);

           var q: NeedsViewQueryOrderWithParent = view.debugElement.children[0].references['q'];

           view.detectChanges();

           expect(q.query.map((d: TextDirective) => d.text)).toEqual(['1', '2', '3', '4']);

           q.list = ['-3', '2'];
           view.detectChanges();


           expect(q.query.map((d: TextDirective) => d.text)).toEqual(['1', '-3', '2', '4']);
         });

      it('should handle long ngFor cycles', () => {
        const template = '<needs-view-query-order #q></needs-view-query-order>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        var q: NeedsViewQueryOrder = view.debugElement.children[0].references['q'];

        // no significance to 50, just a reasonably large cycle.
        for (var i = 0; i < 50; i++) {
          var newString = i.toString();
          q.list = [newString];
          view.detectChanges();

          expect(q.query.map((d: TextDirective) => d.text)).toEqual(['1', newString, '4']);
        }
      });

      it('should support more than three queries', () => {
        const template = '<needs-four-queries #q><div text="1"></div></needs-four-queries>';
        TestBed.overrideComponent(MyComp0, {set: {template}});
        const view = TestBed.createComponent(MyComp0);

        view.detectChanges();

        var q = view.debugElement.children[0].references['q'];
        expect(q.query1).toBeDefined();
        expect(q.query2).toBeDefined();
        expect(q.query3).toBeDefined();
        expect(q.query4).toBeDefined();
      });
    });
  });
}

@Directive({selector: '[text]', inputs: ['text'], exportAs: 'textDir'})
class TextDirective {
  text: string;
  constructor() {}
}

@Component({selector: 'needs-content-children', template: ''})
class NeedsContentChildren implements AfterContentInit {
  @ContentChildren(TextDirective) textDirChildren: QueryList<TextDirective>;
  numberOfChildrenAfterContentInit: number;

  ngAfterContentInit() { this.numberOfChildrenAfterContentInit = this.textDirChildren.length; }
}

@Component({selector: 'needs-view-children', template: '<div text></div>'})
class NeedsViewChildren implements AfterViewInit {
  @ViewChildren(TextDirective) textDirChildren: QueryList<TextDirective>;
  numberOfChildrenAfterViewInit: number;

  ngAfterViewInit() { this.numberOfChildrenAfterViewInit = this.textDirChildren.length; }
}

@Component({selector: 'needs-content-child', template: ''})
class NeedsContentChild implements AfterContentInit, AfterContentChecked {
  /** @internal */
  _child: TextDirective;

  @ContentChild(TextDirective)
  set child(value) {
    this._child = value;
    this.logs.push(['setter', isPresent(value) ? value.text : null]);
  }

  get child() { return this._child; }
  logs: any[] /** TODO #9100 */ = [];

  ngAfterContentInit() { this.logs.push(['init', isPresent(this.child) ? this.child.text : null]); }

  ngAfterContentChecked() {
    this.logs.push(['check', isPresent(this.child) ? this.child.text : null]);
  }
}

@Component({
  selector: 'needs-view-child',
  template: `
    <div *ngIf="shouldShow" text="foo"></div>
  `
})
class NeedsViewChild implements AfterViewInit,
    AfterViewChecked {
  shouldShow: boolean = true;
  shouldShow2: boolean = false;
  /** @internal */
  _child: TextDirective;

  @ViewChild(TextDirective)
  set child(value) {
    this._child = value;
    this.logs.push(['setter', isPresent(value) ? value.text : null]);
  }

  get child() { return this._child; }
  logs: any[] /** TODO #9100 */ = [];

  ngAfterViewInit() { this.logs.push(['init', isPresent(this.child) ? this.child.text : null]); }

  ngAfterViewChecked() {
    this.logs.push(['check', isPresent(this.child) ? this.child.text : null]);
  }
}

@Component({
  selector: 'needs-static-content-view-child',
  template: `
    <div text="viewFoo"></div>
  `
})
class NeedsStaticContentAndViewChild {
  @ContentChild(TextDirective) contentChild: TextDirective;

  @ViewChild(TextDirective) viewChild: TextDirective;
}

@Directive({selector: '[dir]'})
class InertDirective {
  constructor() {}
}

@Component({
  selector: 'needs-query',
  template: '<div text="ignoreme"></div><b *ngFor="let  dir of query">{{dir.text}}|</b>'
})
class NeedsQuery {
  @ContentChildren(TextDirective) query: QueryList<TextDirective>;
}

@Component({selector: 'needs-four-queries', template: ''})
class NeedsFourQueries {
  @ContentChild(TextDirective) query1: TextDirective;
  @ContentChild(TextDirective) query2: TextDirective;
  @ContentChild(TextDirective) query3: TextDirective;
  @ContentChild(TextDirective) query4: TextDirective;
}

@Component({
  selector: 'needs-query-desc',
  template: '<ng-content></ng-content><div *ngFor="let  dir of query">{{dir.text}}|</div>'
})
class NeedsQueryDesc {
  @ContentChildren(TextDirective, {descendants: true}) query: QueryList<TextDirective>;
}

@Component({selector: 'needs-query-by-ref-binding', template: '<ng-content>'})
class NeedsQueryByLabel {
  @ContentChildren('textLabel', {descendants: true}) query: QueryList<any>;
}

@Component({selector: 'needs-view-query-by-ref-binding', template: '<div #textLabel>text</div>'})
class NeedsViewQueryByLabel {
  @ViewChildren('textLabel') query: QueryList<any>;
}

@Component({selector: 'needs-query-by-ref-bindings', template: '<ng-content>'})
class NeedsQueryByTwoLabels {
  @ContentChildren('textLabel1,textLabel2', {descendants: true}) query: QueryList<any>;
}

@Component({
  selector: 'needs-query-and-project',
  template: '<div *ngFor="let  dir of query">{{dir.text}}|</div><ng-content></ng-content>'
})
class NeedsQueryAndProject {
  @ContentChildren(TextDirective) query: QueryList<TextDirective>;
}

@Component({
  selector: 'needs-view-query',
  template: '<div text="1"><div text="2"></div></div>' +
      '<div text="3"></div><div text="4"></div>'
})
class NeedsViewQuery {
  @ViewChildren(TextDirective) query: QueryList<TextDirective>;
}

@Component({selector: 'needs-view-query-if', template: '<div *ngIf="show" text="1"></div>'})
class NeedsViewQueryIf {
  show: boolean;
  @ViewChildren(TextDirective) query: QueryList<TextDirective>;
  constructor() { this.show = false; }
}

@Component({
  selector: 'needs-view-query-nested-if',
  template: '<div text="1"><div *ngIf="show"><div dir></div></div></div>'
})
class NeedsViewQueryNestedIf {
  show: boolean;
  @ViewChildren(TextDirective) query: QueryList<TextDirective>;
  constructor() { this.show = true; }
}

@Component({
  selector: 'needs-view-query-order',
  template: '<div text="1"></div>' +
      '<div *ngFor="let  i of list" [text]="i"></div>' +
      '<div text="4"></div>'
})
class NeedsViewQueryOrder {
  @ViewChildren(TextDirective) query: QueryList<TextDirective>;
  list: string[];
  constructor() { this.list = ['2', '3']; }
}

@Component({
  selector: 'needs-view-query-order-with-p',
  template: '<div dir><div text="1"></div>' +
      '<div *ngFor="let  i of list" [text]="i"></div>' +
      '<div text="4"></div></div>'
})
class NeedsViewQueryOrderWithParent {
  @ViewChildren(TextDirective) query: QueryList<TextDirective>;
  list: string[];
  constructor() { this.list = ['2', '3']; }
}

@Component({selector: 'needs-tpl', template: '<template><div>shadow</div></template>'})
class NeedsTpl {
  @ViewChildren(TemplateRef) viewQuery: QueryList<TemplateRef<Object>>;
  @ContentChildren(TemplateRef) query: QueryList<TemplateRef<Object>>;
  constructor(public vc: ViewContainerRef) {}
}

@Component({selector: 'needs-named-tpl', template: '<template #tpl><div>shadow</div></template>'})
class NeedsNamedTpl {
  @ViewChild('tpl') viewTpl: TemplateRef<Object>;
  @ContentChild('tpl') contentTpl: TemplateRef<Object>;
  constructor(public vc: ViewContainerRef) {}
}

@Component({selector: 'needs-content-children-read', template: ''})
class NeedsContentChildrenWithRead {
  @ContentChildren('q', {read: TextDirective}) textDirChildren: QueryList<TextDirective>;
  @ContentChildren('nonExisting', {read: TextDirective}) nonExistingVar: QueryList<TextDirective>;
}

@Component({selector: 'needs-content-child-read', template: ''})
class NeedsContentChildWithRead {
  @ContentChild('q', {read: TextDirective}) textDirChild: TextDirective;
  @ContentChild('nonExisting', {read: TextDirective}) nonExistingVar: TextDirective;
}

@Component({
  selector: 'needs-view-children-read',
  template: '<div #q text="va"></div><div #w text="vb"></div>',
})
class NeedsViewChildrenWithRead {
  @ViewChildren('q,w', {read: TextDirective}) textDirChildren: QueryList<TextDirective>;
  @ViewChildren('nonExisting', {read: TextDirective}) nonExistingVar: QueryList<TextDirective>;
}

@Component({
  selector: 'needs-view-child-read',
  template: '<div #q text="va"></div>',
})
class NeedsViewChildWithRead {
  @ViewChild('q', {read: TextDirective}) textDirChild: TextDirective;
  @ViewChild('nonExisting', {read: TextDirective}) nonExistingVar: TextDirective;
}

@Component({selector: 'needs-viewcontainer-read', template: '<div #q></div>'})
class NeedsViewContainerWithRead {
  @ViewChild('q', {read: ViewContainerRef}) vc: ViewContainerRef;
  @ViewChild('nonExisting', {read: ViewContainerRef}) nonExistingVar: ViewContainerRef;
  @ContentChild(TemplateRef) template: TemplateRef<Object>;

  createView() { this.vc.createEmbeddedView(this.template); }
}

@Component({selector: 'has-null-query-condition', template: '<div></div>'})
class HasNullQueryCondition {
  @ContentChildren(null) errorTrigger: any;
}

@Component({selector: 'my-comp', template: ''})
class MyComp0 {
  shouldShow: boolean;
  list: any /** TODO #9100 */;
  constructor() {
    this.shouldShow = false;
    this.list = ['1d', '2d', '3d'];
  }
}

@Component({selector: 'my-comp', template: ''})
class MyCompBroken0 {
}
