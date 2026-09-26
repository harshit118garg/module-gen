// cli/index.js
import { Command } from "commander";
import chalk from "chalk";
import { generateModule } from "./generate.js";
import { renameGenerated } from "./rename.js"; // ← NEW
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";

const program = new Command();
program.name("gen").description("Module generator").version("2.0.0");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const blueprintsDir = path.join(__dirname, "blueprints");

const runGenerate = (label) => async (name, options) => {
  try {
    await generateModule(name, options);
  } catch (err) {
    console.error(chalk.red(`Failed to generate ${label}`), err);
    process.exit(1);
  }
};

const DEFAULT_OUTPUT = {
  module: "src/modules",
  component: "src/components",
};

const RESERVED = new Set(["rename"]);
const blueprints = (await fs.readdir(blueprintsDir))
  .filter((f) => fs.statSync(path.join(blueprintsDir, f)).isDirectory())
  .filter((f) => {
    if (RESERVED.has(f)) {
      console.warn(
        chalk.yellow(
          `⚠ Blueprint "${f}" shadows a reserved command; skipping.`,
        ),
      );
      return false;
    }
    return true;
  });

for (const bp of blueprints) {
  program
    .command(bp)
    .description(`Generate a ${bp} from the "${bp}" blueprint`)
    .argument("<name>", `${bp} name, e.g. User or user-profile`)
    .option(
      "-o, --output <dir>",
      "Output directory",
      DEFAULT_OUTPUT[bp] ?? `src/${bp}s`,
    )
    .option("-b, --blueprint <name>", "Blueprint to use", bp)
    .option("-f, --force", "Overwrite if it already exists")
    .option("--only <list>", "Comma-separated tags/files to include")
    .option("--skip <list>", "Comma-separated tags/files to exclude")
    .option(
      "--layout <name>",
      "Force a layout (flat | module). Auto-detected by default.",
    )
    .option("--dry-run", "Print the plan without writing files")
    .option("--no-patch", "Skip barrel/patch updates (generate files only)")  // ← NEW
    .action(runGenerate(bp));
}

program
  .command("rename <blueprint> <oldName> <newName>")
  .description(
    "Rename a previously generated module or component and update internal references",
  )
  .option(
    "-o, --output <dir>",
    "Directory containing the previously generated files (e.g. src/modules or src/components)",
  )
  .option(
    "-f, --force",
    "Skip confirmation prompt and overwrite existing targets",
  )
  .option("--dry-run", "Show the plan without writing files")
  .action(async (blueprint, oldName, newName, options) => {
    try {
      await renameGenerated(oldName, newName, options);
    } catch (err) {
      console.error(chalk.red("Rename failed"), err);
      process.exit(1);
    }
  });

program.parse(process.argv);
