#!/usr/bin/env node

/**
 * Schema validation and conflict detection for MCP server definitions.
 *
 * Usage:
 *   node scripts/validate.js servers/foo.json servers/bar.json
 *   node scripts/validate.js --all
 *   node scripts/validate.js --check-conflicts
 */

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { glob } = require("glob");

const ROOT = path.resolve(__dirname, "..");
const SCHEMA_PATH = path.join(ROOT, "schemas", "server-definition.schema.json");
const SERVERS_DIR = path.join(ROOT, "servers");
const CATEGORIES_PATH = path.join(ROOT, "categories.json");

// Fields that contributors must not set -- they are platform-managed
const PLATFORM_FIELDS = ["badges", "stats", "sponsored", "featured"];

/**
 * Load the set of valid category IDs from categories.json. The bundler's
 * server_categories table has a foreign key to categories.id, so any server
 * that references an ID not in categories.json will silently fail to sync.
 * We catch those at validate time so they never reach main.
 */
function loadValidCategoryIds() {
  try {
    const raw = fs.readFileSync(CATEGORIES_PATH, "utf-8");
    const categories = JSON.parse(raw);
    return new Set(categories.map((c) => c.id));
  } catch (err) {
    console.error(`Failed to load categories.json: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

async function getAllServerFiles() {
  const pattern = path.join(SERVERS_DIR, "*.json").replace(/\\/g, "/");
  const files = await glob(pattern);
  return files.map((f) => path.resolve(f));
}

function stripPlatformFields(data, filePath) {
  const warnings = [];
  for (const field of PLATFORM_FIELDS) {
    if (data[field] !== undefined) {
      warnings.push(
        `  WARNING: "${field}" is a platform-managed field and will be stripped from ${path.basename(filePath)}`
      );
      delete data[field];
    }
  }
  // Also check nested _platform prefix fields
  for (const key of Object.keys(data)) {
    if (key.startsWith("_platform")) {
      warnings.push(
        `  WARNING: "${key}" is a platform-managed field and will be stripped from ${path.basename(filePath)}`
      );
      delete data[key];
    }
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// Validate
// ---------------------------------------------------------------------------

async function validateFiles(files) {
  const schema = loadJson(SCHEMA_PATH);

  // Remove $schema draft identifier -- ajv v8 uses draft-07 by default and
  // does not ship the 2020-12 meta-schema.  The structural keywords we use
  // are compatible, so we simply strip the $schema to avoid a lookup error.
  delete schema.$schema;

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const validCategoryIds = loadValidCategoryIds();

  let hasErrors = false;

  for (const filePath of files) {
    const relative = path.relative(ROOT, filePath);
    let data;
    try {
      data = loadJson(filePath);
    } catch (err) {
      console.error(`FAIL  ${relative}`);
      console.error(`  Could not parse JSON: ${err.message}`);
      hasErrors = true;
      continue;
    }

    // Strip platform-managed fields and warn
    const warnings = stripPlatformFields(data, filePath);
    for (const w of warnings) {
      console.warn(w);
    }

    const valid = validate(data);
    const fileErrors = [];
    if (!valid) {
      for (const err of validate.errors) {
        fileErrors.push(`${err.instancePath || "/"}: ${err.message}`);
      }
    }

    // Enforce that every category reference exists in categories.json.
    // The bundler's server_categories table has a FK constraint — a typo
    // here silently breaks sync for this server.
    if (validCategoryIds && Array.isArray(data.categories)) {
      const unknown = data.categories.filter((id) => !validCategoryIds.has(id));
      for (const id of unknown) {
        fileErrors.push(
          `/categories: unknown category "${id}" (not in categories.json; pick one of: ${Array.from(validCategoryIds).sort().join(", ")})`
        );
      }
    }

    if (fileErrors.length > 0) {
      console.error(`FAIL  ${relative}`);
      for (const msg of fileErrors) {
        console.error(`  - ${msg}`);
      }
      hasErrors = true;
    } else {
      console.log(`PASS  ${relative}`);
    }
  }

  return hasErrors;
}

// ---------------------------------------------------------------------------
// Conflict detection
// ---------------------------------------------------------------------------

async function checkConflicts() {
  const files = await getAllServerFiles();
  if (files.length === 0) {
    console.log("No server files found. Skipping conflict check.");
    return false;
  }

  const ids = new Map(); // id -> file
  const aliases = new Map(); // alias -> file
  let hasConflicts = false;

  for (const filePath of files) {
    const relative = path.relative(ROOT, filePath);
    let data;
    try {
      data = loadJson(filePath);
    } catch {
      // Skip files that cannot be parsed -- validate step will catch them
      continue;
    }

    // Check duplicate IDs
    if (data.id) {
      if (ids.has(data.id)) {
        console.error(
          `CONFLICT  Duplicate ID "${data.id}" in ${relative} (already defined in ${ids.get(data.id)})`
        );
        hasConflicts = true;
      } else {
        ids.set(data.id, relative);
      }

      // Also check if an ID collides with an existing alias
      if (aliases.has(data.id)) {
        console.error(
          `CONFLICT  ID "${data.id}" in ${relative} collides with alias in ${aliases.get(data.id)}`
        );
        hasConflicts = true;
      }
    }

    // Check duplicate aliases
    if (data.alias) {
      if (aliases.has(data.alias)) {
        console.error(
          `CONFLICT  Duplicate alias "${data.alias}" in ${relative} (already defined in ${aliases.get(data.alias)})`
        );
        hasConflicts = true;
      } else {
        aliases.set(data.alias, relative);
      }

      // Also check if alias collides with an existing ID
      if (ids.has(data.alias)) {
        console.error(
          `CONFLICT  Alias "${data.alias}" in ${relative} collides with ID in ${ids.get(data.alias)}`
        );
        hasConflicts = true;
      }
    }
  }

  if (!hasConflicts) {
    console.log(`No conflicts found across ${files.length} server file(s).`);
  }

  return hasConflicts;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  const doAll = args.includes("--all");
  const doConflicts = args.includes("--check-conflicts");
  const fileArgs = args.filter((a) => !a.startsWith("--"));

  let exitCode = 0;

  // Conflict-only mode
  if (doConflicts && !doAll && fileArgs.length === 0) {
    const conflicts = await checkConflicts();
    if (conflicts) exitCode = 1;
    process.exit(exitCode);
  }

  // Determine files to validate
  let files = [];
  if (doAll) {
    files = await getAllServerFiles();
  } else if (fileArgs.length > 0) {
    files = fileArgs.map((f) => path.resolve(f));
  }

  if (files.length === 0 && !doConflicts) {
    console.log("No files to validate. Provide file paths or use --all.");
    process.exit(0);
  }

  // Validate
  if (files.length > 0) {
    const hasErrors = await validateFiles(files);
    if (hasErrors) exitCode = 1;
  }

  // Optionally run conflict check alongside validation
  if (doConflicts) {
    const conflicts = await checkConflicts();
    if (conflicts) exitCode = 1;
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
