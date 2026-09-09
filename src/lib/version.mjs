import path from "node:path";
import { packageRoot, read, readJSON } from "./fs.mjs";
import { parseYaml } from "./yaml.mjs";

/**
 * Two versions, deliberately separate: the CLI ships bug fixes without moving the standard, and
 * the standard gains rules without a CLI change. An adopter pins the second and reports the
 * first, so neither may stand in for the other.
 */

/** Version of the installed devia CLI. */
export function cliVersion() {
  return readJSON(path.join(packageRoot, "package.json"))?.version || "0.0.0";
}

/** Version of the standard corpus. */
export function standardVersion() {
  return parseYaml(read(path.join(packageRoot, "VERSION")) || "").standard_version || "0.0.0";
}
