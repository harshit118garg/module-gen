
import { Command } from 'commander';
import chalk from 'chalk';
import { generateModule } from './generate.js';

const program = new Command();
program.name('gen').description('Module generator').version('2.0.0');

program
  .command('module')
  .argument('<name>', 'Module name, e.g. User or user-profile')
  .option('-o, --output <dir>', 'Output directory', 'src/modules')
  .option('-b, --blueprint <name>', 'Blueprint to use', 'module')
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
