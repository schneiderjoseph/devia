/**
 * The readiness gates, as data.
 *
 * Priority, the rule each gate enforces and its title live here rather than inside the closure
 * that runs them, because two readers need them and only one of them has a repository to scan.
 * `devia check` attaches the behaviour; `devia context` asks "is this rule machine-enforced, and
 * does it block?" so it can cite a compact reference instead of spending the rule's full text on
 * the agent (`AGT-013`).
 *
 * One table, two readers: that is what stops the two answers from drifting apart.
 */
export const GATES = [
  { id: "MEM-PRESENT", priority: "P0", rule: "AGT-002", title: "Project memory exists" },
  { id: "MEM-FILLED", priority: "P1", rule: "MEM-009", title: "Overview is filled in" },
  { id: "MEM-DEBT-P0", priority: "P0", rule: "MEM-002", title: "No P0 debt recorded as unbuilt" },
  { id: "MEM-WAIVERS", priority: "P1", rule: "GOVERNANCE", title: "No expired waiver" },
  { id: "CI-PRESENT", priority: "P0", rule: "OPS-001", title: "CI runs on pull requests" },
  { id: "CI-GATES", priority: "P1", rule: "OPS-001", title: "CI runs tests and static checks" },
  { id: "SEC-ENV", priority: "P0", rule: "SEC-002", title: "No environment file committed" },
  { id: "SEC-SECRETS", priority: "P0", rule: "SEC-002", title: "No secret-shaped strings in the tree" },
  { id: "OPS-BYPASS", priority: "P0", rule: "OPS-003", title: "No check bypass wired into the repository" },
  { id: "TST-PRESENT", priority: "P0", rule: "TST-001", title: "Automated tests exist" },
  { id: "TST-SKIPPED", priority: "P1", rule: "TST-003", title: "No disabled tests" },
  { id: "TST-SCRIPT", priority: "P1", rule: "TST-001", title: "A test command exists" },
  { id: "OPS-LOCKFILE", priority: "P1", rule: "OPS-004", title: "Dependency lockfile committed" },
  { id: "DB-MIGRATIONS", priority: "P1", rule: "DB-001", title: "Schema changes are versioned migrations" },
  { id: "AGT-CONTRACT", priority: "P1", rule: "AGT-001", title: "Agent contract at the repository root" },
  { id: "CTX-BUDGET", priority: "P2", rule: "AGT-013", title: "Context target holds the mandatory set" },
  { id: "DOC-README", priority: "P2", rule: "—", title: "README present" },
  { id: "UI-A11Y-TOOLING", priority: "P2", rule: "A11Y-001", title: "Accessibility tooling available" },
  { id: "OBS-ERRORS", priority: "P2", rule: "OBS-002", title: "Errors reach something a human watches" },
];

/** Rule id -> the gates that enforce it. Derived, so it cannot disagree with `GATES`. */
export function gatesByRule() {
  const map = new Map();
  for (const g of GATES) {
    if (g.rule === "—") continue;
    if (!map.has(g.rule)) map.set(g.rule, []);
    map.get(g.rule).push(g);
  }
  return map;
}
