import { describe, it, expect, vi } from "vitest";
import * as urlModule from "./url";
import { View } from "./view";

function makeFakeSnapshot(anchorElement = null) {
    return {
        getElementForAnchor: (anchor) => { return anchor === "exists" ? anchorElement : null; }
    };
}

function createView({ snapshot = null } = {}) {
    const delegate = {
        allowsImmediateRender: vi.fn(() => true),
        viewRenderedSnapshot: vi.fn(),
        preloadOnLoadLinksForView: vi.fn(),
        viewInvalidated: vi.fn()
    };

    const root = document.createElement("div");
    const view = new View(delegate, root);

    // Attach a fake snapshot if provided
    if (snapshot) (view as any).snapshot = snapshot;

    return { view, delegate, root };
}

describe("View#scrollToAnchor", () => {
    it("focuses and scrolls to the element when snapshot returns it", () => {
        const el = document.createElement("div");
        el.focus = vi.fn();
        el.scrollIntoView = vi.fn();
        // ensure it's an HTMLElement
        const snapshot = makeFakeSnapshot(el);

        const { view } = createView({ snapshot });

        // spy on focusElement and scrollToElement
        const focusSpy = vi.spyOn(view, "focusElement");
        const scrollSpy = vi.spyOn(view, "scrollToElement");

        view.scrollToAnchor("exists");

        expect(focusSpy).toHaveBeenCalledWith(el);
        expect(scrollSpy).toHaveBeenCalledWith(el);
    });

    it("calls scrollToPosition({ x: 0, y: 0 }) when anchor does not exist", () => {
        const snapshot = makeFakeSnapshot(null);
        const { view } = createView({ snapshot });

        const posSpy = vi.spyOn(view, "scrollToPosition");

        view.scrollToAnchor("notfound");

        expect(posSpy).toHaveBeenCalledWith({ x: 0, y: 0 });
    });
});

describe("View#scrollToAnchorFromLocation", () => {
    it("extracts anchor with getAnchor and calls scrollToAnchor with it", () => {
        const { view } = createView({});
        // Attach a fake snapshot to avoid undefined error
        (view as any).snapshot = makeFakeSnapshot();
        const fakeLocation = { href: "https://example.com/page#foo" };

        // Mock getAnchor to return a known value
        const getAnchorSpy = vi.spyOn(urlModule, "getAnchor").mockReturnValue("foo-anchor");
        const scrollToAnchorSpy = vi.spyOn(view, "scrollToAnchor");

        view.scrollToAnchorFromLocation(fakeLocation);

        expect(getAnchorSpy).toHaveBeenCalledWith(fakeLocation);
        expect(scrollToAnchorSpy).toHaveBeenCalledWith("foo-anchor");

        getAnchorSpy.mockRestore();
    });
});

describe("View#scrollToElement", () => {
    it("calls element.scrollIntoView()", () => {
        const { view } = createView({});
        const el = document.createElement("div");
        el.scrollIntoView = vi.fn();

        view.scrollToElement(el);

        expect(el.scrollIntoView).toHaveBeenCalled();
    });
});

describe("View#scrollToPosition", () => {
    it("calls this.scrollRoot.scrollTo(x, y)", () => {
        const { view } = createView({});
        // Mock scrollRoot to a fake object with a spy
        const fakeScrollRoot = { scrollTo: vi.fn() };
        Object.defineProperty(view, "scrollRoot", {
            get: () => fakeScrollRoot
        });

        view.scrollToPosition({ x: 10, y: 20 });

        expect(fakeScrollRoot.scrollTo).toHaveBeenCalledWith(10, 20);
    });
});

describe("View#scrollToTop", () => {
    it("delegates to scrollToPosition with { x: 0, y: 0 }", () => {
        const { view } = createView({});
        const posSpy = vi.spyOn(view, "scrollToPosition");

        view.scrollToTop();

        expect(posSpy).toHaveBeenCalledWith({ x: 0, y: 0 });
    });
});

describe("View#scrollRoot", () => {
    it("returns window by default", () => {
        const { view } = createView({});
        expect(view.scrollRoot).toBe(window);
    });
});

describe("View#focusElement", () => {
    it("calls element.focus() when element has tabindex attribute", () => {
        const { view } = createView({});
        const el = document.createElement("div");
        el.setAttribute("tabindex", "0");
        el.focus = vi.fn();

        view.focusElement(el);

        expect(el.focus).toHaveBeenCalled();
    });
});

