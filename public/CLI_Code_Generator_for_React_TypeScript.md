# CLI Code Generator for React + TypeScript (Vite)

A CLI that scaffolds module boilerplate — from a bare component to a full
`api/controllers/models/utils/definitions/components` module — from a single
`npm run gen` command, using swappable **blueprints** so simple cases stay
simple and complex ones stay consistent.

---

## 📋 Table of Contents

- [Why blueprints instead of one template folder](#why-blueprints-instead-of-one-template-folder)
- [Dependencies](#dependencies)
- [Step 1: CLI folder structure](#step-1-cli-folder-structure)
- [Step 2: The `basic` blueprint (default, simple)](#step-2-the-basic-blueprint-default-simple)
- [Step 3: The `full` blueprint (complex modules)](#step-3-the-full-blueprint-complex-modules)
- [Step 4: The generator (blueprint-agnostic)](#step-4-the-generator-blueprint-agnostic)
- [Step 5: CLI entry point](#step-5-cli-entry-point)
- [Step 6: Wire it into package.json](#step-6-wire-it-into-packagejson)
- [Step 7: Use it](#step-7-use-it)
- [Adding a third blueprint later](#adding-a-third-blueprint-later)
- [What was cut from the original doc, and why](#what-was-cut-from-the-original-doc-and-why)

---

## Why blueprints instead of one template folder

The original doc hard-codes one shape: `.tsx + .types.ts + .styles.css + index.ts`.
That's the right shape for a presentational component. It's the wrong shape for
a "module" that also owns API calls, business logic, a controller, and shared
models — you'd end up hand-adding folders per module, and every module would
drift slightly from the others.

Fix: a blueprint is just a folder of `.ejs` templates. The generator doesn't
know or care what's inside a blueprint — it walks whatever folder you point it
at, preserves the sub-folder structure, and renders each file. So:

- `basic` → 4 files, flat, for a plain UI component.
- `full` → component + api + controllers + models + utils + definitions, for a
  real module.
- Uniformity is automatic: every module built from `full` has the identical
  shape, because they all came from the same folder.

You pick the blueprint per invocation with `--blueprint` (default `basic`), so
day-to-day component work stays a one-word command, and the complex shape is
opt-in.

---

## Dependencies

```bash
npm install --save-dev commander fs-extra ejs chalk
```

`ora` (spinner) is dropped — this runs in well under a second; a spinner just
adds visual noise for no benefit here. `@types/fs-extra` is optional; only add
it if your CLI files are type-checked (most people leave `cli/` as plain JS).

---

## Step 1: CLI folder structure

```
my-app/
├── cli/
│   ├── index.js
│   ├── generate.js
│   └── blueprints/
│       ├── basic/
│       │   ├── __name__.tsx.ejs
│       │   ├── __name__.types.ts.ejs
│       │   ├── __name__.styles.css.ejs
│       │   └── index.ts.ejs
│       └── full/
│           ├── components/
│           │   ├── __name__.tsx.ejs
│           │   ├── __name__.types.ts.ejs
│           │   └── __name__.styles.css.ejs
│           ├── api/
│           │   └── __name__.api.ts.ejs
│           ├── controllers/
│           │   └── __name__.controller.ts.ejs
│           ├── models/
│           │   └── __name__.model.ts.ejs
│           ├── utils/
│           │   └── __name__.utils.ts.ejs
│           ├── definitions/
│           │   └── __name__.definitions.ts.ejs
│           └── index.ts.ejs
```

```bash
mkdir -p cli/blueprints/basic cli/blueprints/full/{components,api,controllers,models,utils,definitions}
```

Every file that should be renamed per-module keeps the `__name__` placeholder,
same trick as the original doc — that part was already right.

---

## Step 2: The `basic` blueprint (default, simple)

Identical to the original doc's four files — this is the "just give me a
component" path and should stay this small.

**`cli/blueprints/basic/__name__.tsx.ejs`**
```tsx
import React from 'react';
import './<%= name %>.styles.css';
import type { <%= pascalName %>Props } from './<%= name %>.types';

export const <%= pascalName %>: React.FC<<%= pascalName %>Props> = ({ children }) => {
  return (
    <div className="<%= kebabName %>-container">
      {children}
    </div>
  );
};

export default <%= pascalName %>;
```

**`cli/blueprints/basic/__name__.types.ts.ejs`**
```ts
import type { ReactNode } from 'react';

export interface <%= pascalName %>Props {
  children?: ReactNode;
}
```

**`cli/blueprints/basic/__name__.styles.css.ejs`**
```css
.<%= kebabName %>-container {
  display: flex;
  flex-direction: column;
}
```

**`cli/blueprints/basic/index.ts.ejs`**
```ts
export * from './<%= name %>';
export * from './<%= name %>.types';
```

---

## Step 3: The `full` blueprint (complex modules)

This is the new part — a module that owns its own data layer, not just a view.

**`cli/blueprints/full/components/__name__.tsx.ejs`**
```tsx
import React from 'react';
import './<%= name %>.styles.css';
import type { <%= pascalName %>Props } from './<%= name %>.types';
import { use<%= pascalName %>Controller } from '../controllers/<%= name %>.controller';

export const <%= pascalName %>: React.FC<<%= pascalName %>Props> = (props) => {
  const { state } = use<%= pascalName %>Controller(props);

  return (
    <div className="<%= kebabName %>-container">
      {/* render state */}
    </div>
  );
};

export default <%= pascalName %>;
```

**`cli/blueprints/full/components/__name__.types.ts.ejs`**
```ts
export interface <%= pascalName %>Props {
  id?: string;
}
```

**`cli/blueprints/full/components/__name__.styles.css.ejs`**
```css
.<%= kebabName %>-container {
  display: flex;
  flex-direction: column;
}
```

**`cli/blueprints/full/api/__name__.api.ts.ejs`**
```ts
// All network calls for this module live here — nowhere else imports fetch/axios directly.
import type { <%= pascalName %>Model } from '../models/<%= name %>.model';

export const <%= camelName %>Api = {
  async fetchAll(): Promise<<%= pascalName %>Model[]> {
    const res = await fetch('/api/<%= kebabName %>');
    return res.json();
  },
};
```

**`cli/blueprints/full/controllers/__name__.controller.ts.ejs`**
```ts
// Business logic / state orchestration for the module — the component stays dumb.
import { useState, useEffect } from 'react';
import { <%= camelName %>Api } from '../api/<%= name %>.api';
import type { <%= pascalName %>Model } from '../models/<%= name %>.model';
import type { <%= pascalName %>Props } from '../components/<%= name %>.types';

export function use<%= pascalName %>Controller(_props: <%= pascalName %>Props) {
  const [state, setState] = useState<<%= pascalName %>Model[]>([]);

  useEffect(() => {
    <%= camelName %>Api.fetchAll().then(setState);
  }, []);

  return { state };
}
```

**`cli/blueprints/full/models/__name__.model.ts.ejs`**
```ts
// Shape of the domain data — the single source of truth other files import from.
export interface <%= pascalName %>Model {
  id: string;
}
```

**`cli/blueprints/full/utils/__name__.utils.ts.ejs`**
```ts
// Pure helper functions specific to this module.
export function format<%= pascalName %>Label(id: string): string {
  return `<%= pascalName %>-${id}`;
}
```

**`cli/blueprints/full/definitions/__name__.definitions.ts.ejs`**
```ts
// Constants / enums for this module — route paths, query keys, feature-flag names, etc.
export const <%= constantName %>_QUERY_KEY = '<%= kebabName %>';
```

**`cli/blueprints/full/index.ts.ejs`**
```ts
export * from './components/<%= name %>';
export * from './components/<%= name %>.types';
export * from './models/<%= name %>.model';
```

Adjust the internals of any of these to match your team's actual conventions —
the point of this doc is the scaffolding mechanism, not this exact file
content. Whatever you settle on, it becomes the template, so every future
module matches it exactly.

---

## Step 4: The generator (blueprint-agnostic)

This is the one piece of logic — it doesn't know "basic" or "full" exist, it
just walks a folder recursively and renders whatever it finds. Requires
**Node 20.1+** for `fs.readdir(dir, { recursive: true })`.

**`cli/generate.js`**
```js
import fs from 'fs-extra';
import path from 'path';
import ejs from 'ejs';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const toPascalCase = (str) =>
  str.replace(/[-_](.)/g, (_, c) => c.toUpperCase()).replace(/^(.)/, (_, c) => c.toUpperCase());

const toKebabCase = (str) =>
  str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();

export async function generateModule(name, { output, blueprint, force }) {
  const blueprintDir = path.join(__dirname, 'blueprints', blueprint);

  if (!(await fs.pathExists(blueprintDir))) {
    console.error(chalk.red(`✖ Unknown blueprint "${blueprint}". Looked in ${blueprintDir}`));
    process.exit(1);
  }

  const kebabName = toKebabCase(name);
  const targetDir = path.resolve(process.cwd(), output, kebabName);

  if ((await fs.pathExists(targetDir)) && !force) {
    console.error(chalk.red(`✖ Directory already exists: ${targetDir}`));
    console.log(chalk.yellow('  Use --force to overwrite.'));
    process.exit(1);
  }
  await fs.ensureDir(targetDir);

  const data = {
    name: kebabName,
    pascalName: toPascalCase(name),
    kebabName,
    camelName: kebabName.replace(/-(.)/g, (_, c) => c.toUpperCase()),
    constantName: kebabName.replace(/-/g, '_').toUpperCase(),
  };

  // Recursively list every template file, preserving sub-folders.
  const entries = await fs.readdir(blueprintDir, { recursive: true, withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const sourcePath = path.join(entry.parentPath ?? entry.path, entry.name);
    const relDir = path.relative(blueprintDir, entry.parentPath ?? entry.path);
    const outputFileName = entry.name.replace(/\.ejs$/, '').replace(/__name__/g, kebabName);
    const outputPath = path.join(targetDir, relDir, outputFileName);

    await fs.ensureDir(path.dirname(outputPath));
    const rendered = ejs.render(await fs.readFile(sourcePath, 'utf-8'), data);
    await fs.writeFile(outputPath, rendered);

    console.log(chalk.green(`  ✔ ${path.relative(process.cwd(), outputPath)}`));
  }

  console.log(chalk.cyan(`\n✨ "${data.pascalName}" generated (${blueprint}) at ${path.relative(process.cwd(), targetDir)}\n`));
}
```

> Node below 20.1: swap the `fs.readdir(..., { recursive: true })` call for the
> `klaw` or `fast-glob` package — same idea, just an older-Node-compatible way
> to list nested files.

---

## Step 5: CLI entry point

**`cli/index.js`**
```js
#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { generateModule } from './generate.js';

const program = new Command();
program.name('gen').description('Module generator').version('2.0.0');

program
  .command('module')
  .argument('<name>', 'Module name, e.g. User or user-profile')
  .option('-b, --blueprint <name>', 'Blueprint to use', 'basic')
  .option('-o, --output <dir>', 'Output directory', 'src/modules')
  .option('-f, --force', 'Overwrite if it already exists')
  .action(async (name, options) => {
    try {
      await generateModule(name, options);
    } catch (err) {
      console.error(chalk.red('Failed to generate module'), err);
      process.exit(1);
    }
  });

program.parse(process.argv);
```

---

## Step 6: Wire it into package.json

```json
{
  "type": "module",
  "bin": { "gen": "./cli/index.js" },
  "scripts": { "gen": "node ./cli/index.js" }
}
```

```bash
chmod +x cli/index.js
```

---

## Step 7: Use it

```bash
# Simple component — blueprint defaults to "basic"
npm run gen module Avatar

# Full module with api/controllers/models/utils/definitions
npm run gen module UserProfile -- --blueprint full

# Custom output dir + overwrite
npm run gen module Cart -- --blueprint full --output src/features --force
```

`basic` output:
```
src/modules/avatar/
├── avatar.tsx
├── avatar.types.ts
├── avatar.styles.css
└── index.ts
```

`full` output:
```
src/modules/user-profile/
├── components/
│   ├── user-profile.tsx
│   ├── user-profile.types.ts
│   └── user-profile.styles.css
├── api/user-profile.api.ts
├── controllers/user-profile.controller.ts
├── models/user-profile.model.ts
├── utils/user-profile.utils.ts
├── definitions/user-profile.definitions.ts
└── index.ts
```

---

## Adding a third blueprint later

No code changes needed. Say you later want a `feature` blueprint for
route-level MFE remotes: `mkdir cli/blueprints/feature`, drop in whatever
`.ejs` files/sub-folders you want (a `routes/__name__.routes.ts.ejs`, say),
and it's usable immediately as `--blueprint feature`. This is what makes the
approach scale to your MFE work without the generator itself growing.

---

## What was cut from the original doc, and why

- **`ora` spinner** — removed. Generation is near-instant; a spinner adds a
  dependency and code for something the user never perceives as "loading."
- **Global `npm link`** — kept out of the main flow entirely (it's genuinely
  optional and rarely used day-to-day); mention it in your team README instead
  if anyone wants a bare `gen` command.
- **Separate "test the flags" step** — folded into Step 7; running a command
  with a flag isn't a distinct step from running the command.
- **One template folder for everything** — replaced with blueprints, which is
  the actual fix for "modules are complicated and involve multiple files."
