import path from "node:path";
import { exists, read } from "./fs.mjs";
import { parseYaml } from "./yaml.mjs";

/**
 * The decision register: the decisions this project owes an explicit answer to.
 *
 * devia already had two registries, and both of them are *reactive* — a gap is a question
 * somebody tripped over, a debt line is a rule somebody noticed the code breaking. Neither says
 * anything before the work starts, which is exactly when an agent invents a brand, a framework
 * version and a robots policy nobody asked it for.
 *
 *   11_GAPS.md       questions discovered while working          — unknown unknowns
 *   12_DEBT.md       decided, not built
 *   decisions.yaml   questions this kind of project always has   — known unknowns
 *
 * The register enumerates the third kind up front, so that a missing answer is a recorded state
 * rather than an empty space the next agent fills in silently:
 *
 *   information missing -> PENDING -> human decision OR explicit delegation -> implementation
 *
 * Four states, not three. `not_required` is a decision — "this product ships no photography" —
 * and collapsing it into `pending` would leave a permanent false alarm on a project that has
 * already ruled. Absence of information and absence of need are not the same fact (`DEC-001`).
 */

export const STATUSES = ["decided", "pending", "delegated", "not_required"];

export const REGISTER_FILE = "decisions.yaml";

/** What a status means, in the words the CLI prints. */
export const MEANING = {
  decided: "a human ruled; the value is binding",
  pending: "nobody has ruled — do not encode an answer",
  delegated: "the agent may choose, within the stated bounds",
  not_required: "deliberately not needed here",
};

/**
 * Which decisions a profile owes an answer to.
 *
 * Seeded, not invented per project: a slot earns its place by being a decision an agent has been
 * observed to make on its own when nobody made it. A `service` has no brand to invent and no page
 * to index, so it is not asked — a register full of `not_required` teaches the reader to skim it,
 * which is the failure the file exists to prevent.
 */
export const PROFILE_SLOTS = {
  "*": [
    ["product.purpose", "What this product is for, in one sentence"],
    ["product.audience", "Who it is for"],
    ["stack.language", "Language and runtime version"],
    ["stack.framework", "The framework, and the version selected at initialisation"],
    ["stack.data_store", "Where state lives"],
    ["testing.framework", "What runs the tests"],
    ["ops.hosting", "Where it runs"],
  ],
  "web-app": [
    ["product.primary_action", "The one thing a visitor should do"],
    ["brand.logo", "The mark, as a file this repository can use"],
    ["brand.colors", "The palette, as tokens"],
    ["brand.typography", "The typefaces, and their licence"],
    ["design.direction", "The visual direction this product commits to"],
    ["design.system", "An existing system, a custom one, or none"],
    ["content.source", "Who writes the words"],
    ["content.imagery", "Photography, illustration, or neither"],
    ["discovery.indexing", "Whether search engines may index this, and which host is canonical"],
    ["discovery.ai_crawlers", "Whether AI crawlers may fetch and train on this content"],
  ],
  "design-system": [
    ["brand.colors", "The palette, as tokens"],
    ["brand.typography", "The typefaces, and their licence"],
    ["design.direction", "The visual direction this system commits to"],
  ],
  docs: [
    ["content.source", "Who writes the words"],
    ["discovery.indexing", "Whether search engines may index this, and which host is canonical"],
    ["discovery.ai_crawlers", "Whether AI crawlers may fetch and train on this content"],
  ],
};

/** The slots a profile owes, de-duplicated, in declaration order. */
export function slotsForProfile(profile) {
  const out = new Map();
  for (const [key, question] of PROFILE_SLOTS["*"]) out.set(key, question);
  for (const [key, question] of PROFILE_SLOTS[profile] || []) out.set(key, question);
  return [...out].map(([key, question]) => ({ key, question }));
}

export function groupOf(key) {
  const i = String(key).indexOf(".");
  return i < 0 ? String(key) : String(key).slice(0, i);
}

/**
 * Read the register. A project without one is not an error here: an 0.8.0 memory has no
 * register, and a reader that treats "absent" as "broken" turns the upgrade into a cliff.
 */
