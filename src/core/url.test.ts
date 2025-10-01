import { describe, it, expect } from "vitest";
import { config } from "./config";
import {
    addTrailingSlash,
    expandURL,
    getAction,
    getAnchor,
    getExtension,
    getLastPathComponent,
    getPathComponents,
    getRequestURL,
    isPrefixedBy,
    locationIsVisitable,
    toCacheKey,
    urlsAreEqual,
} from "./url";


describe("getAnchor", () => {
    it("returns the hash without the leading # when hash is present", () => {
        const url = new URL("https://example.com/path#section1");
        expect(getAnchor(url)).toBe("section1");
    });

    it("returns an empty string when hash is present but empty", () => {
        const url = new URL("https://example.com/path#");
        expect(getAnchor(url)).toBe("");
    });

    it("returns null/undefined when no hash is present", () => {
        // The implementation returns undefined when there's no match
        const url = new URL("https://example.com/path");
        expect(getAnchor(url)).toBeUndefined();
    });

    it("falls back to extracting anchor from href when url.hash is empty (edge case)", () => {
        // Simulate a URL-like object with empty hash but href contains anchor
        const urlLike = { href: "https://example.com/path#fallback", hash: "" };
        expect(getAnchor(urlLike as any)).toBe("fallback");
    });

    it("handles anchors with encoded characters", () => {
        const url = new URL("https://example.com/path#space%20here");
        // Note: URL.hash returns decoded percent-encoded? URL.hash keeps percent-encoding;
        // getAnchor returns raw slice
        expect(getAnchor(url)).toBe("space%20here");
    });

    it(
        "handles multiple # characters and returns everything after the first # in href fallback",
        () => {
            const urlLike = { href: "https://example.com/path#one#two", hash: "" };
            expect(getAnchor(urlLike as any)).toBe("one#two");
        }
    );
});

describe("expandURL", () => {
    it("returns a URL instance for an absolute URL string", () => {
        const url = expandURL("https://example.com/abc");
        expect(url).toBeInstanceOf(URL);
        expect(url.href).toBe("https://example.com/abc");
    });

    it("expands a relative path using document.baseURI", () => {
        // Set a fake base for the test environment
        const originalBase = document.baseURI;
        try {
            Object.defineProperty(document, "baseURI", {
                value: "https://example.com/base/",
                configurable: true,
            });
            const url = expandURL("page.html");
            expect(url.href).toBe("https://example.com/base/page.html");
        } finally {
            Object.defineProperty(document, "baseURI", { value: originalBase, configurable: true });
        }
    });

    it("handles objects with toString() gracefully", () => {
        const locatable = { toString() { return "/from-toString"; } };
        const url = expandURL(locatable as any);
        // baseURI in the environment is probably file or http; ensure the URL contains the path
        const endsWithFromToString = url.pathname.endsWith("/from-toString");
        const includesFromToString = url.href.includes("/from-toString");
        expect(endsWithFromToString || includesFromToString).toBe(true);
    });
});

describe("getAction", () => {
    it("uses the submitter's formaction when present", () => {
        const form = document.createElement("form");
        form.setAttribute("action", "https://example.com/form-action");

        const submitter = document.createElement("button");
        submitter.setAttribute("formaction", "https://example.com/submitter-action");

        const actionURL = getAction(form, submitter);
        expect(actionURL.href).toBe("https://example.com/submitter-action");
    });

    it("falls back to the form's action attribute when submitter has no formaction", () => {
        const form = document.createElement("form");
        form.setAttribute("action", "https://example.com/form-action");

        const submitter = document.createElement("button");

        const actionURL = getAction(form, submitter);
        expect(actionURL.href).toBe("https://example.com/form-action");
    });

    it("falls back to the form.action property when attribute missing", () => {
        const form = document.createElement("form");
        // form.action defaults to the document URL, but we can set it directly
        (form as any).action = "https://example.com/property-action";

        const submitter = document.createElement("button");

        const actionURL = getAction(form, submitter);
        expect(actionURL.href).toBe("https://example.com/property-action");
    });

    it("expands relative actions against document.baseURI", () => {
        const originalBase = document.baseURI;
        try {
            Object.defineProperty(document, "baseURI", {
                value: "https://example.com/base/",
                configurable: true,
            });
            const form = document.createElement("form");
            form.setAttribute("action", "page.html");

            const actionURL = getAction(form, null);
            expect(actionURL.href).toBe("https://example.com/base/page.html");
        } finally {
            Object.defineProperty(document, "baseURI", { value: originalBase, configurable: true });
        }
    });
});

