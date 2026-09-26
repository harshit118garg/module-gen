// cli/patch.js
import fs from "fs-extra";
import path from "path";
import ejs from "ejs";
import chalk from "chalk";

/**
 * Apply a single marker-based patch.
 *
 * Insert block shape in the target file:
 *   // gen:<marker>
 *   ...existing lines...
 *   // /gen:<marker>
 *
 * If the markers don't exist, they're appended at the end of the file.
 */
export async function applyPatch({ targetDir, patch, data, has, layout, dryRun, flags }) {
  const filePath = path.resolve(targetDir, patch.file);

  // Optional guards — evaluated before doing anything.
  if (typeof patch.when === "function") {
    const ok = await patch.when({ flags, layout, has, data });
    if (!ok) return { status: "skipped:when", filePath };
  }
  if (typeof patch.skip === "function") {
    const skip = await patch.skip({ flags, layout, has, data });
    if (skip) return { status: "skipped:guard", filePath };
  }

  // Render the insert line with the same EJS data templates get.
  const rendered = ejs.render(patch.insert, data).trim();
  if (!rendered) return { status: "empty", filePath };

  const open = `// gen:${patch.marker}`;
  const close = `// /gen:${patch.marker}`;

  // Read current contents (or start empty if the file doesn't exist).
  let contents = "";
  let existed = false;
  if (await fs.pathExists(filePath)) {
    contents = await fs.readFile(filePath, "utf-8");
    existed = true;
  }

  // Ensure marker block exists.
  let openIdx = contents.indexOf(open);
  let closeIdx = contents.indexOf(close);

  const malformed =
    openIdx !== -1 && closeIdx !== -1 && closeIdx < openIdx;
  if (malformed) {
    return { status: "malformed-markers", filePath };
  }

  if (openIdx === -1 || closeIdx === -1) {
    const trailing = contents.endsWith("\n") || contents === "" ? "" : "\n";
    contents =
      contents +
      `${trailing}\n${open}\n${close}\n`;
    openIdx = contents.indexOf(open);
    closeIdx = contents.indexOf(close);
  }

  // Extract current block lines (between markers).
  const blockStart = openIdx + open.length;
  const existingLines = contents
    .slice(blockStart, closeIdx)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Idempotent: skip if the exact line already exists.
  if (existingLines.includes(rendered)) {
    return { status: "already-present", filePath };
  }

  // Insert just before the close marker.
  const newBlock = "\n" + [...existingLines, rendered].join("\n") + "\n";
  const next = contents.slice(0, blockStart) + newBlock + contents.slice(closeIdx);

  if (!dryRun) {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, next);
  }

  return {
    status: existed ? "patched" : "created",
    filePath,
    line: rendered,
  };
}

/**
 * Apply all patches declared by a blueprint. Returns a list of results.
 */
export async function applyPatches({ targetDir, patches, data, has, layout, dryRun, flags }) {
  const results = [];
  for (const patch of patches ?? []) {
    const res = await applyPatch({
      targetDir,
      patch,
      data,
      has,
      layout,
      dryRun,
      flags,
    });
    results.push({ patch, ...res });
  }
  return results;
}