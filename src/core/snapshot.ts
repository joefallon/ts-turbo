import { queryAutofocusableElement } from "../util"

export class Snapshot {
    readonly element: Element;

    /**
     * Creates an instance of the class and associates it with the provided DOM element.
     *
     * @param element - The DOM element to be associated with this instance.
     */
    constructor(element: Element) {
        this.element = element;
    }

    /**
     * Gets the currently focused element within the document that owns this element.
     *
     * This getter returns the element that currently has focus (the "active element")
     * in the document associated with `this.element`. If no element is focused, it returns `null`.
     *
     * @remarks
     * - The active element is typically the element that is currently receiving keyboard input.
     * - If the document itself or no element is focused, this will return `null`.
     * - The returned value is cast to `Element | null` for type safety.
     *
     * @returns {Element | null} The currently focused element in the owner document, or `null` if none is focused.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/activeElement
     */
    get activeElement(): Element | null {
        return this.element.ownerDocument.activeElement as Element | null;
    }

    /**
     * Gets the child elements of the current element as an array of `Element` objects.
     *
     * @returns {Element[]} An array containing all child elements of the associated DOM element.
     */
    get children(): Element[] {
        return Array.from(this.element.children as HTMLCollectionOf<Element>);
    }

    /**
     * Determines whether this snapshot contains an element that matches the given anchor.
     *
     * Behavior and edge cases:
     * - If `anchor` is `null`, `undefined`, or an empty string, this method returns `false`.
     * - Otherwise it defers to `getElementForAnchor` and returns `true` when an element is
     *   found, `false` when not.
     *
     * @param anchor - Anchor name or id to find inside the snapshot. May be `null`/`undefined`.
     * @returns `true` when a matching element exists, otherwise `false`.
     */
    hasAnchor(anchor?: string | null): boolean {
        if (anchor == null || anchor === "") {
            // Treat missing or empty anchor values as "no anchor"
            return false;
        }

        return this.getElementForAnchor(anchor) !== null;
    }

    /**
     * Return the Element that corresponds to an anchor string (by id or by a[name]).
     *
     * @param anchor - Anchor name or id to look up; `null`/`undefined` yields `null`.
     */
    getElementForAnchor(anchor?: string | null): Element | null {
        if (!anchor) return null;

        const selector = `[id='${anchor}'], a[name='${anchor}']`;
        return this.element.querySelector(selector) as Element | null;
    }

    /**
     * Indicates whether the associated DOM element is currently connected to the document.
     *
     * @returns `true` if the element is connected to the DOM; otherwise, `false`.
     */
    get isConnected(): boolean {
        return this.element.isConnected;
    }

    /**
     * Gets the first element within the current context that can receive autofocus.
     *
     * This property queries for an element that is eligible to be automatically focused,
     * typically based on attributes like `autofocus`, `tabindex`, or other focusable criteria.
     *
     * @returns The first autofocusable `Element` found within `this.element`, or `undefined` if 
     *          none exists.
     */
    get firstAutofocusableElement(): Element | undefined {
        return queryAutofocusableElement(this.element);
    }

    /**
     * Gets a live collection of all permanent elements within the current element.
     *
     * Permanent elements are typically those that should persist across page updates,
     * such as elements marked with a specific attribute or class. This getter uses
     * the `queryPermanentElementsAll` utility to retrieve all such elements contained
     * within `this.element`.
     *
     * @returns {NodeListOf<Element>} A live NodeList of all permanent elements found.
     */
    get permanentElements(): NodeListOf<Element> {
        return queryPermanentElementsAll(this.element);
    }

    /**
     * Retrieves a permanent element within the current element's context by its unique identifier.
     *
     * @param id - The unique identifier of the permanent element to retrieve.
     * @returns The permanent element with the specified ID if found; otherwise, `null`.
     */
    getPermanentElementById(id: string): Element | null {
        return getPermanentElementById(this.element, id);
    }

    /**
     * Generates a mapping of permanent elements between the current state and a given snapshot.
     *
     * Iterates over the current set of permanent elements, and for each element,
     * attempts to find a corresponding element in the provided snapshot by its `id`.
     * If a matching element is found in the snapshot, the method adds an entry to the
     * returned map, associating the element's `id` with a tuple containing the current
     * permanent element and its counterpart from the snapshot.
     *
     * @param snapshot - The snapshot instance to compare against the current permanent elements.
     * @returns A record mapping element IDs to tuples of 
     *          `[currentPermanentElement, newPermanentElement]`.
     */
    getPermanentElementMapForSnapshot(snapshot: Snapshot): Record<string, [Element, Element]> {
        const permanentElementMap: Record<string, [Element, Element]> = {}

        for (const currentPermanentElement of this.permanentElements) {
            const { id } = currentPermanentElement;
            const newPermanentElement = snapshot.getPermanentElementById(id);
            if (newPermanentElement) {
                permanentElementMap[id] = [currentPermanentElement, newPermanentElement];
            }
        }

        return permanentElementMap;
    }
}

/**
 * Retrieves an element with the specified ID that also has the `data-turbo-permanent` attribute
 * from the given parent node.
 *
 * @param node - The parent node in which to search for the element.
 * @param id - The ID of the element to find.
 * @returns The matching element if found, otherwise `null`.
 */
export function getPermanentElementById(node: ParentNode, id: string): Element | null {
    return node.querySelector(`#${id}[data-turbo-permanent]`);
}

/**
 * Queries and returns all elements within the given parent node that have both an `id` attribute
 * and the `data-turbo-permanent` attribute.
 *
 * @param node - The parent node to search within.
 * @returns A NodeList of elements that are marked as permanent 
 *          (with `data-turbo-permanent` and `id`).
 */
export function queryPermanentElementsAll(node: ParentNode): NodeListOf<Element> {
    return node.querySelectorAll("[id][data-turbo-permanent]");
}