describe("getExtension", () => {
    it("returns the extension for a file with one", () => {
        const url = new URL("https://example.com/file.txt");
        expect(getExtension(url)).toBe(".txt");
    });

    it("returns the last extension for a file with multiple dots", () => {
        const url = new URL("https://example.com/archive.tar.gz");
        expect(getExtension(url)).toBe(".gz");
    });

    it("returns an empty string for a file with no extension", () => {
        const url = new URL("https://example.com/file");
        expect(getExtension(url)).toBe("");
    });

    it("returns an empty string for a directory path", () => {
        const url = new URL("https://example.com/path/to/dir/");
        expect(getExtension(url)).toBe("");
    });

    it("returns the extension for a hidden file", () => {
        const url = new URL("https://example.com/.env");
        expect(getExtension(url)).toBe(".env");
    });

    it("returns the extension for a file with query and hash", () => {
        const url = new URL("https://example.com/file.js?x=1#top");
        expect(getExtension(url)).toBe(".js");
    });
});

describe("isPrefixedBy", () => {

    it("returns true for exact match", () => {
        const base = new URL("https://example.com/foo/bar");
        const url = new URL("https://example.com/foo/bar");
        expect(isPrefixedBy(base, url)).toBe(true);
    });

    it("returns true when base is a prefix of url", () => {
        const base = new URL("https://example.com/foo/");
        const url = new URL("https://example.com/foo/bar/baz");
        expect(isPrefixedBy(base, url)).toBe(true);
    });

    it("returns false when base is not a prefix", () => {
        const base = new URL("https://example.com/foo/bar");
        const url = new URL("https://example.com/foo/baz");
        expect(isPrefixedBy(base, url)).toBe(false);
    });

    it("handles trailing slashes correctly", () => {
        const base = new URL("https://example.com/foo/bar/");
        const url = new URL("https://example.com/foo/bar");
        expect(isPrefixedBy(base, url)).toBe(true);
    });

    it("returns true for root path", () => {
        const base = new URL("https://example.com/");
        const url = new URL("https://example.com/foo/bar");
        expect(isPrefixedBy(base, url)).toBe(true);
    });

    it("returns false for different origins", () => {
        const base = new URL("https://example.com/foo");
        const url = new URL("https://other.com/foo/bar");
        expect(isPrefixedBy(base, url)).toBe(false);
    });
});

describe("locationIsVisitable", () => {
    it("returns true when location is prefixed by root and extension is visitable", () => {
        const root = new URL("https://example.com/");
        const location = new URL("https://example.com/page.html");
        expect(locationIsVisitable(location, root)).toBe(true);
    });

    it("returns false when the extension is unvisitable", () => {
        const root = new URL("https://example.com/");
        const location = new URL("https://example.com/image.jpg");
        const original = new Set(config.drive.unvisitableExtensions);
        try {
            config.drive.unvisitableExtensions.add(".jpg");
            expect(locationIsVisitable(location, root)).toBe(false);
        } finally {
            config.drive.unvisitableExtensions.clear();
            original.forEach((e: string) => config.drive.unvisitableExtensions.add(e));
        }
    });

    it("returns false when location is not prefixed by root", () => {
        const root = new URL("https://example.com/base/");
        const location = new URL("https://example.com/other/page.html");
        expect(locationIsVisitable(location, root)).toBe(false);
    });

    it("returns false for different origin", () => {
        const root = new URL("https://example.com/");
        const location = new URL("https://other.com/page.html");
        expect(locationIsVisitable(location, root)).toBe(false);
    });
});

describe("getRequestURL", () => {
    it("removes the anchor from the URL when present", () => {
        const url = new URL("https://example.com/page.html#section1");
        expect(getRequestURL(url)).toBe("https://example.com/page.html");
    });

    it("returns the full href when there is no anchor", () => {
        const url = new URL("https://example.com/page.html");
        expect(getRequestURL(url)).toBe("https://example.com/page.html");
    });

    it("handles empty anchor (#) by removing the trailing #", () => {
        const url = new URL("https://example.com/page.html#");
        expect(getRequestURL(url)).toBe("https://example.com/page.html");
    });

    it("works with URL-like objects that have href and hash", () => {
        const urlLike = { href: "https://example.com/page.html#frag", hash: "#frag" };
        expect(getRequestURL(urlLike as any)).toBe("https://example.com/page.html");
    });

    it("handles encoded anchors correctly", () => {
        const url = new URL("https://example.com/page.html#space%20here");
        expect(getRequestURL(url)).toBe("https://example.com/page.html");
    });
});

