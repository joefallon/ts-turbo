# Unit Test Implementation Plan — src/core/view.js

This document is a step-by-step checklist and implementation plan for writing
comprehensive unit tests for `src/core/view.js` before converting it to
TypeScript. Follow these steps closely to ensure tests are robust, focused,
and maintainable.

## Goals

- Verify scrolling behavior (anchors, element scrolling, positions).
- Verify focus behavior for anchor targets.
- Verify rendering flow and promise resolution semantics.
- Verify interactions with `delegate` and `renderer` objects.
- Verify attribute toggling (preview flag, visit direction).
- Preserve existing runtime behavior when converting to TypeScript.

## Test environment assumptions

- Tests run in Vitest with a DOM-like environment (jsdom).
- Helpers from `src/util.js` are available and can be used when needed.
- The `Snapshot` class has been converted to TypeScript and is available as
  `Snapshot` in imports; tests may stub or fake snapshots where appropriate.

## Checklist — test cases to implement

1. Scrolling
   - [x] scrollToAnchor(anchor) should find the element via `this.snapshot` and
         call focusElement and scrollToElement when the element exists.
   - [x] scrollToAnchor(anchor) should call scrollToPosition({ x: 0, y: 0 }) when
         the anchor does not exist.
   - [x] scrollToAnchorFromLocation(location) should extract anchor with
         `getAnchor(location)` and call scrollToAnchor with it.
   - [x] scrollToElement(element) should call `element.scrollIntoView()`.
   - [x] scrollToPosition({ x, y }) should call `this.scrollRoot.scrollTo(x, y)`.
   - [x] scrollToTop() delegates to scrollToPosition with `{ x: 0, y: 0 }`.
   - [x] `scrollRoot` getter returns `window` by default; consider mocking when
         asserting scroll behavior.

2. Focus handling
   - [x] focusElement(element) should call `element.focus()` when the element
         already has a `tabindex` attribute.
   - [x] focusElement(element) should temporary set `tabindex="-1"`, call
         focus(), then remove it for elements that lacked tabindex.
   - [x] focusElement should only operate on instances of `HTMLElement`
         (passing non-HTMLElements should be ignored).

3. Rendering flow
   - [x] render(renderer) should call `prepareToRenderSnapshot(renderer)` and
         `renderSnapshot(renderer)` when `renderer.shouldRender` is truthy.
   - [x] When `renderer.shouldRender` is true, `render` should set
         `this.renderPromise` and resolve it via private resolver when complete.
   - [x] The `render` method should call `delegate.allowsImmediateRender(snapshot, options)`
         with the expected options shape.
   - [x] If `delegate.allowsImmediateRender` returns `false`, `render` should
         wait for the interception promise to resolve before rendering.
   - [x] After rendering, `render` should call `delegate.viewRenderedSnapshot(snapshot, isPreview, renderMethod)`
         and `delegate.preloadOnLoadLinksForView(this.element)` and
         `finishRenderingSnapshot(renderer)`.
   - [x] When `renderer.shouldRender` is false but `renderer.willRender` is
         truthy, `render` should call `invalidate(renderer.reloadReason)`.
   - [x] `invalidate(reason)` should call `delegate.viewInvalidated(reason)`.

4. Rendering helpers and lifecycle
   - [x] prepareToRenderSnapshot(renderer) should call `markAsPreview(renderer.isPreview)`
         then `await renderer.prepareToRender()`.
   - [x] renderSnapshot(renderer) should await `renderer.render()`.
   - [x] finishRenderingSnapshot(renderer) should call `renderer.finishRendering()`.

5. Attribute toggles
   - [ ] markAsPreview(true) should set `data-turbo-preview` on `this.element`.
   - [ ] markAsPreview(false) should remove `data-turbo-preview`.
   - [ ] markVisitDirection(direction) should set `data-turbo-visit-direction`.
   - [ ] unmarkVisitDirection() should remove `data-turbo-visit-direction`.

6. Edge cases and negative tests
   - [ ] Passing a non-HTMLElement to focusElement should not throw.
   - [ ] Renderer that rejects or throws during `prepareToRender` or `render`
         should still execute the finalizer in the `finally` block (resolving
         the public promise and deleting internal state).
   - [ ] Ensure private `#resolveRenderPromise` and `#resolveInterceptionPromise`
         behavior persists (resolve called with undefined when done).

7. Delegate/Renderer contract tests
   - [ ] Use minimal mocks/stubs for `delegate` and `renderer` that expose only
         the properties and methods `View` uses. Keep mocks focused on testing
         `View` behavior (e.g., spy on `allowsImmediateRender`, `viewRenderedSnapshot`).
   - [ ] Add tests that assert the `options` object passed to
         `delegate.allowsImmediateRender` contains `resume`, `render`, and
         `renderMethod` as used in the code.

8. Integration-style smoke tests
   - [ ] End-to-end smoke: use a fake renderer that simulates an actual render
         flow (prepareToRender -> render -> finishRendering) and verify all
         delegate hooks and state transitions occur in order.

## Test scaffolding and helpers

- Create a `helpers/view-test-helpers.ts` (or in the test file) to produce
  common fixtures:
  - `createView({ element?, delegateOverrides?, rendererOverrides? })` that
    returns an instantiated View with spies and stubs wired up.
  - `fakeRenderer({ shouldRender = true, isPreview = false, willRender = false })`
    returns a minimal renderer object implementing prepareToRender(), render(),
    finishRendering(), and properties used by `View`.
- Use `vi.fn()` to create spies for delegate methods and to observe call args.
- Use `jest.fn` style matchers from Vitest (`expect(spy).toHaveBeenCalledWith(...)`).

## Quality gates

- All new tests should pass locally with `pnpm run test`.
- Keep test runtime small by targeting only the file under test when iterating.
- Add tests incrementally and run them frequently.

## Notes about TypeScript conversion

- When converting `view.js` to `view.ts`, the tests should continue to import
  the transpiled module in the same way (no changes to public JS behavior).
- Prefer to add minimal interfaces for `delegate` and `renderer` directly in
  tests to avoid depending on the internal types until the conversion is done.

---

This checklist focuses on unit-level behavior and a few small integration
smoke-tests to validate end-to-end flows. I can now implement the tests from
this checklist in `src/core/view.test.ts` and run them. Tell me if you want me
to proceed to add the test file now, or if you'd rather review/modify the plan.
