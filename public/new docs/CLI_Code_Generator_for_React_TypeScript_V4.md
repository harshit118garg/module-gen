# CLI Code Generator for React + TypeScript (V3.0.0)

A robust, template-driven **Module and Component Generator** and **Refactoring Tool**. It uses `commander` for the CLI interface, `ejs` for templating, and `fs-extra` for advanced file operations.

> **Note on invoking the CLI:** Every command in this document uses `npm run cli-generate -- <args>`. The `--` separator is **required** so npm forwards flags (like `-o`, `--skip`, `--force`) to the CLI instead of consuming them itself. If you have run `npm link` (see "Global Installation"), you may drop `npm run cli-generate --` and invoke `gen` directly.

---

## Core Operations

The CLI dynamically generates commands based on the blueprints found in `cli/blueprints/`. Currently, it supports:

1. **Generation** — Creates a new set of files based on a blueprint (e.g., a "module" or a "component").
2. **Intelligent Renaming (Refactoring)** — Renames folders and files while simultaneously updating internal code references (matching PascalCase, camelCase, and kebab-case) across multiple files.
3. **Smart Layout Detection** — Automatically switches between a **flat** structure (standalone folder per item) and a **module** structure (files integrated into an existing module directory) by inspecting the target directory.
4. **Conditional Logic** — Supports `when` filters in blueprints to conditionally generate files based on CLI flags.
5. **Patches (Auto Barrel Updates)** — After writing files, the generator can update existing files (like `index.ts`) by injecting lines between `// gen:*` markers. Used primarily to keep module barrels in sync.
6. **Self-Documenting Blueprints** — `list-blueprints` reads each `blueprint.config.js` and prints descriptions, layouts, files, and tags.

---

## Global Installation (Optional)

By default, invoke the CLI via npm:

```bash
npm run cli-generate -- <command> [args]
```

To get a global `gen` command, do the following **once** in the project:

1. Add a `bin` entry to `package.json`:
   ```json
   {
     "bin": { "gen": "./cli/index.js" }
   }
   ```

2. Add a shebang as the **first line** of `cli/index.js`:
   ```js
   #!/usr/bin/env node
   import { Command } from "commander";
   // ...
   ```

3. Make the file executable and link it:
   ```bash
   chmod +x cli/index.js
   npm link
   ```

4. Verify:
   ```bash
   which gen
   gen --help
   ```

After linking, replace `npm run cli-generate --` with `gen` in all examples below.

---

## Command Reference

### 1. Generating a Module

Creates a full module structure (api, components, controllers, models, definations, utils) in `src/modules`.

```bash
npm run cli-generate -- module UserProfile
```

Result: `src/modules/userProfile/` with all default files.

### 2. Generating a Standalone Component

Creates a component folder in `src/components` using the **flat** layout.

```bash
npm run cli-generate -- component Button
```

Result: `src/components/button/` with `Button.tsx`, `Button.controller.ts`, etc.

### 3. Nested Generation: Component Inside a Module

The CLI detects the module structure and places files in their respective sub-directories (`components/`, `controllers/`, `models/`, `definations/`) instead of collapsing them into one folder.

```bash
npm run cli-generate -- component ProfileCard -o src/modules/userProfile
```

Result:
- `src/modules/userProfile/components/ProfileCard.tsx`
- `src/modules/userProfile/controllers/ProfileCard.controller.ts`
- `src/modules/userProfile/models/ProfileCard.model.ts`
- `src/modules/userProfile/definations/ProfileCard.types.ts`
- `src/modules/userProfile/index.ts` — **automatically updated** to export the new component.

To force this behavior explicitly (skip auto-detection):

```bash
npm run cli-generate -- component ProfileCard -o src/modules/userProfile --layout module
```

### 4. Renaming / Refactoring

Renames a previously generated item. It renames the directory, the files, and rewrites the strings inside the code. It handles **PascalCase**, **camelCase**, and **kebab-case** variants in one pass.

```bash
# Standalone component (flat)
npm run cli-generate -- rename Button ButtonOld -o src/components

# Module
npm run cli-generate -- rename cart cartOld -o src/modules

# Component inside a module
npm run cli-generate -- rename CartItems CartItemsOld -o src/modules/cart
```

Result: `Button.tsx` → `ButtonOld.tsx`, `useButtonController` → `useButtonOldController`, `'./Button.types'` → `'./ButtonOld.types'`, etc. In **module** mode, sibling files that reference the renamed item are also updated.

