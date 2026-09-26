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
  patches: [
    {
      // Only run in module layout (there's no parent barrel for flat components).
      when: ({ layout }) => layout === "module",

      // File to edit, relative to targetDir.
      file: "index.ts",

      // Marker key. The block in the file is `// gen:exports` … `// /gen:exports`.
      marker: "exports",

      // Line(s) to insert. EJS-rendered with the same `data` as templates.
      insert: `export * from './components/<%= pascalName %>';`,

      // Only insert if the component file itself will be written.
      skip: ({ has }) => !has("component"),
    },
    {
      when: ({ layout }) => layout === "module",
      file: "index.ts",
      marker: "exports",
      insert: `export type { <%= pascalName %>Props } from './definations/<%= pascalName %>.types';`,
      skip: ({ has }) => !has("types"),
    },
  ],
  files: [
    { template: "__name__.tsx.ejs",              to: "__name__.tsx",              tags: ["component", "ui"] },
    { template: "__name__.controller.ts.ejs",    to: "__name__.controller.ts",    tags: ["controller"] },
    { template: "__name__.model.ts.ejs",         to: "__name__.model.ts",         tags: ["model"] },
    { template: "__name__.types.ts.ejs",         to: "__name__.types.ts",         tags: ["types"] },
  ],
};