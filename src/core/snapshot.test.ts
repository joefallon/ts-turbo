import { describe, it, expect } from "vitest"
import { Snapshot, getPermanentElementById, queryPermanentElementsAll } from "./snapshot"

describe("Snapshot", () => {
    it("returns the activeElement from the snapshot's document", () => {
        const container = document.createElement("div")
        const input = document.createElement("input")
        container.appendChild(input)
        document.body.appendChild(container)

        // focus should set document.activeElement in the test DOM
        input.focus()

        const snapshot = new Snapshot(container)
        expect(snapshot.activeElement).toBe(document.activeElement)
    })

    it("returns children as an array", () => {
        const container = document.createElement("div")
        const a = document.createElement("span")
        const b = document.createElement("p")
        container.appendChild(a)
        container.appendChild(b)

        const snapshot = new Snapshot(container)
        expect(Array.isArray(snapshot.children)).toBe(true)
        expect(snapshot.children.length).toBe(2)
        expect(snapshot.children[0].tagName).toBe("SPAN")
        expect(snapshot.children[1].tagName).toBe("P")
    })

    it("finds an element for an anchor and reports hasAnchor correctly", () => {
        const container = document.createElement("div")
        const anchor = document.createElement("a")
        anchor.name = "my-anchor"
        container.appendChild(anchor)

        const snapshot = new Snapshot(container)
        expect(snapshot.getElementForAnchor("my-anchor")).toBe(anchor)
        expect(snapshot.hasAnchor("my-anchor")).toBe(true)

        expect(snapshot.getElementForAnchor(null)).toBeNull()
        expect(snapshot.hasAnchor(null)).toBe(false)
    })

    it("reports isConnected correctly", () => {
        const container = document.createElement("div")
        const snapshot = new Snapshot(container)
        expect(snapshot.isConnected).toBe(false)
        document.body.appendChild(container)
        expect(snapshot.isConnected).toBe(true)
    })

    it("returns the first autofocusable element when present", () => {
        const container = document.createElement("div")
        const input = document.createElement("input")
        input.setAttribute("autofocus", "")
        container.appendChild(input)

        const snapshot = new Snapshot(container)
        expect(snapshot.firstAutofocusableElement).toBe(input)
    })

    it("returns permanent elements and can map permanents between snapshots", () => {
        const currentRoot = document.createElement("div")
        const currentPermanent = document.createElement("div")
        currentPermanent.id = "p1"
        currentPermanent.setAttribute("data-turbo-permanent", "")
        currentRoot.appendChild(currentPermanent)

        const newRoot = document.createElement("div")
        const newPermanent = document.createElement("div")
        newPermanent.id = "p1"
        newPermanent.setAttribute("data-turbo-permanent", "")
        newRoot.appendChild(newPermanent)

        const currentSnapshot = new Snapshot(currentRoot)
        const newSnapshot = new Snapshot(newRoot)

        // The helper should find the permanent element by id
        expect(getPermanentElementById(currentRoot, "p1")).toBe(currentPermanent)

        // queryPermanentElementsAll should include the permanent element
        const list = queryPermanentElementsAll(currentRoot)
        expect(list.length).toBe(1)
        expect(list[0]).toBe(currentPermanent)

        const map = currentSnapshot.getPermanentElementMapForSnapshot(newSnapshot)
        expect(Object.keys(map)).toEqual(["p1"])
        expect(map["p1"][0]).toBe(currentPermanent)
        expect(map["p1"][1]).toBe(newPermanent)
    })

    it("finds an element for an anchor by id", () => {
        const container = document.createElement("div")
        const el = document.createElement("div")
        el.id = "anchor-id"
        container.appendChild(el)

        const snapshot = new Snapshot(container)
        expect(snapshot.getElementForAnchor("anchor-id")).toBe(el)
    })

    it("returns a static array for children (not a live HTMLCollection)", () => {
        const container = document.createElement("div")
        const a = document.createElement("span")
        container.appendChild(a)

        const snapshot = new Snapshot(container)
        const childrenSnapshot = snapshot.children
        expect(Array.isArray(childrenSnapshot)).toBe(true)
        expect(childrenSnapshot.length).toBe(1)

        // Mutate original container after taking the children snapshot
        const extra = document.createElement("div")
        container.appendChild(extra)

        // The previously retrieved array should not change
        expect(childrenSnapshot.length).toBe(1)
    })

    it("returns undefined for firstAutofocusableElement when the autofocus element is not focusable", () => {
        const container = document.createElement("div")
        const input = document.createElement("input")
        input.setAttribute("autofocus", "")
        // make it not focusable
        input.disabled = true
        container.appendChild(input)

        const snapshot = new Snapshot(container)
        expect(snapshot.firstAutofocusableElement).toBeUndefined()
    })

    it("queryPermanentElementsAll excludes elements missing the data-turbo-permanent attribute", () => {
        const root = document.createElement("div")
        const el = document.createElement("div")
        el.id = "p2"
        // Intentionally do not add data-turbo-permanent
        root.appendChild(el)

        const results = queryPermanentElementsAll(root)
        expect(results.length).toBe(0)
    })
})
