import path from "node:path";
import { exists, read, readJSON, walk, packageRoot } from "./fs.mjs";
import { parseYaml } from "./yaml.mjs";
import { loadRules } from "./rules.mjs";
import { estimateTokens } from "./tokens.mjs";
import { gatesByRule } from "./gates.mjs";

/**
 * Which part of devia an agent actually needs for the task in front of it.
 *
 * Storing knowledge and delivering it are two different jobs. `.devia/` plus the registry is
 * everything devia knows about a project; the amount of it that belongs in a context window for
 * "add POST /api/orders" is a small fraction, and the rest is noise that pushes the code the
 * agent is supposed to read out of the window.
 *
 *   FULL KNOWLEDGE  ->  ROUTER  ->  TIERS  ->  BUDGET  ->  MINIMAL CONTEXT
 *
 * Two invariants hold the whole thing up:
 *
 * 1. A blocking constraint is admitted before the budget is consulted and is never evicted. A
 *    small budget produces a reported overrun, never a silently dropped P0 (`AGT-013`).
 * 2. Every selection carries its reason. "Why was this here?" and "why was this not?" are both
 *    answerable, because a selector nobody can interrogate is a selector nobody should trust.
 */

export const DEFAULT_BUDGET = 1200;

/** Tier order is selection order. T0 is admitted first and unconditionally. */
export const TIERS = {
  T0: "blocking constraints",
  T1: "task-critical policy",
  T2: "project knowledge",
  T3: "known failures",
  T4: "supporting context",
  T5: "not relevant",
};

/**
 * The contract applies to every task, whatever the task is: an agent inventing an endpoint or
 * deleting a debt line is a failure in a database change as much as in a UI one.
 */
const ALWAYS_ON_DOMAINS = ["agent", "memory"];

/**
 * Task words -> rule domains. Data, not logic: a domain earns an entry by being the thing
 * somebody would actually have needed, and the table is the whole routing model for prose.
 */
const KEYWORDS = {
  api: ["endpoint", "endpoints", "route", "routes", "rest", "api", "http", "request", "response",
    "webhook", "handler", "controller", "graphql", "rpc", "payload", "post", "patch", "put",
    "delete", "idempotency", "pagination", "versioning"],
  database: ["migration", "migrations", "schema", "table", "tables", "column", "columns", "index",
    "query", "sql", "orm", "prisma", "postgres", "mysql", "database", "transaction", "rollback",
    "seed", "constraint", "foreign"],
  security: ["auth", "authentication", "authorization", "authorize", "login", "logout", "session",
    "token", "jwt", "permission", "permissions", "role", "roles", "tenant", "tenancy", "secret",
    "credential", "password", "csrf", "xss", "injection", "encrypt", "hash", "rate"],
  privacy: ["personal", "pii", "gdpr", "retention", "consent", "anonymise", "anonymize", "erasure",
    "export", "subject"],
  testing: ["test", "tests", "spec", "coverage", "fixture", "mock", "stub", "regression", "e2e",
    "unit", "integration"],
  devops: ["deploy", "deployment", "ci", "pipeline", "docker", "container", "release", "revert",
    "environment", "staging", "production", "lockfile", "build"],
  observability: ["log", "logs", "logging", "metric", "metrics", "alert", "alerting", "trace",
    "tracing", "monitor", "monitoring", "incident", "dashboard"],
  architecture: ["architecture", "boundary", "boundaries", "layer", "module", "modules", "coupling",
    "dependency", "dependencies", "refactor", "structure", "package"],
  ai: ["llm", "prompt", "prompts", "embedding", "completion", "agent", "model", "inference",
    "tool-call", "rag"],
  ui: ["button", "buttons", "layout", "spacing", "colour", "color", "typography", "icon", "icons",
    "screen", "page", "grid", "css", "style", "styling", "theme", "visual"],
  ux: ["form", "forms", "navigation", "nav", "flow", "onboarding", "wizard", "copy", "microcopy",
    "usability", "journey", "search", "filter"],
  accessibility: ["a11y", "accessible", "accessibility", "aria", "keyboard", "focus", "reader",
    "contrast", "wcag", "screenreader", "tab", "label"],
  states: ["loading", "empty", "skeleton", "offline", "optimistic", "retry", "stale", "timeout",
    "disabled", "error"],
  // "table" is deliberately absent: it belongs to `database` far more often than to a UI
  // component, and routing it here sent "add a column to the orders table" through
  // components -> accessibility and pulled the whole screen-rule corpus into a schema change.
  // A real table component says component, screen, or lives in a .tsx file.
  components: ["component", "components", "dialog", "modal", "tooltip", "dropdown",
    "menu", "tabs", "datatable"],
  "design-system": ["token", "tokens", "variant", "variants", "primitive", "design"],
  "data-display": ["currency", "date", "dates", "time", "number", "numbers", "percentage",
    "locale", "format", "sorting", "pagination"],
  localization: ["i18n", "l10n", "translation", "translate", "locale", "rtl", "pluralization"],
  responsive: ["responsive", "mobile", "tablet", "desktop", "breakpoint", "viewport"],
  interaction: ["touch", "mouse", "pointer", "gesture", "hover", "drag"],
  motion: ["animation", "animate", "transition", "motion"],
  content: ["wording", "message", "messages", "tone", "microcopy"],
};