describe("View#focusElement (tabindex handling)", () => {
    it("temporarily sets tabindex='-1', calls focus(), then removes it if element " +
        "lacked tabindex", () => {
            const { view } = createView({});
            const el = document.createElement("div");
            // No tabindex initially
            el.focus = vi.fn();

            view.focusElement(el);

            // tabindex should have been set to -1 before focus
            // and removed after focus
            expect(el.focus).toHaveBeenCalled();
            expect(el.hasAttribute("tabindex")).toBe(false);
        });
});

describe("View#focusElement (non-HTMLElement)", () => {
    it("does nothing and does not throw when passed a non-HTMLElement", () => {
        const { view } = createView({});
        // Create a plain object, not an HTMLElement
        const notAnElement = { focus: vi.fn(), setAttribute: vi.fn(), removeAttribute: vi.fn() };

        // Should not throw
        expect(() => view.focusElement(notAnElement)).not.toThrow();
        // Should not call focus
        expect(notAnElement.focus).not.toHaveBeenCalled();
        expect(notAnElement.setAttribute).not.toHaveBeenCalled();
        expect(notAnElement.removeAttribute).not.toHaveBeenCalled();
    });
});

describe("View#render", () => {
    it("calls prepareToRenderSnapshot and renderSnapshot when renderer.shouldRender is true", async () => {
        const { view } = createView({});
        // Spy on the methods
        const prepSpy = vi.spyOn(view, "prepareToRenderSnapshot").mockResolvedValue(undefined);
        const renderSnapSpy = vi.spyOn(view, "renderSnapshot").mockResolvedValue(undefined);

        const renderer = {
            shouldRender: true,
            isPreview: false,
            willRender: false,
            prepareToRender: vi.fn().mockResolvedValue(undefined),
            render: vi.fn().mockResolvedValue(undefined),
            finishRendering: vi.fn()
        };

        await view.render(renderer);

        expect(prepSpy).toHaveBeenCalledWith(renderer);
        expect(renderSnapSpy).toHaveBeenCalledWith(renderer);

        prepSpy.mockRestore();
        renderSnapSpy.mockRestore();
    });
});

describe("View#render (renderPromise)", () => {
    it("sets renderPromise and resolves it when shouldRender is true", async () => {
        const { view } = createView({});
        // Use spies to allow the render flow to proceed
        vi.spyOn(view, "prepareToRenderSnapshot").mockResolvedValue(undefined);
        vi.spyOn(view, "renderSnapshot").mockResolvedValue(undefined);

        const renderer = {
            shouldRender: true,
            isPreview: false,
            willRender: false,
            prepareToRender: vi.fn().mockResolvedValue(undefined),
            render: vi.fn().mockResolvedValue(undefined),
            finishRendering: vi.fn()
        };

        // Before render, renderPromise should be undefined
        expect(view.renderPromise).toBeUndefined();

        const renderResult = view.render(renderer);
        // After calling render, renderPromise should be set (before await)
        expect(view.renderPromise).toBeInstanceOf(Promise);

        // Await the render to complete
        await renderResult;

        // After completion, renderPromise should be undefined (deleted)
        expect(view.renderPromise).toBeUndefined();
    });
});

describe("View#render (post-render hooks)", () => {
    it("calls viewRenderedSnapshot, preloadOnLoadLinksForView, and finishRenderingSnapshot after rendering", async () => {
        const viewRenderedSnapshot = vi.fn();
        const preloadOnLoadLinksForView = vi.fn();
        // We'll spy on finishRenderingSnapshot via the prototype
        const finishRenderingSnapshotSpy = vi.spyOn(View.prototype, "finishRenderingSnapshot");

        const { view } = createView();
        // Patch the delegate to use our spies
        (view as any).delegate = {
            ...((view as any).delegate),
            viewRenderedSnapshot,
            preloadOnLoadLinksForView
        };
        vi.spyOn(view, "prepareToRenderSnapshot").mockResolvedValue(undefined);
        vi.spyOn(view, "renderSnapshot").mockResolvedValue(undefined);

        const renderer = {
            shouldRender: true,
            isPreview: false,
            willRender: false,
            prepareToRender: vi.fn().mockResolvedValue(undefined),
            render: vi.fn().mockResolvedValue(undefined),
            finishRendering: vi.fn()
        };

        await view.render(renderer);

        // Check that all hooks were called
        expect(viewRenderedSnapshot).toHaveBeenCalled();
        expect(preloadOnLoadLinksForView).toHaveBeenCalledWith(view.element);
        expect(finishRenderingSnapshotSpy).toHaveBeenCalledWith(renderer);

        // Optionally, check arguments for viewRenderedSnapshot
        const [snapshotArg, isPreviewArg, renderMethodArg] = viewRenderedSnapshot.mock.calls[0];
        expect(snapshotArg).toBe((view as any).snapshot);
        expect(typeof isPreviewArg).toBe("boolean");
        // renderMethod is usually a string, but may be undefined in some flows
        if (renderMethodArg !== undefined) {
            expect(typeof renderMethodArg).toBe("string");
        }

        finishRenderingSnapshotSpy.mockRestore();
    });
});

