# Ontology Builder

A guided, dependency-free app that walks a Product Manager through capturing a customer's
**Business Model / Ontology** — Objects, the Links between them, and the Actions taken on them —
and writes it out as the Markdown template in
[`templates/business-model-ontology-template.md`](../../templates/business-model-ontology-template.md).

The generated Markdown is the grounding artifact for the rest of the AI-Driven Development
lifecycle: requirements, specs, test specs and code all trace back to the IDs it defines.

## Run it

No build, no install, no server:

```bash
open apps/ontology-builder/index.html     # macOS
xdg-open apps/ontology-builder/index.html # Linux
```

Or serve the folder if you want the **Load example** button to work (browsers block `fetch`
on `file://`; you can always import `example-ontology.json` with the Import button instead):

```bash
npx serve apps/ontology-builder
```

## What it does

- **Eight guided steps** — Start → Context → Glossary → Objects → Links → Actions →
  Roles & systems → Review & export. Each step explains what belongs there and what does not.
- **Objects** get a description prompt, an at-a-glance block, an extensible property table,
  a separate custom-property table for anything that doesn't fit the columns, lifecycle states,
  business rules, open questions, and a YAML example instance.
- **Links** pick their source and target from the objects you've already defined, so the model
  stays internally consistent; a Mermaid ER diagram is generated from them.
- **Actions** capture actor, trigger, pre/post-conditions, failure paths and draft
  Given/When/Then criteria — the raw material for test specs.
- **Live readiness checklist** on the right — the same 17 checks the CLI enforces.
- **Autosaves** to `localStorage` as you type; **Save .json** and **Import** move a document
  between machines or people.

## Output

`Download .md` writes `<customer>-business-model.md` following the template's structure, ending
with an **Appendix A** block:

~~~
```json ontology
{ ...canonical model... }
```
~~~

That block makes the file round-trippable and machine-readable: import the `.md` back into the
app to keep editing, or have a downstream agent parse the JSON instead of the prose. Regenerate
the file rather than hand-editing prose and appendix separately.

## CLI

For pipelines and agents that need the Markdown without a browser:

```bash
node apps/ontology-builder/cli.js build   ontology.json -o docs/acme-business-model.md
node apps/ontology-builder/cli.js check   docs/acme-business-model.md   # exits 1 on failures
node apps/ontology-builder/cli.js extract docs/acme-business-model.md -o ontology.json
```

`build`, `check` and `extract` all accept either the `.json` model or a generated `.md`.
`check` is CI-friendly: wire it into a pipeline to stop an ontology reaching spec-writing
with objects that have no owner, links pointing at undefined objects, or unassigned questions.

## Files

| File | Purpose |
|---|---|
| `index.html` | The guided app — UI only, no dependencies |
| `ontology-md.js` | Shared model, Markdown renderer and validator (browser + Node) |
| `cli.js` | `build` / `check` / `extract` for pipelines |
| `example-ontology.json` | Worked example — a distributor's order-to-cash domain |

`index.html` and `cli.js` both render through `ontology-md.js`, so the app and the pipeline can
never drift apart.

## For downstream agents

When consuming a generated document:

1. Parse the `json ontology` block in Appendix A — it is canonical; the prose above it is a view.
2. Use the IDs (`OBJ-nn`, `LNK-nn`, `ACT-nn`, `RULE-nn`, `EVT-nn`) as stable references in
   specs, tickets, tests and code comments, and record them in Part 8.2 as you go.
3. Treat each Action's pre-conditions, post-conditions, rules and failure paths as the
   test matrix for that operation; treat object `rules` as invariants to assert.
4. If a term you need is not in the glossary or object list, that is a gap to raise — not a
   detail to invent.
