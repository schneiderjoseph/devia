# Reference sources

Devia is built on recognised sources. When detail matters, read the primary document — do not
paraphrase from memory, and do not copy their text into this repository.

| Area | Source | Used for |
|---|---|---|
| Application security | OWASP ASVS 5.0 | Security rule spine, `standard/engineering/security/ASVS_5.0/` |
| Web risk | OWASP Top 10, OWASP Cheat Sheets | Threat framing, control choices |
| Accessibility | WCAG 2.2 (W3C) | `A11Y-*` rules, contrast, focus, target size, reflow |
| Accessible patterns | WAI-ARIA Authoring Practices Guide | Component keyboard behaviour (`CMP-*`) |
| Usability | Nielsen Norman Group heuristics | `UX-*` rules, feedback and status |
| Design systems | Material, Carbon, Primer, Atlassian, US Web Design System, GOV.UK | Component and token conventions |
| Semantics | HTML Living Standard, ARIA in HTML | Native-first guidance (`A11Y-003`) |
| Supply chain | SLSA, OpenSSF Scorecard | Dependency and build controls |
| Operations | Google SRE practice (SLO, error budgets) | Observability and alerting rules |
| Privacy | GDPR principles, data-minimisation practice | `PRIV-*` rules |

Detail lists:

- Engineering: [`standard/engineering/REFERENCES.md`](standard/engineering/REFERENCES.md)
- Design: [`standard/design/REFERENCES.md`](standard/design/REFERENCES.md)

## Rules for citing

- A rule carries at least one `source` entry naming where the obligation comes from.
- Cite the source, link to it, and write the requirement in your own words.
- Where devia is stricter than a source, say so in the rule body rather than implying the
  source demands it.
- Devia interprets these standards; it does not certify against them.
