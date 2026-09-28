#!/usr/bin/env node
/**
 * Fails when a SERVER module imports a VALUE from a `"use client"` module.
 *
 * ## Why this is a bug, not a style rule
 *
 * On the server, anything imported from a `"use client"` module is a CLIENT REFERENCE — a
 * placeholder React resolves in the browser — not the value itself. A component is fine: the
 * server only needs a reference to render it. A constant, a hook or a helper is not: the server
 * code reading it gets the placeholder.
 *
 * It failed for real on 2026-09-28. `problem-map-page.tsx` imported `DEFAULT_PROBLEM_CLUSTER_SORT`
 * from `problem-map-panel.tsx`, used it to build the server's cluster read, sent the placeholder as
 * `?sort=`, got a 422, and every page load silently lost its server seed. Nothing errored.
 *
 * ## Why "it renders fine" is not proof
 *
 * Passed straight into rendered output — `<main id={SOME_ID}>` — a client reference IS resolved,
 * in the browser, so the page looks right. The first time the same value is USED on the server (a
 * string concatenation, a comparison, a URL) it silently breaks. This check flags both, because
 * the second is one refactor away from the first.
 *
 * ## What it does
 *
 * Walks the import graph from every non-client file under `src/app` (routes, layouts, metadata),
 * following `@/…` and relative imports and `export … from`, and stops at `"use client"` modules —
 * that set is the server graph. In it, every non-`type` import from a `"use client"` module whose
 * binding is not a component is reported. A component is a PascalCase binding whose export in the
 * target is a `function`, or a `const` bound to an arrow, `memo`, `forwardRef` or `dynamic`.
 *
 * The fix is always the same: move the value to a module with no directive and import it from
 * there on both sides.
 *
 * Usage: `pnpm check:client-boundary` (optionally `node scripts/check-client-value-imports.mjs
 * <srcDirectory>` to scan another tree). Exits 1 on any finding.
 */
import fs from "node:fs";
import path from "node:path";

const sourceDirectory = path.resolve(process.argv[2] ?? path.join(process.cwd(), "src"));
/** Findings print relative to the scanned tree's parent — `src/…` for the default run. */
const reportRoot = path.dirname(sourceDirectory);
const appDirectory = path.join(sourceDirectory, "app");

const sourceFiles = [];
(function collectSourceFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectSourceFiles(entryPath);
    else if (/\.(tsx?|jsx?|mts)$/.test(entry.name) && !/\.test\.[jt]sx?$/.test(entry.name)) {
      sourceFiles.push(entryPath);
    }
  }
})(sourceDirectory);

const sourceTextByFile = new Map(
  sourceFiles.map((filePath) => [filePath, fs.readFileSync(filePath, "utf8")]),
);

