# CLI Code Generator for React + TypeScript (Vite)

A step-by-step guide to building a lightweight CLI that generates module boilerplate code in a Vite React TypeScript project.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Dependencies](#dependencies)
- [Step 1: Scaffold the Vite Project](#step-1-scaffold-the-vite-project)
- [Step 2: Install CLI Dependencies](#step-2-install-cli-dependencies)
- [Step 3: Create the CLI Folder Structure](#step-3-create-the-cli-folder-structure)
- [Step 4: Create the Template Files](#step-4-create-the-template-files)
- [Step 5: Write the Module Generator](#step-5-write-the-module-generator)
- [Step 6: Create the CLI Entry Point](#step-6-create-the-cli-entry-point)
- [Step 7: Enable ES Modules](#step-7-enable-es-modules)
- [Step 8: Register the CLI in package.json](#step-8-register-the-cli-in-packagejson)
- [Step 9: Make the Entry Point Executable](#step-9-make-the-entry-point-executable)
- [Step 10: Test It](#step-10-test-it)
- [Step 11: Test the Flags](#step-11-test-the-flags)
- [Step 12: Globally Link the CLI (Optional)](#step-12-globally-link-the-cli-optional)
- [Bonus: Add More Generators](#bonus-add-more-generators)
- [Final Structure Recap](#final-structure-recap)
- [Key Takeaways](#key-takeaways)

---

## Overview

Build a CLI tool that generates full module boilerplate (component + types + styles + index) inside a Vite React TypeScript project. By the end, running `npm run gen module User` will scaffold an entire module in `src/modules/user/`.

---

## Dependencies

Install these as **devDependencies**:

| Package | Purpose |
|---|---|
| `commander` | Parse CLI commands & flags |
| `fs-extra` | Robust file operations (copy, ensureDir) |
| `ejs` | Templating engine for boilerplate |
| `chalk` | Colored terminal output |
| `ora` | Spinner for async operations |
| `@types/fs-extra` | TypeScript types |

Install command:

```bash
npm install --save-dev commander fs-extra ejs chalk ora @types/fs-extra
```

---

## Step 1: Scaffold the Vite Project

If you haven't already:

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
```

Expected structure:

```
my-app/
├── src/
├── public/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Step 2: Install CLI Dependencies

```bash
npm install --save-dev commander fs-extra ejs chalk ora @types/fs-extra
```

---

## Step 3: Create the CLI Folder Structure

Create this structure at your project root:

```
my-app/
├── cli/
│   ├── index.js
│   ├── generators/
│   │   └── module.js
│   └── templates/
│       └── module/
│           ├── __name__.tsx.ejs
│           ├── __name__.types.ts.ejs
│           ├── __name__.styles.css.ejs
│           └── index.ts.ejs
```

Set it up with:

```bash
mkdir -p cli/generators cli/templates/module
touch cli/index.js cli/generators/module.js
```

---

## Step 4: Create the Template Files

The `__name__` prefix gets replaced with the module name during generation (e.g., `User.tsx`).

### `cli/templates/module/__name__.tsx.ejs`

```tsx
import React from 'react';
import './<%= name %>.styles.css';
import type { <%= pascalName %>Props } from './<%= name %>.types';

export const <%= pascalName %>: React.FC<<%= pascalName %>Props> = ({ children }) => {
  return (
    <div className="<%= kebabName %>-container">
      <h1><%= pascalName %> Component</h1>
      {children}
    </div>
  );
};

export default <%= pascalName %>;
```

### `cli/templates/module/__name__.types.ts.ejs`

```ts
import type { ReactNode } from 'react';

export interface <%= pascalName %>Props {
  children?: ReactNode;
}
```

### `cli/templates/module/__name__.styles.css.ejs`

```css
.<%= kebabName %>-container {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}
```

### `cli/templates/module/index.ts.ejs`

```ts
export * from './<%= name %>';
export * from './<%= name %>.types';
```

---

## Step 5: Write the Module Generator

Create `cli/generators/module.js`:

```js
import fs from 'fs-extra';
import path from 'path';
import ejs from 'ejs';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: convert "user-profile" → "UserProfile"
const toPascalCase = (str) =>
  str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());

// Helper: convert "UserProfile" → "user-profile"
const toKebabCase = (str) =>
  str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

export async function generateModule(name, options) {
  const targetDir = path.resolve(
    process.cwd(),
    options.output,
    toKebabCase(name)
  );
  const templateDir = path.join(__dirname, '../templates/module');

  // 1. Guard: prevent overwriting unless --force
  if (fs.existsSync(targetDir) && !options.force) {
    console.error(
      chalk.red(`✖ Directory already exists: ${targetDir}`)
    );
    console.log(chalk.yellow('  Use --force to overwrite.'));
    process.exit(1);
  }

  // 2. Ensure target dir exists
  await fs.ensureDir(targetDir);

  // 3. Data injected into every template
  const templateData = {
    name: toKebabCase(name),
    pascalName: toPascalCase(name),
    kebabName: toKebabCase(name),
    camelName: toKebabCase(name).replace(/-(.)/g, (_, c) => c.toUpperCase()),
  };

  // 4. Read all .ejs templates and render them
  const templateFiles = await fs.readdir(templateDir);

  for (const file of templateFiles) {
    const templatePath = path.join(templateDir, file);
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    // Strip .ejs extension and replace __name__ with actual filename
    const outputFileName = file
      .replace(/\.ejs$/, '')
      .replace(/__name__/g, templateData.name);

    const outputPath = path.join(targetDir, outputFileName);

    const rendered = ejs.render(templateContent, templateData);
    await fs.writeFile(outputPath, rendered);

    console.log(chalk.green(`  ✔ created  ${path.relative(process.cwd(), outputPath)}`));
  }

  console.log(
    chalk.cyan(`\n✨ Module "${templateData.pascalName}" generated at ${path.relative(process.cwd(), targetDir)}\n`)
  );
}
```

---

## Step 6: Create the CLI Entry Point

Create `cli/index.js`:

```js
#!/usr/bin/env node

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { generateModule } from './generators/module.js';

const program = new Command();

program
  .name('gen')
  .description('Code generator for React TypeScript modules')
  .version('1.0.0');

program
  .command('module')
  .description('Generate a new module (component + types + styles + index)')
  .argument('<name>', 'Module name (e.g. User, user-profile)')
  .option('-o, --output <dir>', 'Output directory', 'src/modules')
  .option('-f, --force', 'Overwrite if the directory already exists')
  .action(async (name, options) => {
    const spinner = ora(`Generating module "${name}"...`).start();
    try {
      await generateModule(name, options);
      spinner.succeed(chalk.green(`Module "${name}" generated!`));
    } catch (err) {
      spinner.fail(chalk.red('Failed to generate module'));
      console.error(err);
      process.exit(1);
    }
  });

program.parse(process.argv);
```

---

## Step 7: Enable ES Modules

Vite projects use ES Modules by default. Verify your `package.json` contains:

```json
{
  "type": "module"
}
```

If not, add it.

---

## Step 8: Register the CLI in `package.json`

Add these entries to your `package.json`:

```json
{
  "bin": {
    "gen": "./cli/index.js"
  },
  "scripts": {
    "gen": "node ./cli/index.js"
  }
}
```

- `bin` lets you run `npx gen` later.
- `scripts.gen` lets you run `npm run gen`.

---

## Step 9: Make the Entry Point Executable

```bash
chmod +x cli/index.js
```

---

## Step 10: Test It

From your project root:

```bash
npm run gen module User
```

**Expected output:**

```
✔ created  src/modules/user/user.tsx
✔ created  src/modules/user/user.types.ts
✔ created  src/modules/user/user.styles.css
✔ created  src/modules/user/index.ts
✔ Module "User" generated!
```

**Generated structure:**

```
src/modules/user/
├── user.tsx
├── user.types.ts
├── user.styles.css
└── index.ts
```

**Use it anywhere:**

```tsx
import { User } from './modules/user';
```

---

## Step 11: Test the Flags

```bash
# Custom output directory
npm run gen module Product -- --output src/features

# Force overwrite existing
npm run gen module User -- --force
```

Check help output:

```bash
npm run gen -- --help
npm run gen module -- --help
```

---

## Step 12: Globally Link the CLI (Optional)

To run just `gen module User` without `npm run`:

```bash
npm link
```

Now from anywhere inside your project:

```bash
gen module Cart
gen module Checkout --output src/features
```

To unlink later:

```bash
npm unlink -g <your-package-name>
```

---

## Bonus: Add More Generators

Extend easily by adding new commands. Example — a `component` generator:

```js
program
  .command('component')
  .description('Generate a standalone component')
  .argument('<name>')
  .action(async (name) => {
    // reuse generateModule with a different template dir
  });
```

Then create `cli/templates/component/` with simpler templates.

---

## Final Structure Recap

```
my-app/
├── cli/
│   ├── index.js                    ← CLI entry (commander)
│   ├── generators/
│   │   └── module.js               ← Generation logic
│   └── templates/
│       └── module/                 ← .ejs boilerplate
│           ├── __name__.tsx.ejs
│           ├── __name__.types.ts.ejs
│           ├── __name__.styles.css.ejs
│           └── index.ts.ejs
├── src/
│   └── modules/                    ← Generated output
├── package.json                    ← bin + scripts.gen
└── vite.config.ts
```

---

## Key Takeaways

1. **Templates use `.ejs`** so you can inject dynamic values like `pascalName`, `kebabName`, `camelName`.
2. **`__name__` in filenames** gets replaced automatically — keeps templates generic.
3. **`fs-extra` handles edge cases** like nested dirs and overwrites cleanly.
4. **Guard with `--force`** prevents accidental overwrites.
5. **`npm run gen`** is the fastest way to use it day-to-day; `npm link` gives you a global `gen`.

---
