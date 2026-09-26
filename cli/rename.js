// cli/rename.js
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import prompts from "prompts";

// ---------- name utilities ----------

const toCamelCase = (str) =>
  str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toLowerCase());

const toPascalCase = (str) =>
  str
    .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());

const toKebabCase = (str) =>
  str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

/** Bundle all forms of a name we might find in files. */
function buildNameSet(raw) {
  return {
    raw,
    camel: toCamelCase(raw),
    pascal: toPascalCase(raw),
    kebab: toKebabCase(raw),
  };
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------- walking ----------

const MAX_DEPTH = 4; // avoid pathological nesting
async function walk(dir, depth = 0) {
  if (depth > MAX_DEPTH) return [];
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full, depth + 1)));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

// ---------- token rewriting ----------

/**
 * Rewrite old-name forms → new-name forms inside a string.
 * Order: kebab first (longest), then Pascal (substring), then camel (word-bounded).
 *
 * NOTE: Pascal uses substring replace on purpose — PascalCase is unambiguous
 * enough and matches things like `useButtonController` via its `Button` part.
 * If you ever rename `Button` → `ButtonOld` in a file containing `ButtonOld`,
 * word boundaries would treat it as an unrelated token, which is usually wrong.
 * Using substring replace + skipping already-renamed tokens handles that case
 * by simply being idempotent (see `idempotent` flag below).
 */
function rewriteTokens(content, oldSet, newSet) {
  let out = content;

  // 1) kebab: button-old
  if (oldSet.kebab && oldSet.kebab !== oldSet.pascal) {
    const re = new RegExp(
      `(?<![A-Za-z0-9])${escapeRegex(oldSet.kebab)}(?![A-Za-z0-9])`,
      "g",
    );
    out = out.replace(re, newSet.kebab);
  }

  // 2) Pascal: Button → ButtonOld
  //    Do this BEFORE camel, so `useButtonController` becomes `useButtonOldController`.
  //    Word-boundary is intentionally loose here so it hits `useButtonController`.
  out = out.split(oldSet.pascal).join(newSet.pascal);

  // 3) camel, word-bounded: button → buttonOld
  //    The lookarounds avoid hitting the tail of `someButton` when old is `button`
  //    (which Pascal already handled correctly anyway).
  {
    const re = new RegExp(
      `(?<![A-Za-z0-9])${escapeRegex(oldSet.camel)}(?![A-Za-z0-9])`,
      "g",
    );
    out = out.replace(re, newSet.camel);
  }

  return out;
}

/**
 * Rename a filename by applying the same token rules.
 * Only Pascal and camel are relevant to file names.
 */
function rewriteFilename(base, oldSet, newSet) {
  let out = base.split(oldSet.pascal).join(newSet.pascal);
  const re = new RegExp(
    `(?<![A-Za-z0-9])${escapeRegex(oldSet.camel)}(?![A-Za-z0-9])`,
    "g",
  );
  out = out.replace(re, newSet.camel);
  return out;
}

// ---------- the command ----------

export async function renameGenerated(rawOldName, rawNewName, options) {
  const { output, force, dryRun } = options;

  const oldSet = buildNameSet(rawOldName);
  const newSet = buildNameSet(rawNewName);

  if (oldSet.pascal === newSet.pascal) {
    console.error(chalk.red(`✖ Old and new names resolve to the same Pascal form: ${oldSet.pascal}`));
    process.exit(1);
  }

  // 1) Determine mode + root dir.
  const flatDir = path.resolve(process.cwd(), output, oldSet.camel);
  const moduleDir = path.resolve(process.cwd(), output);

  let mode, rootDir;
  if (await fs.pathExists(flatDir)) {
    mode = "flat";
    rootDir = flatDir;
  } else if (await fs.pathExists(moduleDir)) {
    mode = "module";
    rootDir = moduleDir;
  } else {
    console.error(chalk.red(`✖ Nothing to rename at ${flatDir} or ${moduleDir}`));
    process.exit(1);
  }

  // 2) Walk.
  const allFiles = await walk(rootDir);

  // 3) Files that carry the old name in their filename or path.
  const fileMatches = allFiles.filter((f) => {
    const rel = path.relative(rootDir, f);
    const base = path.basename(f);
    return (
      base.includes(oldSet.pascal) ||
      base.includes(oldSet.camel) ||
      rel.includes(oldSet.pascal)
    );
  });

  if (fileMatches.length === 0) {
    console.error(chalk.red(`✖ No files matching "${oldSet.pascal}" under ${rootDir}`));
    process.exit(1);
  }

  // 4) Files whose CONTENT might reference the old name.
  //    - flat mode: only the matching files (nothing else in the folder is related)
  //    - module mode: all files in the module (siblings can reference the target)
  const filesToRewrite = mode === "module" ? allFiles : fileMatches;

  // 5) Build rename plan (files).
  const renames = [];
  for (const f of fileMatches) {
    const dir = path.dirname(f);
    const base = path.basename(f);
    const newBase = rewriteFilename(base, oldSet, newSet);
    if (newBase !== base) {
      renames.push({ from: f, to: path.join(dir, newBase) });
    }
  }

  // 6) Build folder rename plan (flat only).
  let folderRename = null;
  if (mode === "flat") {
    const newDir = path.resolve(process.cwd(), output, newSet.camel);
    if (newDir !== flatDir) {
      if ((await fs.pathExists(newDir)) && !force) {
        console.error(chalk.red(`✖ Target folder already exists: ${newDir}`));
        console.log(chalk.yellow("  Use --force to overwrite."));
        process.exit(1);
      }
      folderRename = { from: flatDir, to: newDir };
    }
  }

  // 7) Show the plan.
  console.log(chalk.cyan(`\nRename plan (mode: ${mode}):\n`));
  console.log(chalk.gray(`  File contents to rewrite: ${filesToRewrite.length}`));
  console.log(chalk.gray(`  Files to rename:          ${renames.length}`));
  if (folderRename) {
    console.log(
      chalk.gray(
        `  Folder rename:            ${path.relative(process.cwd(), folderRename.from)} → ${path.relative(process.cwd(), folderRename.to)}`,
      ),
    );
  }
  console.log();

  for (const { from, to } of renames) {
    console.log(
      `  ${path.relative(process.cwd(), from)}  →  ${path.relative(process.cwd(), to)}`,
    );
  }

  if (dryRun) {
    console.log(chalk.gray("\n[dry-run] no changes written\n"));
    return;
  }

  // 8) Confirm.
  if (!force) {
    const { ok } = await prompts({
      type: "confirm",
      name: "ok",
      message: `Proceed?`,
      initial: false,
    });
    if (!ok) {
      console.log(chalk.yellow("Aborted."));
      return;
    }
  }

  // 9) Rewrite contents FIRST (paths still original).
  let rewrittenCount = 0;
  for (const f of filesToRewrite) {
    let content;
    try {
      content = await fs.readFile(f, "utf-8");
    } catch {
      continue;
    }
    const rewritten = rewriteTokens(content, oldSet, newSet);
    if (rewritten !== content) {
      await fs.writeFile(f, rewritten);
      rewrittenCount++;
    }
  }

  // 10) Rename files.
  for (const { from, to } of renames) {
    await fs.move(from, to, { overwrite: true });
  }

  // 11) Rename folder (flat only).
  if (folderRename) {
    await fs.move(folderRename.from, folderRename.to, { overwrite: true });
  }

  console.log(
    chalk.green(
      `\n✔ Renamed "${oldSet.pascal}" → "${newSet.pascal}"  (${rewrittenCount} file(s) rewritten)\n`,
    ),
  );
}