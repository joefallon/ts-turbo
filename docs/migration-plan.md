# Migration Plan: JS to TypeScript, pnpm, Vite, and Vitest

This document outlines the steps to migrate the project from its current JavaScript setup to a modern TypeScript, pnpm, Vite, and Vitest stack.

## Checklist

### 1. Package Manager Migration (yarn -> pnpm)

- complete

### 2. Project Cleanup

- [X] **Remove Playwright:**
    - [X] Remove `playwright.config.js`.
    - [X] Uninstall `@playwright/test` and `@web/test-runner-playwright`: `pnpm remove @playwright/test @web/test-runner-playwright`.
    - [X] Update `test:browser` script in `package.json` to use Vitest.
- [X] **Remove Dev Containers:**
    - [X] Delete the `.devcontainer` directory.
- [X] **Remove Web Test Runner:**
    - [X] Remove `web-test-runner.config.mjs`.
    - [X] Uninstall `@web/test-runner`: `pnpm remove @web/test-runner`.
    - [X] Update `test:unit` script in `package.json` to use Vitest.
- [X] **Remove Rollup:**
    - [X] Remove `rollup.config.js`.
    - [X] Uninstall `rollup` and `@rollup/plugin-node-resolve`: `pnpm remove rollup @rollup/plugin-node-resolve`.
    - [X] Update `build` and `watch` scripts in `package.json` to use Vite.

### 3. Build System Migration (Rollup -> Vite)

- [X] **Configure Vite for Production Build:**
    - [X] Update `vite.config.ts` to handle the production build, replacing Rollup's functionality. The library entry points and formats (`es`, `umd`) should be correctly configured.
- [X] **Update `package.json` Scripts:**
    - [X] Change the `build` script to `vite build`.
    - [X] Change the `watch` script to `vite build --watch`.
    - [X] Ensure the `dev` script is `vite`.

### 4. Test Runner Migration (Playwright/Web Test Runner -> Vitest)

- [ ] **Configure Vitest:**
    - [ ] Review and enhance `vitest.config.ts` to handle all testing needs.
    - [ ] Configure in-source testing if desired, or keep tests separate.
    - [ ] Set up coverage reporting.
- [ ] **Update `package.json` Scripts:**
    - [ ] Consolidate all test scripts (`test`, `test:vitest`, `test:vitest:watch`, `test:browser`, `test:unit`) into a few Vitest commands. For example:
        - `test`: `vitest run`
        - `test:watch`: `vitest`
        - `coverage`: `vitest run --coverage`
- [ ] **Migrate Existing Tests:**
    - [ ] Convert Playwright tests (functional/integration) to Vitest. This may require using `jsdom` or other environments supported by Vitest. For browser-specific APIs, consider a browser-based runner for Vitest or a different library.
    - [ ] Convert Web Test Runner tests (unit) to Vitest. The syntax should be largely compatible (if using `chai` and `mocha`-like interfaces).

### 5. TypeScript Conversion

- [ ] **Update `tsconfig.json`:**
    - [ ] Set `"strict": true` to enable all strict type-checking options.
    - [ ] Set `"noImplicitAny": true` and other strictness flags as desired.
    - [ ] Configure `include` and `exclude` to correctly target all source files.
- [ ] **Rename Files:**
    - [ ] Rename all `.js` files in `src` to `.ts`. Start with smaller, less complex files and move to more complex ones.
        - `src/index.js` -> `src/index.ts`
        - `src/core/session.js` -> `src/core/session.ts`
        - ... and so on for all files in `src`.
- [ ] **Add Types:**
    - [ ] Go through each `.ts` file and add types to variables, function parameters, and return values.
    - [ ] Fix any type errors that arise.
    - [ ] Install `@types/*` packages for any dependencies that don't ship with their own types (e.g., `@types/express`).
- [ ] **Update ESLint for TypeScript:**
    - [ ] Install TypeScript ESLint parser and plugin: `pnpm add -D @typescript-eslint/parser @typescript-eslint/eslint-plugin`.
    - [ ] Update `.eslintrc.js` to use the TypeScript parser and recommended rules.
    - [ ] Configure ESLint to run on `.ts` files.
- [ ] **Update `vite.config.ts` and `vitest.config.ts`:**
    - [ ] Ensure that these configurations correctly handle `.ts` files. Vite has built-in TypeScript support, so this should be minimal.
    - [ ] Update entry points in `vite.config.ts` to point to `.ts` files.

### 6. Final Review and Cleanup

- [ ] Run `pnpm install` to make sure all dependencies are correct.
- [ ] Run `pnpm run build` to ensure the project builds successfully with Vite.
- [ ] Run `pnpm test` to ensure all tests pass with Vitest.
- [ ] Run `pnpm run lint` to check for any linting errors.
- [ ] Remove any other unused configuration files or dependencies.
- [ ] Update `README.md` to reflect the new development setup (pnpm, Vite, Vitest).
