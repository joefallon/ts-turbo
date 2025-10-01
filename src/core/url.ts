import { config } from "./config"

/**
 * Represents a value that can be used as a location or URL.
 *
 * This type accepts:
 * - A string representing a URL or path.
 * - A `URL` object.
 * - Any object that implements a `toString()` method returning a string representation of the 
 *   location.
 */
export type Locatable = string | URL | { toString(): string }

/**
 * Convert a locatable value into a fully-qualified URL instance.
 *
 * Accepts a string, an existing URL, or an object with a `toString()` method.
 * Relative values are resolved against `document.baseURI` (test-friendly).
 *
 * @param locatable - Something that can be converted to a URL string.
 * @returns A normalized `URL` instance representing the input.
 */
export function expandURL(locatable: Locatable): URL {
    const input = (locatable === undefined || locatable === null) ? "" : locatable.toString();

    return new URL(input, document.baseURI);
}

/**
 * Represents an object similar to a URL, containing at least an `href` property.
 *
 * @property href - The full URL as a string.
 * @property hash - (Optional) The fragment identifier of the URL, including the leading '#' 
 *                  character.
 */
export type URLLike = { href: string; hash?: string }

/**
 * Extracts the anchor (fragment identifier) from a given URL or URLLike object.
 *
 * This function first attempts to retrieve the anchor using the `hash` property of the URL,
 * which includes the leading `#` character. If the `hash` property is present and non-empty,
 * it returns the anchor without the leading `#`. If the `hash` property is missing or empty,
 * the function falls back to extracting the anchor from the `href` property using a regular 
 * expression.
 *
 * @param url - The URL or URLLike object from which to extract the anchor. This object should have
 *              at least `hash` and `href` properties similar to the standard `URL` interface.
 * @returns The anchor string (fragment identifier) without the leading `#`, or `undefined` if no 
 * anchor is present.
 *
 * @example
 * ```typescript
 * const url = new URL('https://example.com/page#section1');
 * const anchor = getAnchor(url); // Returns 'section1'
 * ```
 *
 * @remarks
 * - If the URL does not contain a fragment identifier, the function returns `undefined`.
 * - The function is resilient to both standard `URL` objects and custom URL-like objects.
 */