**Dry run:**
```bash
npm run cli-generate -- rename Button ButtonOld -o src/components --dry-run
```

**Skip confirmation:**
```bash
npm run cli-generate -- rename Button ButtonOld -o src/components --force
```

### 5. Partial Generation (Filtering)

If your blueprint supports tags, you can generate only specific parts or skip others. The list is comma-separated, **no spaces**.

```bash
# Only generate the 'api' and 'types' files
npm run cli-generate -- module UserProfile --only api,types

# Skip the controller and model
npm run cli-generate -- module UserProfile --skip controller,model

# Combine
npm run cli-generate -- component Card -o src/modules/cart --skip controller,model
```

### 6. Previewing Changes (Dry Run)

Check the generation or rename plan without touching any files.

```bash
npm run cli-generate -- module Order --dry-run
npm run cli-generate -- rename cart cartOld -o src/modules --dry-run
```

### 7. Overwriting Existing Files

By default, the tool refuses to overwrite an existing target folder (except in module layout, where it merges into the existing folder). Use `-f` / `--force` to override.

```bash
npm run cli-generate -- component Button --force
```

### 8. Barrel Updates (Patches)

When generating into an existing module, the CLI **automatically updates the module's `index.ts`** to export the newly created component.

```bash
npm run cli-generate -- component ProfileCard -o src/modules/userProfile
# → writes files
# → ✎ patched src/modules/userProfile/index.ts
```

The patch is **idempotent** — running the same command twice does not duplicate the export line.

To skip the barrel update (files only):

```bash
npm run cli-generate -- component ProfileCard -o src/modules/userProfile --no-patch
```

### 9. Listing Blueprints

Prints all blueprints with their descriptions, default output, available layouts, and file/tag counts.

```bash
npm run cli-generate -- list-blueprints
npm run cli-generate -- ls                    # alias
npm run cli-generate -- list-blueprints component
```

Example output:
```
Blueprints (from cli/blueprints)

  module       Builds a full feature module: api, component, controller,
               model, definitions, utils, and a barrel index.
               Output:   src/modules
               Layouts:  default
               Files:    8

  component    A single UI component with its controller, model, and types.
               Output:   src/components
               Layouts:  flat, module
               Files:    4
               Patches:  2
```

---

## Layouts

Every blueprint can declare one or more **layouts**. A layout is a map of `template file → output path`. The generator picks a layout automatically (or via `--layout`).

| Layout | When used | Output shape |
| :--- | :--- | :--- |
| `flat` | Standalone items. Component not inside a module. | All files in one folder: `src/components/button/Button.tsx`, `Button.controller.ts`, … |
| `module` | Nested generation. Target is an existing module. | Files split into subfolders: `src/modules/cart/components/CartItems.tsx`, `controllers/`, `models/`, `definations/`, etc. |
| `default` | Blueprints without a `layouts` block. | Files land directly in the target dir, using each entry's `to`. |

### Auto-Detection

The `detectLayout` function in `generate.js` probes the target for module markers:

- Target contains `index.ts` **and** one of `components/`, `controllers/`, `models/`, `definations/` → **module**
- Otherwise → **flat**

### Layout Override

```bash
npm run cli-generate -- component ProfileCard -o src/modules/cart --layout module
npm run cli-generate -- component ProfileCard -o src/whatever     --layout flat
```

---

## Conditional Templates (`has()`)

Templates are rendered with EJS. The generator exposes a `has()` helper that tells the template **which other files are being written in this run**. This is what lets templates omit imports when their dependencies are skipped.

For example, in `__name__.tsx.ejs`:

```ejs
import React from 'react';
<% if (has('types')) { -%>
import type { <%= pascalName %>Props } from '<%= layout === "module" ? "../definations/" : "./" %><%= name %>.types';
<% } -%>
<% if (has('controller')) { -%>
import { use<%= pascalName %>Controller } from '<%= layout === "module" ? "../controllers/" : "./" %><%= name %>.controller';
<% } -%>
```

If you run with `--skip controller,types`, the generated `.tsx` will not import either file.

`has(...)` accepts **either a tag** (`'controller'`, `'types'`, `'model'`, `'api'`, `'ui'`) **or an output path** (`'components/ProfileCard.tsx'`).

