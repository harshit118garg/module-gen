# CLI Code Generator for React + TypeScript (V2.0.0)

A robust, template-driven **Module and Component Generator** and **Refactoring Tool**. It uses `commander` for the CLI interface, `ejs` for templating, and `fs-extra` for advanced file operations.

---

## Core Operations

The CLI is now smarter and more modular, dynamically generating commands based on the blueprints found in `cli/blueprints/`.

1. **Generation** — Creates files based on blueprints (e.g., `module`, `component`).
2. **Intelligent Renaming (Refactoring)** — A new advanced command that renames folders and files while simultaneously updating internal code references (PascalCase, camelCase, and kebab-case) across multiple files.
3. **Smart Layout Detection** — Automatically switches between **flat** (standalone) and **module** (nested) layouts by inspecting the target directory.
4. **Conditional Logic** — Supports `when` filters in blueprints to conditionally generate files based on CLI flags.

---

## List of Essential Commands

Run via `node ./cli/index.js` or `npm run cli-generate --`.

### 1. Generating a Module
Creates a full architectural feature (api, components, controllers, etc.) in `src/modules`.
```bash
node ./cli/index.js module UserProfile
```

### 2. Generating a Component (Standalone)
Creates a standalone component folder in `src/components`.
```bash
node ./cli/index.js component Button
```

### 3. Nested Generation: Component inside a Module
The CLI detects the module structure and places files in their respective sub-directories (`components/`, `controllers/`, etc.).
```bash
node ./cli/index.js component ProfileCard -o src/modules/User
```

### 4. Renaming / Refactoring (NEW)
Renames a previously generated item. This renames the directory, the files, and **rewrites the strings inside the code**.
```bash
# Rename the 'User' module to 'Admin'
node ./cli/index.js rename module User Admin -o src/modules
```

### 5. Partial Generation (Filtering)
Generate only specific layers or skip them using tags defined in the blueprint.
```bash
# Only generate the 'api' and 'types'
node ./cli/index.js module User --only api,types

# Skip the controller
node ./cli/index.js module User --skip controller
```

### 6. Previewing (Dry Run)
Check the generation or rename plan without touching any files.
```bash
node ./cli/index.js module Order --dry-run
node ./cli/index.js rename module User Admin --dry-run
```

---

## New Advanced Features in V2

### 🚀 Intelligent Refactoring (`rename`)
The `rename` command isn't just a file-system move. It performs **token rewriting**:
- **Case-Aware**: It finds `User` (Pascal), `user` (camel), and `user-profile` (kebab) and replaces them with the new name in the correct format.
- **Dependency Tracking**: In `module` mode, it scans all files in the directory to ensure siblings' references are updated.
- **Safety**: Includes a confirmation prompt and a `--force` flag to skip it.

### 📂 Automatic Layout Detection
The CLI now probes your folders for "markers" (like `index.ts` or `controllers/` folders).
- If you target a folder that already contains a module, it sets `--layout module`.
- If you target an empty or standard directory, it defaults to `--layout flat`.

### 🛠 Blueprint Configuration (`blueprint.config.js`)
Blueprints are now programmatic. Instead of just files, they support:
- **Custom Destinations**: Map template `__name__.tsx.ejs` to `components/__name__.tsx`.
- **Tags**: Label files (e.g., `ui`, `api`, `logic`) for filtered generation.
- **Layout Definitions**: Explicitly define where files go in different architectural patterns (Flat vs. Module).

---

## Smart Naming Tokens

When writing templates or naming files, use these tokens:
- `__pascalName__` or `__name__` → `UserProfile`
- `__camelName__` → `userProfile`

**Inside EJS templates:**
```typescript
// Use any of these variables:
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

- **Force Overwrite**: Use `-f` or `--force` if you want to regenerate files that already exist.
- **Layout Override**: Use `--layout flat` or `--layout module` to ignore the auto-detector.
- **Global Link**: Run `npm link` in the project root to use the command `cli-generate` from anywhere in your terminal.