/** Changed paths -> rule domains. A file's location says more than a sentence about it. */
const PATH_DOMAINS = [
  [/(^|\/)(migrations?|migrate|alembic|prisma)(\/|$)/i, ["database"]],
  [/\.sql$/i, ["database"]],
  [/(^|\/)(models?|entities|schema)(\/|$)/i, ["database", "architecture"]],
  [/(^|\/)(api|routes?|controllers?|handlers?|endpoints?|resolvers?)(\/|$)/i, ["api"]],
  [/(^|\/)(auth|security|permissions?|policies|policy|rbac)(\/|$)/i, ["security"]],
  [/(^|\/)(middleware|guards?)(\/|$)/i, ["security", "api"]],
  [/\.(tsx|jsx|vue|svelte)$/i, ["ui", "ux", "accessibility", "states", "components"]],
  [/\.(css|scss|sass|less)$/i, ["ui", "design-system", "responsive"]],
  [/(^|\/)(components?|ui|design-system)(\/|$)/i, ["ui", "components", "design-system"]],
  [/(^|\/)(pages?|views?|screens?|app)(\/|$)/i, ["ui", "ux", "states"]],
  [/(^|\/)(locales?|i18n|translations?)(\/|$)/i, ["localization"]],
  [/(^|\/)(tests?|spec|specs|__tests__|e2e)(\/|$)/i, ["testing"]],
  [/\.(test|spec)\.[a-z]+$/i, ["testing"]],
  [/(^|\/)\.github\/workflows(\/|$)/i, ["devops", "testing"]],
  [/(^|\/)(Dockerfile|docker-compose|\.dockerignore)/i, ["devops"]],
  [/(^|\/)(terraform|infra|deploy|k8s|helm)(\/|$)/i, ["devops"]],
  [/(^|\/)(telemetry|logging|metrics|observability)(\/|$)/i, ["observability"]],
];

/**
 * Domains that drag other domains in with them.
 *
 * An endpoint is an authorization surface and an input boundary whether or not the task says the
 * word "authorization" — and the benchmark proved it: "add POST /api/orders" routed to `api`
 * alone and dropped `SEC-001` and `SEC-003`, the two rules a write endpoint most needs, at every
 * budget. Routing on the words a task happens to use is not routing on what the task *is*.
 */
const IMPLIES = {
  api: ["security"],
  database: ["privacy"],
  ui: ["accessibility", "states"],
  ux: ["accessibility", "content"],
  components: ["accessibility"],
  ai: ["security"],
};

