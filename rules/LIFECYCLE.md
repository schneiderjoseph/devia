# Rule lifecycle

```text
draft → proposed → active → deprecated → superseded → removed
```

| Status | Meaning |
|---|---|
| `draft` | Authoring; not enforced |
| `proposed` | In review |
| `active` | Enforceable |
| `deprecated` | Still valid briefly; plan migration |
| `superseded` | Replaced by another rule id |
| `removed` | Gone; requires changelog + migration note |

Never delete an active MUST without changelog entry and superseding id when replaced.