export function loadRegister(deviaDir) {
  const file = path.join(deviaDir, REGISTER_FILE);
  if (!exists(file)) return { exists: false, slots: [], errors: [], version: null, raw: "" };

  const raw = read(file) || "";
  let doc;
  try {
    doc = parseYaml(raw);
  } catch (e) {
    return {
      exists: true,
      slots: [],
      errors: [`${REGISTER_FILE} is not readable: ${e.message}`],
      version: null,
      raw,
    };
  }

  const decisions = doc && doc.decisions;
  if (!decisions || typeof decisions !== "object" || Array.isArray(decisions)) {
    return {
      exists: true,
      slots: [],
      errors: [`${REGISTER_FILE} has no \`decisions:\` map`],
      version: doc ? doc.version ?? null : null,
      raw,
    };
  }

  const errors = [];
  const slots = [];
  const str = (v) => (v == null ? "" : String(v));
  for (const [key, value] of Object.entries(decisions)) {
    const body = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    if (value !== null && (typeof value !== "object" || Array.isArray(value))) {
      errors.push(`${key}: a slot is a mapping of fields, not a bare value`);
    }
    slots.push({
      key,
      group: groupOf(key),
      status: value == null ? null : body.status == null ? null : String(body.status),
      question: str(body.question),
      value: str(body.value),
      because: str(body.because),
      owner: str(body.owner),
      to: str(body.to),
      bounded_by: str(body.bounded_by),
      path: str(body.path),
      package: str(body.package),
      blocks: [].concat(body.blocks || []).map(String).filter(Boolean),
      decided_at: str(body.decided_at),
      note: str(body.note),
    });
  }
  return { exists: true, slots, errors, version: doc.version ?? null, raw };
}

/**
 * What is wrong with one slot, as sentences.
 *
 * Every one of these is a way of writing a decision down that does not decide it: a `decided`
 * with no value, a `delegated` with no bounds — a blank cheque wearing the word "explicit" — a
 * `pending` nobody owns, which is how a question stays open for a year.
 */
export function slotIssues(slot) {
  const out = [];
  const say = (m) => out.push(`${slot.key}: ${m}`);

  if (!slot.status) say("no status");
  else if (!STATUSES.includes(slot.status)) {
    say(`unknown status "${slot.status}" (${STATUSES.join(", ")})`);
  }

  if (slot.status === "decided") {
    if (!slot.value && !slot.path) say("decided with no value");
    if (!slot.because) say("decided with no reason — `because:` is what makes it reviewable");
    if (!slot.decided_at) say("decided with no date (DEC-003)");
  }
  if (slot.status === "delegated" && !slot.bounded_by) {
    say("delegated with no bounds — that is not delegation, it is absence (DEC-002)");
  }
  if (slot.status === "pending" && !slot.owner) {
    say("pending with no owner — nobody is going to decide it");
  }
  if (slot.status === "not_required" && !slot.because) {
    say("not_required with no reason — indistinguishable from forgotten");
  }
  if (slot.decided_at && !/^\d{4}-\d{2}-\d{2}$/.test(slot.decided_at)) {
    say(`decided_at "${slot.decided_at}" is not an ISO date`);
  }
  return out;
}

/** Every integrity problem in the register, slot problems included. */
export function registerIssues(register) {
  const out = [...register.errors];
  for (const slot of register.slots) out.push(...slotIssues(slot));
  return out;
}

export function countByStatus(slots) {
  const out = { decided: 0, pending: 0, delegated: 0, not_required: 0, invalid: 0 };
  for (const s of slots) {
    if (s.status && s.status in out) out[s.status]++;
    else out.invalid++;
  }
  return out;
}

/**
 * Pending decisions whose subject already exists in the tree.
 *
 * This is the teeth, and it is deliberately the project's own declaration rather than devia's
 * opinion: `blocks: ["app/(marketing)"]` means *this* project ruled that a marketing surface must
 * not be built while its visual direction is undecided. A pending slot that blocks nothing is a
 * normal state of a live project and never stops a build — a register that blocked on every open
 * question would be switched off inside a week.
 */
export function blockingPending(root, slots) {
  const out = [];
  for (const slot of slots) {
    if (slot.status !== "pending" || !slot.blocks.length) continue;
    const built = slot.blocks.filter((rel) =>
      exists(path.join(root, rel.split("/").join(path.sep)))
    );
    if (built.length) out.push({ slot, built });
  }
  return out;
}

/**
 * Decided slots that promise a file which is not there.
 *
 * "logo: decided, assets/brand/logo.svg" with no such file is the exact moment an agent
 * improvises a placeholder mark and the project quietly acquires a brand nobody chose
 * (`DEC-005`).
 */
export function missingAssets(root, slots) {
  return slots.filter(
    (s) =>
      s.status === "decided" &&
      s.path &&
      !exists(path.join(root, s.path.split("/").join(path.sep)))
  );
}

/** The major version in a version string or range, or null when there is no version in it. */
export function majorOf(text) {
  const m = String(text ?? "").match(/(\d+)(?:\.\d+)*/);
  return m ? m[1] : null;
}

