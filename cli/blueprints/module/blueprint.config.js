// cli/blueprints/module/blueprint.config.js
export default {
  defaultOutput: "src/modules",

  files: [
    { template: "index.ts.ejs",                            to: "index.ts",                            tags: ["index"] },
    { template: "api/__name__.api.ts.ejs",                 to: "api/__name__.api.ts",                 tags: ["api"] },
    { template: "components/__name__.tsx.ejs",             to: "components/__name__.tsx",             tags: ["component", "ui"] },
    { template: "controllers/__name__.controller.ts.ejs",  to: "controllers/__name__.controller.ts",  tags: ["controller"] },
    { template: "definations/__name__.constants.ts.ejs",   to: "definations/__name__.constants.ts",   tags: ["constants", "definations"] },
    { template: "definations/__name__.types.ts.ejs",       to: "definations/__name__.types.ts",       tags: ["types", "definations"] },
    { template: "models/__name__.model.ts.ejs",            to: "models/__name__.model.ts",            tags: ["model"] },
    { template: "utils/__name__.utils.ts.ejs",             to: "utils/__name__.utils.ts",             tags: ["utils"] },
  ],
};