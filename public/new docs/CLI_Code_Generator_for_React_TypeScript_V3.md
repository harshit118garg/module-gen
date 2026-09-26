# CLI Code Generator for React + TypeScript (V2.0.0)

A robust, template-driven **Module and Component Generator** and **Refactoring Tool**. It uses `commander` for the CLI interface, `ejs` for templating, and `fs-extra` for advanced file operations.

---

## Core Operations

The CLI dynamically generates commands based on the blueprints found in `cli/blueprints/`. Currently, it supports:

1. **Generation** — Creates a new set of files based on a blueprint (e.g., a "module" or a "component").
2. **Intelligent Renaming (Refactoring)** — Renames folders and files while simultaneously updating internal code references (matching PascalCase, camelCase, and kebab-case) across multiple files.
3. **Smart Layout Detection** — Automatically switches between a **flat** structure (standalone folder per item) and a **module** structure (files integrated into an existing module directory) by inspecting the target directory.
4. **Conditional Logic** — Supports `when` filters in blueprints to conditionally generate files based on CLI flags.

---

## List of Essential Commands

Since the CLI is not yet globally linked, you run it using `node ./cli/index.js` (or via the npm script `npm run cli-generate --`).

### 1. Generating a Module
Creates a full module structure (api, components, controllers, etc.) in `src/modules`.
```bash
node ./cli/index.js module UserProfile
```

### 2. Generating a Standalone Component
Creates a component folder in `src/components`.
```bash
node ./cli/index.js component Button
```

### 3. Nested Generation: Component Inside a Module
The CLI detects the module structure and places files in their respective sub-directories (`components/`, `controllers/`, etc.) instead of putting them all in one place.
```bash
node ./cli/index.js component ProfileCard -o src/modules/User
```

### 4. Renaming / Refactoring
Renames a previously generated item. This renames the directory, the files, and rewrites the strings inside the code (e.g., renaming `User` to `Admin` will update `class User` to `class Admin`).
```bash
node ./cli/index.js rename module User Admin -o src/modules
```

### 5. Partial Generation (Filtering)
If your blueprint supports tags, you can generate only specific parts or skip others.
```bash
# Only generate the 'api' and 'types'
node ./cli/index.js module User --only api,types

# Skip the controller
node ./cli/index.js module User --skip controller
```

### 6. Previewing Changes (Dry Run)
Check the generation or rename plan without touching any files.
```bash
node ./cli/index.js module Order --dry-run
node ./cli/index.js rename module User Admin --dry-run
```

### 7. Overwriting Existing Files
By default, the tool prevents overwriting. Use `-f` / `--force` to force it.
```bash
node ./cli/index.js component Button --force
```

---

## Nested Generation: Component Inside a Module

One of the CLI's most useful features is **nested generation** — creating a component inside an existing module rather than as a standalone item. This is handled by the **`module` layout** defined in each blueprint's `blueprint.config.js`.

When you run the `component` command, the CLI doesn't just blindly create a folder — it checks the target directory to see if it looks like a "Module" structure.

### What Happens Behind the Scenes

1. **Layout Detection** — The CLI looks at `src/modules/User`. It sees directories like `components`, `controllers`, or an `index.ts`.
2. **Layout Switching** — It automatically switches from the default `flat` layout to the `module` layout.
3. **File Mapping** — Based on the `module` layout configuration in `cli/blueprints/component/blueprint.config.js`, it maps the files like this:
   - `ProfileCard.tsx` → `src/modules/User/components/ProfileCard.tsx`
   - `ProfileCard.controller.ts` → `src/modules/User/controllers/ProfileCard.controller.ts`
   - `ProfileCard.model.ts` → `src/modules/User/models/ProfileCard.model.ts`
   - `ProfileCard.types.ts` → `src/modules/User/definations/ProfileCard.types.ts`

### Why This Is Powerful

- **Zero Manual Sorting** — You don't have to manually move files into the `controllers` or `models` folders; the CLI knows the project structure.
- **Consistency** — Every component created inside a module follows the exact same architectural pattern.
- **Auto-Correction** — Even if you forget to specify the layout, the `detectLayout` function in `generate.js` senses the environment and "does the right thing."

### Helpful Tip

If you want to be explicit and avoid the auto-detection, you can force the layout:
```bash
node ./cli/index.js component ProfileCard -o src/modules/User --layout module
```

---

## Intelligent Refactoring (`rename`)

The `rename` command isn't just a file-system move — it performs **token rewriting**:

- **Case-Aware** — It finds `User` (Pascal), `user` (camel), and `user-profile` (kebab) and replaces them with the new name in the correct format.
- **Dependency Tracking** — In `module` mode, it scans all files in the directory to ensure siblings' references are updated.
- **Safety** — Includes a confirmation prompt and a `--force` flag to skip it.

---

## Automatic Layout Detection

The CLI probes your folders for "markers" (like `index.ts` or a `controllers/` folder) to decide which layout to use:

- If you target a folder that already contains a module, it sets `--layout module`.
- If you target an empty or standard directory, it defaults to `--layout flat`.

This is the same `detectLayout` logic (in `generate.js`) that powers nested generation above.

---

## Blueprint Configuration (`blueprint.config.js`)

Blueprints are programmatic, not just static file folders. Each blueprint's `blueprint.config.js` can define:

- **Custom Destinations** — Map a template like `__name__.tsx.ejs` to a specific output path, e.g. `components/__name__.tsx`.
- **Tags** — Label files (e.g., `ui`, `api`, `logic`) so they can be targeted by `--only` / `--skip`.
- **Layout Definitions** — Explicitly define where files go under different architectural patterns (Flat vs. Module).

To add a brand-new command (e.g., `service`), simply create a folder `cli/blueprints/service/` with its own `blueprint.config.js` — the CLI picks it up automatically.

---

## Smart Naming & Templating

The CLI automatically converts your input into these tokens, usable in file names and inside templates:

- `__pascalName__` or `__name__` → `UserProfile` (defaults to Pascal)
- `__camelName__` → `userProfile`

Templates use **EJS**, so you can use logic and any of these variables directly:
```typescript
// In a template:
export const <%= pascalName %>Controller = () => { ... }
const <%= camelName %>Data = {};
```

---

## File Structure Reference

| Command | Default Output | Layout | Resulting Path |
| :--- | :--- | :--- | :--- |
| `module User` | `src/modules` | `flat` | `src/modules/user/` |
| `component Btn` | `src/components` | `flat` | `src/components/btn/` |
| `component Profile` | `src/modules/User` | `module` | `src/modules/User/components/Profile.tsx` |

---

## Helpful Tips

- **Force Overwrite** — Use `-f` or `--force` if you want to regenerate files that already exist.
- **Layout Override** — Use `--layout flat` or `--layout module` to ignore the auto-detector.
- **Global Link** — You have a `bin` entry in `package.json`. Run `npm link` in the project root to use the `cli-generate` command globally, or just as `cli-generate` within the project.