/** The directive must be the first statement; leading comments are allowed before it. */
function isClientModule(filePath) {
  const withoutLeadingComments = sourceTextByFile
    .get(filePath)
    .replace(/^(\s*(\/\/[^\n]*|\/\*[\s\S]*?\*\/))*\s*/, "");
  return /^["']use client["']/.test(withoutLeadingComments);
}

const RESOLVABLE_SUFFIXES = ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"];

function resolveImportSpecifier(importingFile, specifier) {
  let basePath;
  if (specifier.startsWith("@/")) basePath = path.join(sourceDirectory, specifier.slice(2));
  else if (specifier.startsWith("."))
    basePath = path.resolve(path.dirname(importingFile), specifier);
  else return null;
  for (const suffix of RESOLVABLE_SUFFIXES) {
    if (sourceTextByFile.has(basePath + suffix)) return basePath + suffix;
  }
  return null;
}

const IMPORT_STATEMENT_PATTERN = /import\s+(type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/g;
const REEXPORT_STATEMENT_PATTERN = /export\s+(type\s+)?\{([^}]*)\}\s+from\s+["']([^"']+)["']/g;

function lineNumberAt(text, characterIndex) {
  return text.slice(0, characterIndex).split("\n").length;
}

function listModuleImports(filePath) {
  const text = sourceTextByFile.get(filePath);
  const moduleImports = [];
  for (const match of text.matchAll(IMPORT_STATEMENT_PATTERN)) {
    const targetFile = resolveImportSpecifier(filePath, match[3]);
    if (targetFile === null) continue;
    moduleImports.push({
      isTypeOnly: Boolean(match[1]),
      clause: match[2].trim(),
      targetFile,
      line: lineNumberAt(text, match.index),
    });
  }
  for (const match of text.matchAll(REEXPORT_STATEMENT_PATTERN)) {
    const targetFile = resolveImportSpecifier(filePath, match[3]);
    if (targetFile === null) continue;
    moduleImports.push({
      isTypeOnly: Boolean(match[1]),
      clause: `{${match[2]}}`,
      targetFile,
      line: lineNumberAt(text, match.index),
    });
  }
  return moduleImports;
}

/** `[exportedName, localName]` for every value binding an import clause brings in. */
function listValueBindings(clause) {
  const bindings = [];
  const defaultBinding = clause.match(/^([A-Za-z_$][\w$]*)\s*(,|$)/);
  if (defaultBinding) bindings.push(["default", defaultBinding[1]]);
  const namedBindings = clause.match(/\{([^}]*)\}/);
  if (namedBindings) {
    for (const rawBinding of namedBindings[1].split(",")) {
      const binding = rawBinding.trim();
      if (binding === "" || binding.startsWith("type ")) continue;
      const [exportedName, localName = exportedName] = binding
        .split(/\s+as\s+/)
        .map((part) => part.trim());
      bindings.push([exportedName, localName]);
    }
  }
  const namespaceBinding = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
  if (namespaceBinding) bindings.push(["*", namespaceBinding[1]]);
  return bindings;
}

function isComponentExport(targetFile, exportedName, localName) {
  if (!/^[A-Z][a-z0-9]/.test(localName)) return false;
  const targetText = sourceTextByFile.get(targetFile);
  if (exportedName === "default") {
    return /export\s+default\s+(async\s+)?function\s+[A-Z]|export\s+default\s+[A-Z][\w$]*\s*;?\s*$/m.test(
      targetText,
    );
  }
  if (exportedName === "*") return false;
  return new RegExp(
    `export\\s+(async\\s+)?function\\s+${exportedName}\\b|export\\s+const\\s+${exportedName}\\s*=\\s*(\\(|async\\s*\\(|memo|forwardRef|dynamic)`,
  ).test(targetText);
}

// --- The server graph --------------------------------------------------------------------------
const serverModules = new Set();
const pendingModules = sourceFiles.filter(
  (filePath) => filePath.startsWith(appDirectory + path.sep) && !isClientModule(filePath),
);
while (pendingModules.length > 0) {
  const filePath = pendingModules.pop();
  if (serverModules.has(filePath) || isClientModule(filePath)) continue;
  serverModules.add(filePath);
  for (const moduleImport of listModuleImports(filePath)) {
    if (!moduleImport.isTypeOnly && !isClientModule(moduleImport.targetFile)) {
      pendingModules.push(moduleImport.targetFile);
    }
  }
}

// --- Findings ----------------------------------------------------------------------------------
const findings = [];
for (const filePath of serverModules) {
  for (const moduleImport of listModuleImports(filePath)) {
    if (moduleImport.isTypeOnly || !isClientModule(moduleImport.targetFile)) continue;
    for (const [exportedName, localName] of listValueBindings(moduleImport.clause)) {
      if (isComponentExport(moduleImport.targetFile, exportedName, localName)) continue;
      findings.push(
        `${path.relative(reportRoot, filePath)}:${moduleImport.line}  ${localName}  from  ${path.relative(reportRoot, moduleImport.targetFile)}`,
      );
    }
  }
}

if (findings.length > 0) {
  process.stderr.write(
    `A server module imports a VALUE from a "use client" module — on the server that is a client reference, not the value. Move it to a module with no directive.\n\n`,
  );
  for (const finding of findings.toSorted()) process.stderr.write(`  ${finding}\n`);
  process.exit(1);
}
process.stdout.write(
  `check:client-boundary — ${serverModules.size} server modules, no value imported from a "use client" module.\n`,
);
