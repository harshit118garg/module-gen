// cli/blueprints/component/blueprint.config.js
export default {
  defaultOutput: "src/components",

  files: [
    { template: "__name__.tsx.ejs",              to: "__name__.tsx",              tags: ["component", "ui"] },
    { template: "__name__.controller.ts.ejs",    to: "__name__.controller.ts",    tags: ["controller"] },
    { template: "__name__.model.ts.ejs",         to: "__name__.model.ts",         tags: ["model"] },
    { template: "__name__.types.ts.ejs",         to: "__name__.types.ts",         tags: ["types"] },
  ],
};