### Available EJS Variables

| Variable | Value | Example |
| :--- | :--- | :--- |
| `name` | PascalCase | `UserProfile` |
| `pascalName` | PascalCase | `UserProfile` |
| `camelName` | camelCase | `userProfile` |
| `layout` | Current layout name | `"flat"` or `"module"` |
| `has(key)` | Boolean lookup | `has('controller')` |
| `files` | Array of output paths in this run | `["components/Foo.tsx", …]` |

---

## Patches (Automatic Barrel Updates)

A **patch** is a named edit applied to an **existing** file after generation. The classic use case is inserting an export line into a module's `index.ts`.

### Marker Format

Patches insert lines between named markers:

```ts
// src/modules/userProfile/index.ts

export * from './components/UserProfile';
export * from './definations/UserProfile.types';
export * from './models/UserProfile.model';

// gen:exports
// /gen:exports
```

The generator inserts new lines **just before the closing marker**. If the markers don't exist, they're appended at the end of the file on first run.

Running the same generation twice does **not** duplicate lines. Every patch is idempotent.

### Declaring Patches in `blueprint.config.js`

```js
// cli/blueprints/component/blueprint.config.js
export default {
  description: "A single UI component with its controller, model, and types.",
  defaultOutput: "src/components",

  layouts: {
    flat: { /* … */ },
    module: { /* … */ },
  },

  files: [
    { template: "__name__.tsx.ejs",           tags: ["component", "ui"] },
    { template: "__name__.controller.ts.ejs", tags: ["controller"] },
    { template: "__name__.model.ts.ejs",      tags: ["model"] },
    { template: "__name__.types.ts.ejs",      tags: ["types"] },
  ],

  patches: [
    {
      when: ({ layout }) => layout === "module",
      file: "index.ts",
      marker: "exports",
      insert: `export * from './components/<%= pascalName %>';`,
      skip: ({ has }) => !has("component"),
    },
    {
      when: ({ layout }) => layout === "module",
      file: "index.ts",
      marker: "exports",
      insert: `export type { <%= pascalName %>Props } from './definations/<%= pascalName %>.types';`,
      skip: ({ has }) => !has("types"),
    },
  ],
};
```

Each patch accepts:

| Key | Purpose |
| :--- | :--- |
| `file` | Target file, relative to the target dir (e.g. `index.ts`) |
| `marker` | Marker key. Block is `// gen:<marker>` … `// /gen:<marker>` |
| `insert` | EJS-rendered line(s) to add |
| `when` | Optional guard — runs only when this returns truthy |
| `skip` | Optional guard — skipped when this returns truthy |

### Disabling Patches

```bash
npm run cli-generate -- component ProfileCard -o src/modules/userProfile --no-patch
```

---

## Blueprint Configuration (`blueprint.config.js`)

Blueprints are programmatic, not just static file folders. Each blueprint's `blueprint.config.js` can define:

- **`description`** — Shown by `list-blueprints`.
- **`defaultOutput`** — Used when `-o` is not passed.
- **`layouts`** — Named maps of `template → destination path`.
- **`files`** — Templates to render, with optional `tags`, `when`, and `to`.
- **`patches`** — Edits applied to existing files after generation.

To add a new command (e.g., `service`), create a folder `cli/blueprints/service/` with its own `blueprint.config.js` — the CLI picks it up automatically.

### Full Example

```js
// cli/blueprints/component/blueprint.config.js
export default {
  description: "A single UI component with its controller, model, and types.",
  defaultOutput: "src/components",

  layouts: {
    flat: {
      "__name__.tsx.ejs":           "__name__.tsx",
      "__name__.controller.ts.ejs": "__name__.controller.ts",
      "__name__.model.ts.ejs":      "__name__.model.ts",
      "__name__.types.ts.ejs":      "__name__.types.ts",
    },
    module: {
      "__name__.tsx.ejs":           "components/__name__.tsx",
      "__name__.controller.ts.ejs": "controllers/__name__.controller.ts",
      "__name__.model.ts.ejs":      "models/__name__.model.ts",
      "__name__.types.ts.ejs":      "definations/__name__.types.ts",
    },
  },

  files: [
    { template: "__name__.tsx.ejs",           tags: ["component", "ui"] },
    { template: "__name__.controller.ts.ejs", tags: ["controller"] },
    { template: "__name__.model.ts.ejs",      tags: ["model"] },
    { template: "__name__.types.ts.ejs",      tags: ["types"] },
  ],

  patches: [
    /* …see Patches section… */
  ],
};
```