describe("View#render (interception)", () => {
    it("waits for interception via options.resume if allowsImmediateRender returns false", async () => {
        let resumeFn;
        const allowsImmediateRender = vi.fn((_snapshot, options) => {
            resumeFn = options.resume;
            return false;
        });
        const { view } = createView();
        (view as any).delegate = { ...((view as any).delegate), allowsImmediateRender };
        const renderSnapshotSpy = vi.spyOn(view, "renderSnapshot").mockResolvedValue(undefined);
        vi.spyOn(view, "prepareToRenderSnapshot").mockResolvedValue(undefined);

        const renderer = {
            shouldRender: true,
            isPreview: false,
            willRender: false,
            prepareToRender: vi.fn().mockResolvedValue(undefined),
            render: vi.fn().mockResolvedValue(undefined),
            finishRendering: vi.fn()
        };

        // Start render, but do not call resume yet
        const renderPromise = view.render(renderer);
        await Promise.resolve(); // allow microtasks to flush
        expect(renderSnapshotSpy).not.toHaveBeenCalled();

        // Wait for resumeFn to be set (allowsImmediateRender called)
        while (!resumeFn) {
            await new Promise(r => setTimeout(r, 1));
        }
        // Now call resume to allow rendering to proceed
        resumeFn();
        await renderPromise;
        expect(renderSnapshotSpy).toHaveBeenCalled();
    });
});

describe("View#render (delegate.allowsImmediateRender)", () => {
    it("calls delegate.allowsImmediateRender with snapshot and correct options shape", async () => {
        const allowsImmediateRender = vi.fn().mockReturnValue(true);
        const { view } = createView();
        // Patch the delegate to use our spy
        (view as any).delegate = { ...((view as any).delegate), allowsImmediateRender };
        vi.spyOn(view, "prepareToRenderSnapshot").mockResolvedValue(undefined);
        vi.spyOn(view, "renderSnapshot").mockResolvedValue(undefined);

        const renderer = {
            shouldRender: true,
            isPreview: false,
            willRender: false,
            prepareToRender: vi.fn().mockResolvedValue(undefined),
            render: vi.fn().mockResolvedValue(undefined),
            finishRendering: vi.fn()
        };

        await view.render(renderer);

        expect(allowsImmediateRender).toHaveBeenCalled();
        const [snapshotArg, optionsArg] = allowsImmediateRender.mock.calls[0];
        // snapshot is stored as a private property, so access via (view as any)
        expect(snapshotArg).toBe((view as any).snapshot);
        expect(optionsArg).toBeDefined();
        expect(typeof optionsArg.resume).toBe("function");
        // renderMethod may not be present in all implementations; if present it should be a string
        if (optionsArg.renderMethod !== undefined) {
            expect(typeof optionsArg.renderMethod).toBe("string");
        }
    });
});

describe("View#render (invalidate on willRender)", () => {
    it("calls invalidate with reloadReason when shouldRender is false and willRender is true", async () => {
        const { view } = createView();
        const invalidateSpy = vi.spyOn(view, "invalidate");

        const renderer = {
            shouldRender: false,
            willRender: true,
            reloadReason: "test-reason",
            isPreview: false,
            prepareToRender: vi.fn().mockResolvedValue(undefined),
            render: vi.fn().mockResolvedValue(undefined),
            finishRendering: vi.fn()
        };

        await view.render(renderer);
        expect(invalidateSpy).toHaveBeenCalledWith("test-reason");
    });
});


describe("View#invalidate", () => {
    it("calls delegate.viewInvalidated with the given reason", () => {
        const viewInvalidated = vi.fn();
        const { view } = createView();
        (view as any).delegate = { ...((view as any).delegate), viewInvalidated };
        const reason = "test-reason";
        view.invalidate(reason);
        expect(viewInvalidated).toHaveBeenCalledWith(reason);
    });
});