/**
 * Stack decisions whose declared version disagrees with the manifest.
 *
 * devia never asks a registry what the newest release is: it has no network, and "latest" is a
 * moving fact that would rot in the register the day after it was written. What it can check is
 * the thing that is actually a defect — the project decided on a version and the code runs
 * another. Whether the decided version is still the right one is `npm outdated`'s job, and
 * staying on an old major on purpose is a decision devia records rather than punishes
 * (`DEC-003`).
 *
 * Majors only: `16.x`, `^16.1.0` and `16.1.4` are the same decision, and comparing them
 * literally would report drift on every patch bump.
 */
export function stackDrift(slots, deps) {
  const out = [];
  for (const slot of slots) {
    if (slot.status !== "decided" || !slot.package) continue;
    const installed = deps[slot.package];
    if (installed === undefined) {
      out.push({ slot, kind: "absent", installed: null });
      continue;
    }
    const want = majorOf(slot.value);
    const got = majorOf(installed);
    if (!want || !got) continue;
    if (want !== got) out.push({ slot, kind: "drift", installed: String(installed), want, got });
  }
  return out;
}

/* ------------------------------------------------------------------ writing */

const FIELD_ORDER = [
  "question",
  "status",
  "value",
  "path",
  "package",
  "because",
  "owner",
  "to",
  "bounded_by",
  "blocks",
  "decided_at",
  "note",
];

/** Quote only what the parser would otherwise read as something else. */
export function yamlScalar(value) {
  const s = String(value);
  if (s === "") return '""';
  if (/^(true|false|null|~)$/i.test(s)) return `"${s}"`;
  if (/^-?\d+(\.\d+)?$/.test(s)) return `"${s}"`;
  if (/[:#"'[\]{}]|^\s|\s$|^[-?&*!|>%@`]/.test(s)) {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return s;
}

/** One slot as the YAML block the parser reads back, indented under `decisions:`. */
export function renderSlot(key, fields) {
  const out = [`  ${yamlScalar(key)}:`];
  for (const name of FIELD_ORDER) {
    const v = fields[name];
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      if (!v.length) continue;
      out.push(`    ${name}: [${v.map(yamlScalar).join(", ")}]`);
    } else {
      out.push(`    ${name}: ${yamlScalar(v)}`);
    }
  }
  return out.join("\n");
}

const DECISIONS_KEY = /^decisions:\s*$/;
const indentOf = (l) => l.length - l.replace(/^\s+/, "").length;
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Replace or insert one slot. Every line outside that slot — comments included — survives byte
 * for byte; only the block being rewritten is re-emitted.
 *
 * A register is a file humans annotate. Re-emitting the whole document from the parsed model
 * would silently delete the sentence somebody wrote next to the hardest decision in the project,
 * which is precisely the sentence worth keeping.
 */
export function upsertSlot(text, key, fields) {
  const lines = String(text ?? "").split("\n");
  const block = renderSlot(key, fields).split("\n");

  const head = lines.findIndex((l) => DECISIONS_KEY.test(l));
  if (head < 0) {
    const tail = String(text ?? "").trimEnd();
    return `${tail ? tail + "\n\n" : ""}decisions:\n${block.join("\n")}\n`;
  }

  const keyLine = new RegExp(`^ {2}(${escapeRe(key)}|"${escapeRe(key)}"):\\s*$`);
  let at = -1;
  for (let i = head + 1; i < lines.length; i++) {
    if (lines[i].trim() && indentOf(lines[i]) < 2) break;
    if (keyLine.test(lines[i])) {
      at = i;
      break;
    }
  }

  // The slot's own lines: its key line plus everything indented under it. Trailing blank lines
  // belong to the file's spacing, not to the slot.
  const endOfSlot = (start) => {
    let end = start + 1;
    while (end < lines.length && (!lines[end].trim() || indentOf(lines[end]) > 2)) end++;
    while (end > start + 1 && !lines[end - 1].trim()) end--;
    return end;
  };

  if (at >= 0) {
    lines.splice(at, endOfSlot(at) - at, ...block);
    return lines.join("\n");
  }

  // New slot: keep the map sorted, so the diff shows one added block and not a reshuffle.
  let insertAt = -1;
  let last = -1;
  for (let i = head + 1; i < lines.length; i++) {
    if (lines[i].trim() && indentOf(lines[i]) < 2) {
      insertAt = i;
      break;
    }
    if (indentOf(lines[i]) === 2 && lines[i].trim()) {
      const other = lines[i].trim().replace(/:\s*$/, "").replace(/^["']|["']$/g, "");
      if (other > key) {
        insertAt = i;
        break;
      }
      last = i;
    }
  }
  if (insertAt < 0) insertAt = last < 0 ? head + 1 : endOfSlot(last);
  lines.splice(insertAt, 0, ...block);
  return lines.join("\n");
}