/** Memory file -> the domains it speaks for. `14_INDEX.md` is a map, never context in itself. */
const MEMORY_DOMAINS = {
  "00_OVERVIEW.md": ["architecture"],
  "01_ARCHITECTURE.md": ["architecture", "api", "database"],
  "02_SURFACES.md": ["api", "ui", "ux", "devops"],
  "03_DATA_MODEL.md": ["database", "privacy"],
  "04_PERMISSIONS.md": ["security", "privacy"],
  "05_FLOWS.md": ["ux", "testing", "api"],
  "06_INTEGRATIONS.md": ["api", "devops", "ai", "security"],
  "07_DESIGN.md": ["ui", "ux", "design-system", "components", "accessibility", "motion",
    "responsive", "states", "data-display", "localization", "interaction", "content"],
  "13_RECIPES.md": ["devops", "testing", "architecture"],
};

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "for", "to", "of", "in", "on", "at", "by", "with",
  "from", "into", "as", "is", "are", "be", "was", "were", "it", "its", "this", "that", "these",
  "those", "we", "i", "you", "they", "our", "their", "add", "new", "make", "should", "must",
  "can", "will", "would", "when", "then", "so", "not", "no", "do", "does", "up", "out", "if",
]);

/** Significant words of a task description, lowercased and de-duplicated. */
export function terms(text) {
  const out = new Set();
  const keep = (w) => {
    if (w.length < 3 || STOPWORDS.has(w)) return;
    out.add(w);
    // `orders` and `order` must meet: the task says one and the memory says the other.
    if (w.length > 4 && w.endsWith("s")) out.add(w.slice(0, -1));
  };

  for (const w of String(text ?? "").toLowerCase().match(/[a-z][a-z0-9_-]{1,}/g) || []) {
    keep(w);
    // A joined identifier carries its parts. Without this `new_endpoint` is one opaque word:
    // it matches neither the `endpoint` keyword nor the `new_endpoint` change type, whose own
    // key splits the same way.
    if (/[_-]/.test(w)) {
      for (const part of w.split(/[_-]+/)) keep(part);
    }
  }
  return out;
}

/** Domains a task text and a set of changed paths point at, with the evidence for each. */
export function routeDomains(task, files = []) {
  const found = new Map();
  const note = (domain, why) => {
    if (!found.has(domain)) found.set(domain, new Set());
    found.get(domain).add(why);
  };

  const words = terms(task);
  for (const [domain, keys] of Object.entries(KEYWORDS)) {
    for (const k of keys) {
      if (words.has(k)) note(domain, `task mentions "${k}"`);
    }
  }
  for (const f of files) {
    const rel = String(f).split(path.sep).join("/");
    for (const [re, domains] of PATH_DOMAINS) {
      if (!re.test(rel)) continue;
      for (const d of domains) note(d, `changed path ${rel}`);
    }
  }

  applyImplications(found);
  return found;
}

/**
 * One pass, not a closure: `api` pulls in `security`, and that is the end of it. A transitive
 * walk would quietly route half the registry from one keyword.
 */
function applyImplications(found) {
  for (const domain of [...found.keys()]) {
    for (const implied of IMPLIES[domain] || []) {
      if (!found.has(implied)) found.set(implied, new Set());
      found.get(implied).add(`implied by ${domain}`);
    }
  }
  return found;
}