describe("View#prepareToRenderSnapshot", () => {
    it("calls markAsPreview with renderer.isPreview, then awaits renderer.prepareToRender", async () => {
        const { view } = createView();
        const markAsPreviewSpy = vi.spyOn(view, "markAsPreview");
        const prepareToRenderSpy = vi.fn().mockResolvedValue(undefined);
        const renderer = {
            isPreview: true,
            prepareToRender: prepareToRenderSpy
        };

        await view.prepareToRenderSnapshot(renderer);

        expect(markAsPreviewSpy).toHaveBeenCalledWith(true);
        expect(prepareToRenderSpy).toHaveBeenCalled();
        // Optionally, check call order: markAsPreview should be called before prepareToRender
        expect(markAsPreviewSpy.mock.invocationCallOrder[0]).toBeLessThan(prepareToRenderSpy.mock.invocationCallOrder[0]);
    });
});

describe("View#render (interception)", () => {
    it("waits for interception via options.resume if allowsImmediateRender returns false", async () => {
        let resumeFn;
        const allowsImmediateRender = vi.fn((_snapshot, options) => {
            resumeFn = options.resume;
            return false;
        });
        const { view } = createView();
        (view as any).delegate = { ...((view as any).delegate), allowsImmediateRender };
        const renderSnapshotSpy = vi.spyOn(view, "renderSnapshot").mockResolvedValue(undefined);
        vi.spyOn(view, "prepareToRenderSnapshot").mockResolvedValue(undefined);

        const renderer = {
            shouldRender: true,
            isPreview: false,
            willRender: false,
            prepareToRender: vi.fn().mockResolvedValue(undefined),
            render: vi.fn().mockResolvedValue(undefined),
            finishRendering: vi.fn()
        };

        // Start render, but do not call resume yet
        const renderPromise = view.render(renderer);
        await Promise.resolve(); // allow microtasks to flush
        expect(renderSnapshotSpy).not.toHaveBeenCalled();

        // Wait for resumeFn to be set (allowsImmediateRender called)
        while (!resumeFn) {
            await new Promise(r => setTimeout(r, 1));
        }
        // Now call resume to allow rendering to proceed
        resumeFn();
        await renderPromise;
        expect(renderSnapshotSpy).toHaveBeenCalled();
    });
});

describe("View#render (delegate.allowsImmediateRender)", () => {
    it("calls delegate.allowsImmediateRender with snapshot and correct options shape", async () => {
        const allowsImmediateRender = vi.fn().mockReturnValue(true);
        const { view } = createView();
        // Patch the delegate to use our spy
        (view as any).delegate = { ...((view as any).delegate), allowsImmediateRender };
        vi.spyOn(view, "prepareToRenderSnapshot").mockResolvedValue(undefined);
        vi.spyOn(view, "renderSnapshot").mockResolvedValue(undefined);

        const renderer = {
            shouldRender: true,
            isPreview: false,
            willRender: false,
            prepareToRender: vi.fn().mockResolvedValue(undefined),
            render: vi.fn().mockResolvedValue(undefined),
            finishRendering: vi.fn()
        };

        await view.render(renderer);

        expect(allowsImmediateRender).toHaveBeenCalled();
        const [snapshotArg, optionsArg] = allowsImmediateRender.mock.calls[0];
        // snapshot is stored as a private property, so access via (view as any)
        expect(snapshotArg).toBe((view as any).snapshot);
        expect(optionsArg).toBeDefined();
        expect(typeof optionsArg.resume).toBe("function");
        // renderMethod may not be present in all implementations; if present it should be a string
        if (optionsArg.renderMethod !== undefined) {
            expect(typeof optionsArg.renderMethod).toBe("string");
        }
    });
});

describe("View#renderSnapshot", () => {
    it("awaits renderer.render()", async () => {
        const { view } = createView();
        const renderSpy = vi.fn().mockResolvedValue("done");
        const renderer = { render: renderSpy };
        await view.renderSnapshot(renderer);
        expect(renderSpy).toHaveBeenCalled();
    });
});

describe("View#finishRenderingSnapshot", () => {
    it("calls renderer.finishRendering()", () => {
        const { view } = createView();
        const finishRenderingSpy = vi.fn();
        const renderer = { finishRendering: finishRenderingSpy };
        view.finishRenderingSnapshot(renderer);
        expect(finishRenderingSpy).toHaveBeenCalled();
    });
});