export function getAnchor(url: URL | URLLike): string | undefined {
    // Prefer the URL.hash when available (includes the leading '#').
    if (url.hash && url.hash.length > 0) {
        return url.hash.slice(1);
    }

    // Fallback: if hash is missing or empty, extract from href using regex.
    const href = url.href || "";
    const match = href.match(/#(.*)$/);

    if (match) {
        return match[1];
    }

    return undefined;
}

/**
 * Determine the action URL for a form submission.
 *
 * Resolution order (highest to lowest):
 * 1. The submitter's `formaction` attribute (if provided on the submit element).
 * 2. The form's `action` attribute (the literal attribute on the <form> tag).
 * 3. The form.action property (browser-resolved default).
 *
 * The chosen value is converted to a fully-qualified `URL` by `expandURL`, which
 * resolves relative values against `document.baseURI`.
 *
 * @param form - The HTMLFormElement that is being submitted.
 * @param submitter - The element that triggered submission (optional). If present,
 *                    its `formaction` attribute takes precedence when non-empty.
 * @returns A `URL` instance representing the resolved action.
 */
export function getAction(form: HTMLFormElement, submitter?: HTMLElement | null): URL {
    const submitterAction = submitter?.getAttribute("formaction") ?? null;
    const formActionAttr = form.getAttribute("action");

    // Prefer the explicit submitter `formaction`, then the form attribute, then
    // the form.action property.
    const chosen = submitterAction ?? formActionAttr ?? form.action;

    return expandURL(chosen.toString());
}

/**
 * Return the file extension (including the leading dot) of the last path
 * component, or an empty string when none exists.
 *
 * Examples: 
 * - /path/file.txt -> ".txt"
 * - /path/archive.tar.gz -> ".gz" (last extension)
 * - /path/dir/ -> "" (directory)
 *
 * @param url - The URL to inspect.
 * @returns The extension string including the leading dot, or '' when none.
 */
export function getExtension(url: URL): string {
    const last = getLastPathComponent(url);
    const match = last.match(/\.[^.]*$/);

    return match ? match[0] : "";
}

/**
 * Determines whether the given `url` is prefixed by the `baseURL`.
 *
 * This checks if both URLs share the same origin (protocol, host, and port), and then compares
 * their pathnames. The function ensures both pathnames end with a trailing slash, so that
 * directory boundaries are respected (e.g., `/foo/` does not prefix `/foobar/`).
 *
 * @param baseURL - The base URL to check as a prefix. Must be a fully-qualified URL.
 * @param url - The URL to test for being prefixed by `baseURL`. Must be a fully-qualified URL.
 * @returns `true` if `url` shares the same origin as `baseURL` and its path starts with the
 *          normalized base path; otherwise, `false`.
 *
 * @example
 * ```typescript
 * isPrefixedBy(new URL('https://a.com/foo'), new URL('https://a.com/foo/bar'));
 * #true
 * isPrefixedBy(new URL('https://a.com/foo'), new URL('https://a.com/foobar'));
 * #false
 * isPrefixedBy(new URL('https://a.com/'), new URL('https://a.com/'));
 * #true
 * isPrefixedBy(new URL('https://a.com/'), new URL('https://b.com/'));
 * #false
 * ```
 */
export function isPrefixedBy(baseURL: URL, url: URL): boolean {
    // Origins must match exactly (protocol, host, port)
    if (baseURL.origin !== url.origin) {
        return false;
    }

    // Normalize both paths to ensure trailing slashes for directory boundary correctness
    const basePath: string = addTrailingSlash(baseURL.pathname);
    const urlPath: string = addTrailingSlash(url.pathname);

    // Check if urlPath starts with basePath (directory prefix)
    return urlPath.startsWith(basePath);
}

/**
 * Determines if a given location URL is visitable within the context of a root location.
 *
 * A location is considered visitable if:
 *   1. Its origin and path are prefixed by the root location (see `isPrefixedBy`).
 *   2. Its file extension is not in the set of unvisitable extensions (see config).
 *
 * @param location - The URL to check for visitability.
 * @param rootLocation - The root URL that defines the visitable scope.
 * @returns `true` if the location is visitable, `false` otherwise.
 *
 * @example
 * ```typescript
 * locationIsVisitable(new URL('https://a.com/foo/bar'), new URL('https://a.com/foo/'));
 * #true (if extension is not unvisitable)
 * locationIsVisitable(new URL('https://a.com/foo/file.pdf'), new URL('https://a.com/foo/'));
 * #false (if ".pdf" is in config.drive.unvisitableExtensions)
 * locationIsVisitable(new URL('https://b.com/foo/'), new URL('https://a.com/foo/'));
 * #false (different origin)
 * ```
 */
export function locationIsVisitable(location: URL, rootLocation: URL): boolean {
    // Must be within the rootLocation's origin and path prefix
    const isWithinRoot: boolean = isPrefixedBy(rootLocation, location);
    // Must not have an unvisitable file extension
    const extension: string = getExtension(location);
    const isUnvisitable: boolean = config.drive.unvisitableExtensions.has(extension);
    return isWithinRoot && !isUnvisitable;
}

/**
 * Returns the URL string without its anchor (fragment identifier), if present.
 *
 * This function removes the anchor portion (the `#fragment`) from the given URL or URLLike object.
 * If no anchor is present, the full `href` is returned unchanged.
 *
 * @param url - The URL or URLLike object to process. Must have at least a `href` property.
 * @returns The URL string without the anchor (fragment), or the original `href` if no anchor 
 * exists.
 *
 * @example
 * ```typescript
 * getRequestURL(new URL('https://a.com/page#section'));
 * #'https://a.com/page'
 * getRequestURL({ href: 'https://a.com/page#foo', hash: '#foo' });
 * #'https://a.com/page'
 * getRequestURL(new URL('https://a.com/page'));
 * #'https://a.com/page'
 * ```
 */
export function getRequestURL(url: URL | URLLike): string {
    const anchor: string | undefined = getAnchor(url);
    if (anchor != null) {
        // Remove the anchor (and the preceding '#') from the end of the href
        return url.href.slice(0, -(anchor.length + 1));
    }
    return url.href;
}

/**
 * Converts a given URL or URLLike object to a cache key string.
 *
 * @param url - The URL or URLLike object to be converted.
 * @returns The cache key string representation of the provided URL.
 */
export function toCacheKey(url: URL | URLLike): string {
    return getRequestURL(url);
}

/**
 * Compares two `Locatable` objects to determine if they represent the same URL.
 *
 * This function expands both `left` and `right` using `expandURL` and compares their `href` 
 * properties.
 *
 * @param left - The first locatable object to compare.
 * @param right - The second locatable object to compare.
 * @returns `true` if both URLs are equal after expansion; otherwise, `false`.
 */
export function urlsAreEqual(left: Locatable, right: Locatable): boolean {
    return expandURL(left).href == expandURL(right).href;
}

/**
 * Splits the pathname of a given URL into its individual components.
 *
 * @param url - The URL object whose pathname will be split.
 * @returns An array of strings representing each component of the URL's pathname,
 *          excluding the leading empty string caused by the initial slash.
 *
 * @example
 * ```typescript
 * const url = new URL('https://example.com/foo/bar');
 * const components = getPathComponents(url); // ['foo', 'bar']
 * ```
 */
export function getPathComponents(url: URL): string[] {
    return url.pathname.split("/").slice(1);
}

/**
 * Returns the last component of the pathname from the given URL.
 *
 * @param url - The URL object from which to extract the last path component.
 * @returns The last segment of the URL's pathname as a string.
 */
export function getLastPathComponent(url: URL): string {
    return getPathComponents(url).slice(-1)[0];
}

/**
 * Ensures that the given string ends with a trailing slash ("/").
 *
 * @param value - The input string to check and modify.
 * @returns The input string with a trailing slash appended if it does not already end with one.
 */
export function addTrailingSlash(value: string): string {
    return value.endsWith("/") ? value : value + "/";
}
