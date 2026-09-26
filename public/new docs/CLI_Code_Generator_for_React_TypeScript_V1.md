# CLI Code Generator for React + TypeScript

A template-driven **Module and Component Generator** CLI. It uses `commander` for the CLI interface, `ejs` for templating, and `fs-extra` for file operations.

---

## Core Operations

The CLI dynamically generates commands based on the folders found in `cli/blueprints/`. Currently, it supports:

1. **Generation** — Creates a new set of files based on a blueprint (e.g., a "module" or a "component").
2. **Renaming** — Intelligent renaming that updates folder names, file names, and internal code references (matching PascalCase, camelCase, and kebab-case).
3. **Layout Detection** — Automatically detects if you are using a **flat** structure (folder per item) or a **module** structure (files integrated into an existing module directory).

---

## List of Helpful Commands

Since the CLI is not yet globally linked, you run it using `node ./cli/index.js` (or via the npm script `npm run cli-generate --`).

### 1. Generating a Module
Generates a full module structure (api, components, controllers, etc.) in `src/modules`.
```bash
node ./cli/index.js module UserProfile
```

### 2. Generating a Component
Generates a component in `src/components`.
```bash
node ./cli/index.js component Button
```

### 3. Renaming a Module/Component
This is a sophisticated command that renames the folder, the files, and the code inside them (e.g., renaming `User` to `Admin` will update `class User` to `class Admin`).
```bash
node ./cli/index.js rename module User Admin
```

### 4. Previewing Changes (Dry Run)
Always helpful to see what files will be created or changed without actually writing to disk.
```bash
node ./cli/index.js module Order --dry-run
node ./cli/index.js rename component Button PrimaryButton --dry-run
```

### 5. Partial Generation
If your blueprint supports tags, you can generate only specific parts or skip others.
```bash
# Only generate the 'api' part of a module
node ./cli/index.js module User --only api

# Generate everything EXCEPT the 'utils'
node ./cli/index.js module User --skip utils
```

### 6. Overwriting Existing Files
By default, the tool prevents overwriting. Use `-f` to force it.
```bash
node ./cli/index.js component Button --force
```

---

## Key Features & Details

- **Dynamic Blueprints** — To add a new command (e.g., `service`), simply create a folder `cli/blueprints/service/`. The CLI will automatically pick it up as a new command.
- **Smart Naming** — The CLI automatically converts your input into:
  - `__pascalName__` (e.g., `UserProfile`)
  - `__camelName__` (e.g., `userProfile`)
  - `__name__` (defaults to Pascal)
- **Layouts**:
  - **Flat** — Creates a new folder for the item (e.g., `src/components/Button/`).
  - **Module** — Detects if `index.ts` and standard folders exist and places files directly within them.
- **Templating** — Uses **EJS**. You can use logic inside your templates:
  ```javascript
  // In a template:
  export const <%= pascalName %> = () => { ... }
  ```

---

## Nested Generation: Component Inside a Module

One of the CLI's most useful features is **nested generation** — creating a component inside an existing module rather than as a standalone item. This is handled by the **`module` layout** defined in each blueprint's `blueprint.config.js`.

When you run the `component` command, the CLI doesn't just blindly create a folder — it checks the target directory to see if it looks like a "Module" structure.

### The Command

To place a component inside a specific module (like `User`), point the `--output` flag to that module's directory. The CLI detects the layout and sorts the files into the correct sub-directories (`components/`, `controllers/`, etc.) instead of putting them all in one place.

```bash
node ./cli/index.js component ProfileCard -o src/modules/User
```

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

## Suggested Improvements

1. **Link the CLI** — You have a `bin` entry in `package.json`. You can run `npm link` to use the `cli-generate` command globally, or just as `cli-generate` within the project.
2. **Configuration** — You can add more complex logic to `blueprint.config.js` in each blueprint folder to define custom file destinations or conditional files.