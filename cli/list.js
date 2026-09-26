// cli/list.js
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { pathToFileURL } from "url";

/**
 * Print all blueprints, or the details of one.
 */
export async function listBlueprints(blueprintsDir, only) {
  if (!(await fs.pathExists(blueprintsDir))) {
    console.error(chalk.red(`✖ No blueprints directory at ${blueprintsDir}`));
    process.exit(1);
  }

  const dirs = (await fs.readdir(blueprintsDir, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  if (only) {
    if (!dirs.includes(only)) {
      console.error(chalk.red(`✖ Unknown blueprint "${only}".`));
      console.log(chalk.gray(`  Known: ${dirs.join(", ")}`));
      process.exit(1);
    }
    const cfg = await loadCfg(path.join(blueprintsDir, only));
    printDetailed(only, cfg);
    return;
  }

  // Overview of all
  console.log(chalk.cyan(`\nBlueprints (from ${path.relative(process.cwd(), blueprintsDir)})\n`));

  for (const name of dirs) {
    const cfg = await loadCfg(path.join(blueprintsDir, name));
    printSummary(name, cfg);
  }

  console.log(chalk.gray(`Use \`gen list-blueprints <name>\` for details.\n`));
}

/** Load and normalize one blueprint config. */
async function loadCfg(dir) {
  const cfgPath = path.join(dir, "blueprint.config.js");
  if (!(await fs.pathExists(cfgPath))) {
    return { __missing: true };
  }
  try {
    const mod = await import(pathToFileURL(cfgPath).href);
    return mod.default ?? mod;
  } catch (err) {
    return { __error: err.message };
  }
}

// ---------- rendering ----------

function printSummary(name, cfg) {
  const desc = cfg.description ?? chalk.gray("(no description)");
  const output = cfg.defaultOutput ?? chalk.gray("(not set)");

  const files = cfg.files ?? [];
  const tagSummary = summarizeTags(files);

  const layouts = cfg.layouts ? Object.keys(cfg.layouts) : ["default"];
  const patchCount = (cfg.patches ?? []).length;

  console.log(`  ${chalk.bold(name.padEnd(12))} ${desc}`);
  console.log(`               ${chalk.gray("Output:")}   ${output}`);
  console.log(`               ${chalk.gray("Layouts:")}  ${layouts.join(", ")}`);
  console.log(
    `               ${chalk.gray("Files:")}    ${files.length}` +
      (tagSummary ? `   ${chalk.gray(`(${tagSummary})`)}` : ""),
  );
  if (patchCount) {
    console.log(`               ${chalk.gray("Patches:")}  ${patchCount}`);
  }
  console.log();
}

function printDetailed(name, cfg) {
  if (cfg.__missing) {
    console.log(
      chalk.yellow(`\nBlueprint "${name}" has no blueprint.config.js — using legacy file discovery.\n`),
    );
    return;
  }
  if (cfg.__error) {
    console.error(chalk.red(`\n✖ Failed to load "${name}": ${cfg.__error}\n`));
    return;
  }

  console.log();
  console.log(chalk.bold.cyan(`Blueprint: ${name}`));
  if (cfg.description) console.log(`  ${cfg.description}`);
  console.log();

  console.log(`  ${chalk.gray("Default output:")} ${cfg.defaultOutput ?? chalk.gray("(not set)")}`);

  // Layouts
  if (cfg.layouts) {
    console.log(`  ${chalk.gray("Layouts:")}`);
    for (const [lname, lmap] of Object.entries(cfg.layouts)) {
      const n = Object.keys(lmap).length;
      console.log(`    - ${lname.padEnd(8)} (${n} file${n === 1 ? "" : "s"})`);
    }
  } else {
    console.log(`  ${chalk.gray("Layouts:")} default`);
  }
  console.log();

  // Files
  const files = cfg.files ?? [];
  if (files.length) {
    console.log(`  ${chalk.gray(`Files (${files.length}):`)}`);
    for (const f of files) {
      const tags = (f.tags ?? []).join(", ") || chalk.gray("—");
      const dest = f.to ?? chalk.gray("(from layout)");
      console.log(`    ${f.template.padEnd(32)} ${chalk.gray("→")} ${dest}`);
      console.log(`    ${" ".repeat(32)} ${chalk.gray(`tags: ${tags}`)}`);
      if (f.description) {
        console.log(`    ${" ".repeat(32)} ${f.description}`);
      }
    }
    console.log();
  }

  // Patches
  const patches = cfg.patches ?? [];
  if (patches.length) {
    console.log(`  ${chalk.gray(`Patches (${patches.length}):`)}`);
    for (const p of patches) {
      console.log(`    file: ${p.file ?? chalk.gray("?")}   marker: ${p.marker ?? chalk.gray("?")}`);
    }
    console.log();
  }
}

/** Compact tag list like "component, api, model, utils" from all file entries. */
function summarizeTags(files) {
  const set = new Set();
  for (const f of files) for (const t of f.tags ?? []) set.add(t);
  if (!set.size) return "";
  return [...set].sort().join(", ");
}