/** Split a memory file into sections at `##`, keeping the preamble as its own section. */
function sections(file, text) {
  const out = [];
  const lines = String(text).split(/\r?\n/);
  let title = "intro";
  let buf = [];
  const flush = () => {
    const body = buf.join("\n").trim();
    if (body) out.push({ file, title, text: body });
    buf = [];
  };
  for (const l of lines) {
    const h = l.match(/^##\s+(.*)$/);
    if (h) {
      flush();
      title = h[1].trim();
    }
    buf.push(l);
  }
  flush();
  return out;
}

/** Open rows of a registry table: the ones above the closed section. */
function openRows(text, prefix) {
  const out = [];
  for (const l of String(text ?? "").split(/\r?\n/)) {
    if (/^##\s+(Closed|Discharged)/i.test(l)) break;
    const m = l.match(new RegExp(`^\\|\\s*(${prefix}\\d+)\\s*\\|`));
    if (!m || /TODO\(devia\)/.test(l)) continue;
    out.push({ id: m[1], text: l.trim() });
  }
  return out;
}

/** The `- **Never ...**` / `- Always ...` bullets, one item each (`MEM-010`). */
function neverAlways(text) {
  const out = [];
  let section = null;
  for (const l of String(text ?? "").split(/\r?\n/)) {
    const h = l.match(/^##\s+(Never|Always)\b/i);
    if (h) {
      section = h[1].toLowerCase();
      continue;
    }
    if (/^##\s/.test(l)) section = null;
    if (!section) continue;
    const b = l.match(/^\s*[-*]\s+(.*)$/);
    if (b && b[1].trim()) out.push({ kind: section, text: b[1].trim() });
    else if (out.length && /^\s{2,}\S/.test(l)) out[out.length - 1].text += " " + l.trim();
  }
  return out;
}

/**
 * A rule devia verifies itself does not need its requirement recited into the window: the agent
 * needs the citation and the fact that a gate will stop it. A rule only a human can check needs
 * its full text, because nothing else is going to state it (`AGT-013`).
 *
 * The exception matters more than the rule. A P0 rule whose only gate *warns* is not actually
 * being stopped by anything, so compacting it would trade the agent's copy of a blocking
 * obligation for a gate that will let the change through. Those keep their full text.
 */
export function renderRule(rule, gates) {
  const head = `${rule.id} · ${rule.severity} · ${rule.priority} — ${rule.title}`;
  const blocking = (gates || []).some((g) => g.priority === "P0");
  const covered = gates?.length && (blocking || rule.priority !== "P0");
  if (covered) {
    const ids = gates.map((g) => `${g.id} (${g.priority})`).join(", ");
    return `- ${head}\n  checked by \`devia check\` → ${ids} → ${
      blocking ? "blocks the change" : "reported, not blocking"
    }`;
  }
  return `- ${head}\n  ${String(rule.requirement).trim()}`;
}

/** Where the rules come from: a pinned copy when the project has one, the package otherwise. */
export function rulesDir(deviaDir) {
  const vendored = path.join(deviaDir, "standard", "rules");
  return exists(vendored) ? vendored : path.join(packageRoot, "rules");
}

/**
 * Everything devia could say about this project, as addressable items. Built once; the router
 * scores it and the budget cuts it. Nothing is filtered here, so the raw total is honest.
 */
export function buildCorpus({ root, deviaDir }) {
  const items = [];
  const byRule = gatesByRule();

  const { rules } = loadRules(rulesDir(deviaDir));
  for (const rule of rules) {
    if (rule.status !== "active") continue;
    const gates = byRule.get(rule.id);
    const head = `${rule.id} · ${rule.severity} · ${rule.priority} — ${rule.title}`;
    const text = renderRule(rule, gates);
    const full = `- ${head}\n  ${String(rule.requirement).trim()}`;
    const gated = gates?.length
      ? gates.some((g) => g.priority === "P0")
        ? " · gated, blocks"
        : " · gated"
      : "";
    items.push({
      kind: "rule",
      id: rule.id,
      domains: [rule.domain],
      priority: rule.priority,
      // Cited rather than recited, because a devia gate verifies it (`AGT-013`).
      compacted: text !== full,
      text,
      full,
      // The two smaller forms a strict target can fall back to, rather than dropping the rule.
      short: `- ${head}${gated}`,
      ref: rule.id,
    });
  }

  const memoryFiles = exists(deviaDir)
    ? walk(deviaDir, { filter: (f) => f.endsWith(".md") && !f.includes(path.sep) })
    : [];

  for (const file of memoryFiles) {
    if (file === "14_INDEX.md" || file === "README.md") continue;
    const text = read(path.join(deviaDir, file)) || "";

    if (file === "10_NEVER_ALWAYS.md") {
      for (const [i, line] of neverAlways(text).entries()) {
        items.push({
          kind: line.kind,
          id: `${file}#${line.kind}-${i + 1}`,
          domains: [],
          text: `- ${line.text}`,
        });
      }
      continue;
    }
    if (file === "11_GAPS.md" || file === "12_DEBT.md") {
      const prefix = file.startsWith("11") ? "G" : "D";
      for (const row of openRows(text, prefix)) {
        items.push({
          kind: prefix === "G" ? "gap" : "debt",
          id: row.id,
          domains: [],
          text: row.text,
        });
      }
      continue;
    }

    for (const s of sections(file, text)) {
      items.push({
        kind: "memory",
        id: `${file}#${s.title}`,
        domains: MEMORY_DOMAINS[file] || [],
        text: s.text,
      });
    }
  }

  const mapText = read(path.join(deviaDir, "impact-map.yaml"));
  const impacts = mapText ? parseYaml(mapText).impacts || {} : {};
  for (const [change, targets] of Object.entries(impacts)) {
    const list = [].concat(targets || []).map(String);
    if (!list.length) continue;
    items.push({
      kind: "impact",
      id: change,
      domains: [],
      // Kept as data, not only as prose: this is what lets the impact map route (`AGT-013`).
      targets: list,
      text: `- ${change} → update ${list.join(", ")} in the same change (MEM-009)`,
    });
  }

  for (const item of items) {
    item.tokens = estimateTokens(item.text);
    item.rawTokens = estimateTokens(item.full || item.text);
    item.shortTokens = item.short ? estimateTokens(item.short) : item.tokens;
    // Two for the separator the reference list joins them with.
    item.refTokens = item.ref ? estimateTokens(item.ref) + 2 : item.shortTokens;
  }
  return items;
}

/** How many distinct task terms appear in a text. The cheap half of relevance. */
function textScore(text, words) {
  if (!words.size) return 0;
  const lower = String(text).toLowerCase();
  let n = 0;
  for (const w of words) {
    if (lower.includes(w)) n++;
  }
  return n;
}

/** Memory file -> the domains it speaks for, inverted once. */
function domainsOfFile(file) {
  return MEMORY_DOMAINS[file] || [];
}

/**
 * Which change types in the impact map this task is.
 *
 * The impact map is the one routing table the *project* wrote. `new_endpoint → 02_SURFACES.md`
 * is a declaration that this project already made, in this project's own vocabulary, and it is
 * worth more than devia guessing from a keyword list — a project that invented
 * `new_consent_record` routes on it exactly as well as a built-in one does.
 *
 * A key is matched on its significant parts rather than as a whole: half of them present is
 * enough to consider it, which catches "add an endpoint" for `new_endpoint` without letting a
 * single shared word pull in `state_machine_change` for "fix the empty state".
 */
export function matchedChangeTypes(items, words, forced = []) {
  const wanted = new Set(forced.map((t) => String(t)));
  const out = new Map();

  for (const item of items) {
    if (item.kind !== "impact") continue;
    const id = String(item.id);

    if (wanted.has(id)) {
      out.set(id, { score: 1, why: "--type" });
      continue;
    }
    const parts = [...new Set(id.split(/[_\-.]/).map((p) => p.toLowerCase()))].filter(
      (p) => p.length >= 3 && !STOPWORDS.has(p)
    );
    if (!parts.length) continue;
    const hit = parts.filter((p) => words.has(p));
    if (!hit.length) continue;
    const score = hit.length / parts.length;
    if (score < 0.5) continue;
    out.set(id, { score, why: `task mentions ${hit.map((h) => `"${h}"`).join(", ")}` });
  }
  return out;
}

/**
 * Domains a matched change type implies, taken from the memory files it declares.
 *
 * This is the part that makes the impact map a router rather than a checklist: the project said
 * a permission change touches `04_PERMISSIONS.md`, and `04_PERMISSIONS.md` speaks for security
 * and privacy, so a permission change routes to security and privacy — without anyone adding a
 * keyword for this project's word for it.
 */
function changeTypeDomains(items, matched) {
  const out = new Map();
  for (const item of items) {
    if (item.kind !== "impact" || !matched.has(item.id)) continue;
    for (const file of item.targets || []) {
      for (const domain of domainsOfFile(file)) {
        if (!out.has(domain)) out.set(domain, new Set());
        out.get(domain).add(`${item.id} updates ${file}`);
      }
    }
  }
  return out;
}

/**
 * Score, tier and reason every item. Selection happens afterwards: this pass decides what the
 * context *is*, the budget decides how much of it fits.
 */
export function classify(
  items,
  { task = "", files = [], domains: forced = [], changeTypes: forcedTypes = [] } = {}
) {
  const words = terms(task);
  const routed = routeDomains(task, files);
  for (const d of forced) {
    if (!routed.has(d)) routed.set(d, new Set(["--domain"]));
  }

  // The project's own declaration routes before devia's keyword table gets an opinion.
  const changeTypes = matchedChangeTypes(items, words, forcedTypes);
  for (const [domain, why] of changeTypeDomains(items, changeTypes)) {
    if (!routed.has(domain)) routed.set(domain, new Set());
    for (const w of why) routed.get(domain).add(w);
  }
  // The change types routed after `routeDomains` ran, so their implications are applied here:
  // a `new_endpoint` is still an authorization surface.
  applyImplications(routed);

  // The memory files those change types name are the MEM-009 duty's subject.
  const duty = new Set();
  for (const item of items) {
    if (item.kind === "impact" && changeTypes.has(item.id)) {
      for (const f of item.targets || []) duty.add(f);
    }
  }

  const active = new Set([...routed.keys(), ...ALWAYS_ON_DOMAINS]);

  for (const item of items) {
    const why = [];
    let tier = "T5";
    let relevance = 0;

    const inDomain = item.domains.some((d) => active.has(d));
    const routedDomain = item.domains.filter((d) => routed.has(d));
    for (const d of routedDomain) {
      for (const reason of routed.get(d)) why.push(`${d}: ${reason}`);
    }

    if (item.kind === "rule") {
      if (inDomain) {
        relevance = routedDomain.length ? 3 + routedDomain.length : 1;
        if (item.priority === "P0") tier = "T0";
        else if (item.priority === "P1") tier = "T1";
        else tier = "T4";
        if (!routedDomain.length) {
          why.push(`${item.domains[0]}: applies to every task`);
          relevance = item.priority === "P0" ? 2 : 1;
        }
      } else {
        why.push(`domain ${item.domains[0]} is not in scope`);
      }
    } else if (item.kind === "never" || item.kind === "always") {
      // The project's own earned constraints. Short by construction (`MEM-010`), and the single
      // highest-value thing devia knows that the standard does not: never budget-evicted.
      tier = "T0";
      relevance = 5 + textScore(item.text, words);
      why.push("10_NEVER_ALWAYS.md: this project's own constraint");
    } else if (item.kind === "impact") {
      const match = changeTypes.get(item.id);
      if (match) {
        tier = "T0";
        relevance = 6;
        why.push(`task is a ${item.id} — ${match.why} (MEM-009 duty)`);
      } else {
        why.push("this task is not that change type");
      }
    } else if (item.kind === "memory") {
      const file = String(item.id).split("#")[0];
      const owed = duty.has(file);
      const hits = textScore(item.text, words);
      if (owed || inDomain || hits >= 2) {
        tier = "T2";
        relevance = routedDomain.length + hits + (owed ? 4 : 0);
        // A file the impact map says this change must update is not a guess about relevance.
        if (owed) why.push(`the impact map says this change updates ${file}`);
        if (hits) why.push(`memory section matches ${hits} task term(s)`);
        if (!why.length) why.push("memory for a surface this task touches");
      } else {
        why.push("no term or surface in common with the task");
      }
    } else if (item.kind === "gap" || item.kind === "debt") {
      const hits = textScore(item.text, words);
      if (hits) {
        tier = "T3";
        relevance = hits;
        why.push(`open ${item.kind} line matching ${hits} task term(s)`);
      } else {
        why.push(`open ${item.kind} line unrelated to this task`);
      }
    }

    item.tier = tier;
    item.relevance = relevance;
    item.why = why;
    // Did anything about *this* task point at this item, or would it have been delivered for
    // any task at all? The contract and the project's own constraints are deliberately in the
    // second group; measuring the split is how the selection's noise stops being a guess.
    item.taskLinked = Boolean(
      routedDomain.length ||
        (item.kind === "impact" && changeTypes.has(item.id)) ||
        (item.kind === "memory" && (duty.has(String(item.id).split("#")[0]) || textScore(item.text, words) > 0)) ||
        ((item.kind === "gap" || item.kind === "debt") && tier === "T3")
    );
  }

  return { items, domains: routed, changeTypes: [...changeTypes.keys()], duty: [...duty] };
}

const ORDER = ["T0", "T1", "T2", "T3", "T4"];

export const MODES = ["advisory", "strict"];

/** One line standing in for every never/always bullet, when even those cannot be afforded. */
const POINTER = (n) =>
  `- ${n} never/always line(s) this project earned are not included: read ` +
  "`.devia/10_NEVER_ALWAYS.md` before changing anything.";

/**
 * The smallest form a mandatory item may take, and the note explaining it when it does.
 *
 * A rule's requirement is generic text any agent can fetch again with `devia rules --id`, so a
 * rule can shrink to its identifier. A never/always line is this project's own earned trap and
 * exists nowhere else, so the most it can shrink to is a pointer telling the agent to go read
 * them. An impact-map duty is already one line. Nothing here ever drops an item without leaving
 * its name behind: the floor compresses, it does not disappear.
 */
const SMALLEST = {
  rule: "ref",
  never: "pointer",
  always: "pointer",
};

const DEGRADATION_NOTE = {
  short: "carry their identifier and title instead of their requirement",
  ref: "are listed as identifiers only (`devia rules --id <ID>`)",
  pointer: "are replaced by a pointer to the file",
};

/** Best form first: an item is restored as far up this list as the target allows. */
const LADDER = ["full", "short", "ref", "pointer"];

function costOf(item, level) {
  if (level === "short") return item.shortTokens;
  if (level === "ref") return item.refTokens;
  if (level === "pointer") return 0;
  return item.tokens;
}

function smallestLevel(item) {
  return SMALLEST[item.kind] || "full";
}

function floorCost(blocking, levels) {
  let n = 0;
  let pointers = 0;
  for (const item of blocking) {
    const level = levels.get(item.id) || "full";
    if (level === "pointer") pointers++;
    n += costOf(item, level);
  }
  return n + (pointers ? estimateTokens(POINTER(pointers)) : 0);
}

/**
 * Fit the classified items to the target.
 *
 * Three numbers, deliberately separate, because collapsing them is what made "budget 600,
 * selected 1380" look like a broken promise instead of a stated one:
 *
 *   target   what was asked for
 *   floor    what the mandatory items cost — not negotiable, only compressible
 *   spent    what was actually selected
 *
 * `advisory` (the default) never lets the target evict a mandatory item: when the floor is above
 * the target it reports `over` and includes them anyway. `strict` never exceeds the target, and
 * compresses the floor only as far as it has to — every mandatory item starts at its smallest
 * form and is restored toward full text while the target allows, in relevance order. The first
 * version of this degraded all of them at once and then spent the freed tokens admitting
 * *optional* rules at full text, which is precisely backwards.
 *
 * When even the smallest floor is too large, `strict` says `impossible` rather than going over.
 */
export function select(items, { target = DEFAULT_BUDGET, mode = "advisory" } = {}) {
  const strict = mode === "strict";
  const included = [];
  const excluded = [];

  const blocking = items.filter((i) => i.tier === "T0");
  blocking.sort((a, b) => b.relevance - a.relevance || a.tokens - b.tokens);

  const levels = new Map();
  const fullFloor = floorCost(blocking, levels);

  if (strict && fullFloor > target) {
    // Start at the floor of the floor, then buy back as much text as the target affords. The
    // most relevant mandatory item is restored first, because that is the one being read.
    for (const item of blocking) levels.set(item.id, smallestLevel(item));
    for (const item of blocking) {
      const smallest = smallestLevel(item);
      for (const level of LADDER) {
        if (level === smallest) break;
        levels.set(item.id, level);
        if (floorCost(blocking, levels) <= target) break;
        levels.set(item.id, smallest);
      }
    }
  }

  const floor = floorCost(blocking, levels);
  let spent = floor;

  const applied = [];
  for (const level of ["short", "ref", "pointer"]) {
    const n = blocking.filter((i) => (levels.get(i.id) || "full") === level).length;
    if (n) applied.push({ id: level, note: `mandatory items ${DEGRADATION_NOTE[level]}`, items: n });
  }

  for (const item of blocking) {
    included.push({ ...item, level: levels.get(item.id) || "full" });
  }

  const impossible = strict && floor > target;

  if (!impossible) {
    for (const tier of ORDER.slice(1)) {
      const group = items.filter((i) => i.tier === tier);
      group.sort((a, b) => b.relevance - a.relevance || a.tokens - b.tokens);
      for (const item of group) {
        if (spent + item.tokens <= target) {
          included.push({ ...item, level: "full" });
          spent += item.tokens;
        } else {
          excluded.push({ ...item, reason: "budget" });
        }
      }
    }
  } else {
    for (const item of items) {
      if (item.tier !== "T0" && item.tier !== "T5") excluded.push({ ...item, reason: "budget" });
    }
  }

  for (const item of items.filter((i) => i.tier === "T5")) {
    excluded.push({ ...item, reason: "not relevant" });
  }

  const status = impossible
    ? "impossible"
    : applied.length
      ? "degraded"
      : spent > target
        ? "over"
        : "within";

  return {
    included,
    excluded,
    mode,
    target,
    floor,
    fullFloor,
    spent,
    status,
    degraded: applied.map(({ id, note, items: n }) => ({ id, note, items: n })),
    // `over` is only reachable in advisory mode, and only because a mandatory item was kept.
    overrun: status === "over",
    compliant: spent <= target,
    mandatory: blocking.length,
    raw: items.reduce((n, i) => n + i.rawTokens, 0),
  };
}

const TIER_HEADINGS = {
  T0: "Blocking — these stop the change",
  T1: "Policy for this task",
  T2: "This project",
  T3: "Known failures here",
  T4: "Supporting",
};

/** The selection, as the text an agent receives. */
export function render(selection, { task = "" } = {}) {
  const out = [];
  out.push("# devia context");
  if (task) out.push(`\nTask: ${task}`);

  for (const tier of ORDER) {
    const group = selection.included.filter((i) => i.tier === tier);
    if (!group.length) continue;
    out.push(`\n## ${TIER_HEADINGS[tier]}\n`);

    const refs = group.filter((i) => i.level === "ref");
    const pointers = group.filter((i) => i.level === "pointer");
    for (const item of group) {
      if (item.level === "ref" || item.level === "pointer") continue;
      out.push(item.level === "short" ? item.short : item.text);
    }
    if (refs.length) {
      out.push(
        `\nThese apply and their text did not fit the target — read them before you rely on ` +
          "memory (`devia rules --id <ID>`):\n" +
          refs.map((i) => i.ref).join(" · ")
      );
    }
    if (pointers.length) out.push("\n" + POINTER(pointers.length));
  }

  const line =
    `\n---\nEstimated ${selection.spent} tokens · target ${selection.target} · ` +
    `mandatory floor ${selection.floor} · ${selection.status} · ` +
    `${selection.excluded.length} items withheld · \`devia context --explain\` says why.`;
  out.push(line);
  return out.join("\n") + "\n";
}

/**
 * The target and the mode for this run: the flag wins, then the config, then the default.
 *
 * `context.budget` is the name; `context.maxTokens` is still read so a project that adopted the
 * first shipped spelling keeps working without editing anything.
 */
export function budgetFor(deviaDir, flags = {}) {
  const config = readJSON(path.join(deviaDir, "devia.json"))?.context || {};

  const number = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  };

  const target =
    number(flags.budget === true ? null : flags.budget) ??
    number(config.budget) ??
    number(config.maxTokens) ??
    DEFAULT_BUDGET;

  const asked = flags.strict ? "strict" : flags.mode ? String(flags.mode) : config.mode;
  const mode = MODES.includes(asked) ? asked : "advisory";

  return { target, mode };
}
