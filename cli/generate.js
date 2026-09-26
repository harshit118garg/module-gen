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

export async function generateModule(name, options) {
  const { output, blueprint, force, only, skip, dryRun, ...flags } = options;

  const blueprintDir = path.join(__dirname, "blueprints", blueprint);
  if (!(await fs.pathExists(blueprintDir))) {
    console.error(chalk.red(`✖ Unknown blueprint "${blueprint}". Looked in ${blueprintDir}`));
    process.exit(1);
  }

  const camelName = toCamelCase(name);
  const pascalName = toPascalCase(name);
  const targetDir = path.resolve(process.cwd(), output, camelName);

  if ((await fs.pathExists(targetDir)) && !force) {
    console.error(chalk.red(`✖ Directory already exists: ${targetDir}`));
    console.log(chalk.yellow("  Use --force to overwrite."));
    process.exit(1);
  }
  if (!dryRun) await fs.ensureDir(targetDir);

  const cfg = await loadBlueprint(blueprintDir, { camelName, pascalName });

  const onlySet = new Set((only ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  const skipSet = new Set((skip ?? "").split(",").map((s) => s.trim()).filter(Boolean));

  // --- NEW: resolve which entries will actually be written ---
  const planned = []; // { entry, destRel, outputPath }
  const skipped = []; // strings for the report

  for (const entry of cfg.files ?? []) {
    if (typeof entry.when === "function") {
      const ok = await entry.when({ flags, name: camelName, data: { camelName, pascalName } });
      if (!ok) { skipped.push(entry.to ?? entry.template); continue; }
    }

    const keys = [...(entry.tags ?? []), entry.to];
    if (onlySet.size && !keys.some((k) => onlySet.has(k))) {
      skipped.push(entry.to ?? entry.template); continue;
    }
    if (skipSet.size && keys.some((k) => skipSet.has(k))) {
      skipped.push(entry.to ?? entry.template); continue;
    }

    const destRel = applyNameTokens(entry.to ?? entry.template.replace(/\.ejs$/, ""), {
      camelName, pascalName,
    });

    planned.push({ entry, destRel });
  }

  // --- NEW: build a lookup the templates can query ---
  const plannedFiles = new Set(planned.map((p) => p.destRel));
  const plannedTags  = new Set(planned.flatMap((p) => p.entry.tags ?? []));

  const has = (key) => plannedFiles.has(key) || plannedTags.has(key);

  const data = { name: pascalName, camelName, pascalName, has, files: [...plannedFiles] };

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
      `\n✨ "${data.pascalName}" ${verb} (${blueprint}) at ${path.relative(process.cwd(), targetDir)}\n`,
    ),
  );
}