---

## Smart Naming & Templating

The CLI automatically converts your input into these tokens, usable in file names **and** inside templates:

| Token (filenames/paths) | Inside EJS (`<%= … %>`) | Value for input `user-profile` |
| :--- | :--- | :--- |
| `__name__` | `name` | `UserProfile` (Pascal, default) |
| `__pascalName__` | `pascalName` | `UserProfile` |
| `__camelName__` | `camelName` | `userProfile` |

Templates use **EJS**, so any JavaScript expression is valid:

```ejs
// In a template:
export const <%= pascalName %>Controller = () => { /* … */ };
const <%= camelName %>Data = {};
<% if (has('model')) { -%>
import type { <%= pascalName %>Model } from '<%= layout === "module" ? "../models/" : "./" %><%= name %>.model';
<% } -%>
```

---

## File Structure Reference

| Command | Default Output | Layout | Resulting Path |
| :--- | :--- | :--- | :--- |
| `module userProfile` | `src/modules` | `flat` | `src/modules/userProfile/` |
| `component button` | `src/components` | `flat` | `src/components/button/` |
| `component profileCard -o src/modules/userProfile` | — | `module` | `src/modules/userProfile/components/ProfileCard.tsx` |
| `rename button buttonOld -o src/components` | — | `flat` | `src/components/buttonOld/` |
| `rename cartItems cartItemsOld -o src/modules/cart` | — | `module` | files renamed in place; siblings updated |

> **Note on folder casing:** Generated folder names use **camelCase** (`userProfile/`, `button/`), while files inside use **PascalCase** (`UserProfile.tsx`, `Button.tsx`). This is a fixed rule — every file begins with the PascalCase name.

---

## Flag Reference

| Flag | Applies to | Meaning |
| :--- | :--- | :--- |
| `-o, --output <dir>` | generate, rename | Target directory |
| `-b, --blueprint <name>` | generate | Use a different blueprint than the command name |
| `-f, --force` | generate, rename | Overwrite existing files / skip confirmation |
| `--only <list>` | generate | Comma-separated tags/files to include |
| `--skip <list>` | generate | Comma-separated tags/files to exclude |
| `--layout <name>` | generate | Force `flat` or `module` (overrides auto-detection) |
| `--dry-run` | generate, rename | Plan without writing |
| `--no-patch` | generate | Skip barrel/patch updates |
| `-h, --help` | all | Help for that command |

---

## Helpful Tips

- **npm flag forwarding** — Always use `npm run cli-generate -- <args>`. Without `--`, npm eats your flags and prints confusing warnings.
- **Force overwrite** — Use `-f` or `--force` if you want to regenerate files that already exist.
- **Layout override** — Use `--layout flat` or `--layout module` to bypass the auto-detector.
- **Skip without spaces** — `--skip controller,model` works; `--skip controller, model` does not (the space splits the argument).
- **Idempotent patches** — Regenerating the same component won't duplicate barrel exports.
- **Rename is token-aware** — It rewrites `useButtonController`, `<Button />`, `'./Button.types'`, and kebab-case variants in one pass. In module mode, it also updates sibling files that reference the renamed item.

---

## Known Conventions

- **`definations/`** — This is the intentional spelling used across all blueprints and templates. Do not rename it to `definitions/`; doing so will break import paths in every generated file.
- **Folder casing** — Generated folders are camelCase; generated files always begin with PascalCase.
- **Marker blocks** — Patches rely on `// gen:<name>` / `// /gen:<name>` markers. If a marker block is malformed (closing marker before opening marker), the patch is skipped with a warning.
- **Module layout merges** — Generating into an existing module does not require `--force`; the CLI merges new files into the module's subfolders.

---

## Adding a New Blueprint

1. Create `cli/blueprints/<name>/`.
2. Add a `blueprint.config.js` with `description`, `defaultOutput`, `layouts` (optional), `files`, and `patches` (optional).
3. Add `.ejs` templates referenced by `files`.
4. Run `npm run cli-generate -- list-blueprints` to verify it's picked up.
5. Run `npm run cli-generate -- <name> SomeTest --dry-run` to preview output.

The CLI auto-registers the blueprint — no changes to `cli/index.js` required.