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