describe("toCacheKey", () => {
    it("returns the same string as getRequestURL for a URL instance", () => {
        const url = new URL("https://example.com/page.html#section1");
        expect(toCacheKey(url as any)).toBe(getRequestURL(url as any));
    });

    it("works with URL-like objects that have href and hash", () => {
        const urlLike = { href: "https://example.com/page.html#frag", hash: "#frag" };
        expect(toCacheKey(urlLike as any)).toBe(getRequestURL(urlLike as any));
    });

    it("handles empty anchor (#) by removing the trailing #", () => {
        const url = new URL("https://example.com/page.html#");
        expect(toCacheKey(url as any)).toBe("https://example.com/page.html");
    });
});

describe("urlsAreEqual", () => {
    it("returns true for equal absolute URL strings", () => {
        expect(urlsAreEqual("https://example.com/page", new URL("https://example.com/page"))).toBe(true);
    });

    it("returns true for different locatable types that normalize to the same href", () => {
        const locatable = { toString() { return "https://example.com/page"; } };
        expect(urlsAreEqual(locatable as any, "https://example.com/page")).toBe(true);
    });

    it("returns false for different URLs", () => {
        expect(urlsAreEqual("https://example.com/a", "https://example.com/b")).toBe(false);
    });

    it("handles relative URLs by expanding with document.baseURI", () => {
        const originalBase = document.baseURI;
        try {
            Object.defineProperty(document, "baseURI", {
                value: "https://example.com/base/",
                configurable: true,
            });

            expect(urlsAreEqual("page.html", "https://example.com/base/page.html")).toBe(true);
        } finally {
            Object.defineProperty(document, "baseURI", { value: originalBase, configurable: true });
        }
    });
});

describe("getPathComponents", () => {
    it("returns an empty-ish component for root path", () => {
        const url = new URL("https://example.com/");
        expect(getPathComponents(url)).toEqual([""]);
    });

    it("splits a normal path into components", () => {
        const url = new URL("https://example.com/a/b");
        expect(getPathComponents(url)).toEqual(["a", "b"]);
    });

    it("includes an empty component for trailing slash", () => {
        const url = new URL("https://example.com/a/b/");
        expect(getPathComponents(url)).toEqual(["a", "b", ""]);
    });

    it("handles hidden files as a single component", () => {
        const url = new URL("https://example.com/.env");
        expect(getPathComponents(url)).toEqual([".env"]);
    });

    it("ignores query and hash when splitting path", () => {
        const url = new URL("https://example.com/a/b?x=1#y");
        expect(getPathComponents(url)).toEqual(["a", "b"]);
    });
});

describe("getLastPathComponent", () => {
    it("returns an empty string for root path", () => {
        const url = new URL("https://example.com/");
        expect(getLastPathComponent(url)).toBe("");
    });

    it("returns the last segment for a normal path", () => {
        const url = new URL("https://example.com/a/b");
        expect(getLastPathComponent(url)).toBe("b");
    });

    it("returns an empty string when path ends with a slash", () => {
        const url = new URL("https://example.com/a/b/");
        expect(getLastPathComponent(url)).toBe("");
    });

    it("returns hidden file name", () => {
        const url = new URL("https://example.com/.env");
        expect(getLastPathComponent(url)).toBe(".env");
    });

    it("returns filename with extension", () => {
        const url = new URL("https://example.com/file.txt");
        expect(getLastPathComponent(url)).toBe("file.txt");
    });
});

describe("addTrailingSlash", () => {
    it("adds a trailing slash when missing", () => {
        expect(addTrailingSlash("/path/to/resource")).toBe("/path/to/resource/");
    });

    it("leaves a trailing slash when present", () => {
        expect(addTrailingSlash("/path/to/resource/")).toBe("/path/to/resource/");
    });

    it("works with an empty string", () => {
        expect(addTrailingSlash("")).toBe("/");
    });
});