// cli/blueprints/component/blueprint.config.js
export default {
  defaultOutput: "src/components",
  layouts: {
    flat: {
      "__name__.tsx.ejs":           "__name__.tsx",
      "__name__.controller.ts.ejs": "__name__.controller.ts",
      "__name__.model.ts.ejs":      "__name__.model.ts",
      "__name__.types.ts.ejs":      "__name__.types.ts",
    },
    module: {
      "__name__.tsx.ejs":           "components/__name__.tsx",
      "__name__.controller.ts.ejs": "controllers/__name__.controller.ts",
      "__name__.model.ts.ejs":      "models/__name__.model.ts",
      "__name__.types.ts.ejs":      "definations/__name__.types.ts",
    },
  },
  files: [
    { template: "__name__.tsx.ejs",              to: "__name__.tsx",              tags: ["component", "ui"] },
    { template: "__name__.controller.ts.ejs",    to: "__name__.controller.ts",    tags: ["controller"] },
    { template: "__name__.model.ts.ejs",         to: "__name__.model.ts",         tags: ["model"] },
    { template: "__name__.types.ts.ejs",         to: "__name__.types.ts",         tags: ["types"] },
  ],
};