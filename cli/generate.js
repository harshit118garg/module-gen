// cli/generate.js
import fs from "fs-extra";
import path from "path";
import ejs from "ejs";
import chalk from "chalk";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const toCamelCase = (str) =>
  str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toLowerCase());

const toPascalCase = (str) =>
  str
    .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());

/** Filename/path tokens: __name__ → Pascal (default). Aliases still work. */
function applyNameTokens(str, { camelName, pascalName }) {
  return str
    .replace(/__pascalName__/g, pascalName)
    .replace(/__camelName__/g, camelName)
    .replace(/__name__/g, pascalName);
}

/** Load blueprint.config.js if present, otherwise walk the folder (legacy). */
async function loadBlueprint(blueprintDir, nameData) {
  const configPath = path.join(blueprintDir, "blueprint.config.js");
  if (await fs.pathExists(configPath)) {
    const mod = await import(pathToFileURL(configPath).href);
    return mod.default ?? mod;
  }

  const entries = await fs.readdir(blueprintDir, {
    recursive: true,
    withFileTypes: true,
  });
  const files = entries
    .filter((e) => e.isFile() && !e.name.startsWith("blueprint.config"))
    .map((e) => {
      const parent = e.parentPath ?? e.path;
      const rel = path.relative(blueprintDir, path.join(parent, e.name));
      return {
        template: rel,
        to: applyNameTokens(rel.replace(/\.ejs$/, ""), nameData),
      };
    });
  return { defaultOutput: null, files };
}

// --- NEW: auto-detect whether the target folder is a module ---
async function detectLayout(targetDir) {
  if (!(await fs.pathExists(targetDir))) return "flat";

  const hasIndex = await fs.pathExists(path.join(targetDir, "index.ts"));
  if (!hasIndex) return "flat";

  const markers = [
    "components",
    "controllers",
    "models",
    "definations",
    "definations",
  ];
  const hasMarker = (
    await Promise.all(
      markers.map((m) => fs.pathExists(path.join(targetDir, m))),
    )
  ).some(Boolean);

  return hasMarker ? "module" : "flat";
}

export async function generateModule(name, options) {
  const {
    output,
    blueprint,
    force,
    only,
    skip,
    dryRun,
    layout: layoutOpt,
    ...flags
  } = options;

  const blueprintDir = path.join(__dirname, "blueprints", blueprint);
  if (!(await fs.pathExists(blueprintDir))) {
    console.error(
      chalk.red(
        `✖ Unknown blueprint "${blueprint}". Looked in ${blueprintDir}`,
      ),
    );
    process.exit(1);
  }
  const camelName = toCamelCase(name);
  const pascalName = toPascalCase(name);
  const cfg = await loadBlueprint(blueprintDir, { camelName, pascalName });
  const outputBase = path.resolve(process.cwd(), output);
  let layoutName = layoutOpt;
  if (!layoutName) {
    layoutName = cfg.layouts ? await detectLayout(outputBase) : "default";
  }
  if (cfg.layouts && !cfg.layouts[layoutName]) {
    console.error(
      chalk.red(
        `✖ Unknown layout "${layoutName}" for blueprint "${blueprint}"`,
      ),
    );
    console.log(
      chalk.gray(`  Available: ${Object.keys(cfg.layouts).join(", ")}`),
    );
    process.exit(1);
  }
  const layout = cfg.layouts?.[layoutName];
  const isModuleLayout = layoutName === "module";
  const targetDir = isModuleLayout
    ? outputBase
    : path.join(outputBase, camelName);

  // --- NEW: layout validation ---
  if (cfg.layouts && !cfg.layouts[layoutName]) {
    console.error(
      chalk.red(
        `✖ Unknown layout "${layoutName}" for blueprint "${blueprint}"`,
      ),
    );
    console.log(
      chalk.gray(`  Available: ${Object.keys(cfg.layouts).join(", ")}`),
    );
    process.exit(1);
  }

  if ((await fs.pathExists(targetDir)) && !force && !isModuleLayout) {
    console.error(chalk.red(`✖ Directory already exists: ${targetDir}`));
    console.log(chalk.yellow("  Use --force to overwrite."));
    process.exit(1);
  }

  if (!dryRun) await fs.ensureDir(targetDir);

  const onlySet = new Set(
    (only ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const skipSet = new Set(
    (skip ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  // --- resolve which entries will actually be written ---
  const planned = [];
  const skipped = [];

  for (const entry of cfg.files ?? []) {
    if (typeof entry.when === "function") {
      const ok = await entry.when({
        flags,
        name: camelName,
        data: { camelName, pascalName },
      });
      if (!ok) {
        skipped.push(entry.to ?? entry.template);
        continue;
      }
    }

    const keys = [...(entry.tags ?? []), entry.to, entry.template];
    if (onlySet.size && !keys.some((k) => onlySet.has(k))) {
      skipped.push(entry.to ?? entry.template);
      continue;
    }
    if (skipSet.size && keys.some((k) => skipSet.has(k))) {
      skipped.push(entry.to ?? entry.template);
      continue;
    }

    // --- CHANGED: destination comes from the layout first, then entry.to,
    //              then the template's own path.
    const rawDest =
      layout?.[entry.template] ??
      entry.to ??
      entry.template.replace(/\.ejs$/, "");

    const destRel = applyNameTokens(rawDest, { camelName, pascalName });
    planned.push({ entry, destRel });
  }

  // --- build a lookup the templates can query ---
  const plannedFiles = new Set(planned.map((p) => p.destRel));
  const plannedTags = new Set(planned.flatMap((p) => p.entry.tags ?? []));

  const has = (key) => plannedFiles.has(key) || plannedTags.has(key);

  // --- CHANGED: expose `layout` to EJS so templates can pick import paths ---
  const data = {
    name: pascalName,
    camelName,
    pascalName,
    layout: layoutName,
    has,
    files: [...plannedFiles],
  };

  const written = [];

  for (const { entry, destRel } of planned) {
    const sourcePath = path.join(blueprintDir, entry.template);
    if (!(await fs.pathExists(sourcePath))) {
      console.warn(chalk.yellow(`  ⚠ missing template: ${entry.template}`));
      continue;
    }

    const outputPath = destRel.startsWith("/")
      ? path.resolve(process.cwd(), destRel.slice(1))
      : path.join(targetDir, destRel);

    const rel = path.relative(process.cwd(), outputPath);

    if (dryRun) {
      console.log(chalk.gray(`  [dry-run] ${rel}`));
      written.push(outputPath);
      continue;
    }

    await fs.ensureDir(path.dirname(outputPath));
    const rendered = ejs.render(await fs.readFile(sourcePath, "utf-8"), data);
    await fs.writeFile(outputPath, rendered);

    written.push(outputPath);
    console.log(chalk.green(`  ✔ ${rel}`));
  }

  if (skipped.length) {
    console.log(chalk.gray(`  ↷ skipped: ${skipped.join(", ")}`));
  }

  const verb = dryRun ? "planned" : "generated";
  console.log(
    chalk.cyan(
      `\n✨ "${data.pascalName}" ${verb} (${blueprint}, layout=${layoutName}) at ${path.relative(process.cwd(), targetDir)}\n`,
    ),
  );
}
