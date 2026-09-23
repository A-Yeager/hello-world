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

Everything works from `file://`, including **Load example…**. Serving the folder
(`npx serve apps/ontology-builder`) works too if you prefer a URL.

## What it does

- **Eight guided steps** — Start → Context → Glossary → Objects → Links → Actions →
  Roles & systems → Review & export. Each step explains what belongs there and what does not.
- **Sub-domains** (Start step) split the domain in scope into areas with their own SMEs —
  e.g. PERM, MEQC and BEA within CMS's Center for Program Integrity. Each gets a short code,
  a description, a business owner and its SMEs.
- **Objects** are tagged with one or more sub-domains, and get a description prompt, an at-a-glance block, an extensible property table,
  a separate custom-property table for anything that doesn't fit the columns, lifecycle states,
  business rules, open questions, and a YAML example instance.
- **Links** pick their source and target from the objects you've already defined, so the model
  stays internally consistent; a Mermaid ER diagram is generated from them. A link's sub-domain
  is derived from its two objects — a link between objects that share no sub-domain is a
  **boundary link** (marked `↔`), an integration point to agree with both sets of SMEs.
- **Actions** capture actor, trigger, pre/post-conditions, failure paths and draft
  Given/When/Then criteria — the raw material for test specs.
- **Sub-domain view** — the filter bar under the header narrows the Objects, Links and Actions
  steps, the preview and an optional export to the sub-domains you pick, and shows who the
  reviewing SMEs are. Use it to walk each group of SMEs through just their part of the model.
  See [Reviewing by sub-domain](#reviewing-by-sub-domain).
- **Live readiness checklist** on the right — the same checks the CLI enforces, always run
  against the whole document.
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

## Reviewing by sub-domain

Pick one or more chips in the filter bar (**All** clears it). The choice is remembered per
browser and never changes the document itself.

| In the view | Rule |
|---|---|
| Objects | Tagged with any selected sub-domain. **Untagged** lists objects still needing a tag. |
| Links | Inside a selected sub-domain, or a boundary link with a selected sub-domain on either side. A shared object doesn't pull in other areas' links. |
| Actions | Their primary object is in the view. |
| Events | Raised by an action in the view. |
| Roles, systems, traces, open questions | Those that mention something in the view, or nothing specific. |
| Context, glossary | Always shown in full. |

Objects you add while a view is active are tagged with its sub-domains automatically.

**Download … view** on the Review step (or `cli.js build --subdomain`) writes a filtered
Markdown file headed *Filtered view* with the reviewing SMEs listed. It is a reading aid, not a
version of the document: importing one back asks for confirmation, because it would replace
your document with only what was in the view. The header's **Download .md** always writes the
full document.

## CLI

For pipelines and agents that need the Markdown without a browser:

```bash
node apps/ontology-builder/cli.js build   ontology.json -o docs/cpi-business-model.md
node apps/ontology-builder/cli.js build   docs/cpi-business-model.md --subdomain PERM -o perm-review.md
node apps/ontology-builder/cli.js check   docs/cpi-business-model.md   # exits 1 on failures
node apps/ontology-builder/cli.js extract docs/cpi-business-model.md -o ontology.json
node apps/ontology-builder/cli.js subdomains docs/cpi-business-model.md   # codes, SMEs, sizes
```

Every command accepts the `.json` model, a generated `.md`, or a bundled example
(`example:cms-cpi`, `example:northwind`). `--subdomain` takes comma-separated codes, plus
`untagged`.
`check` is CI-friendly: wire it into a pipeline to stop an ontology reaching spec-writing
with objects that have no owner, links pointing at undefined objects, or unassigned questions.

## Files

| File | Purpose |
|---|---|
| `index.html` | The guided app — UI only, no dependencies |
| `ontology-md.js` | Shared model, Markdown renderer and validator (browser + Node) |
| `cli.js` | `build` / `check` / `extract` / `subdomains` for pipelines |
| `examples.js` | Worked examples: CMS / CPI with PERM, MEQC and BEA sub-domains (illustrative, not an official CMS model), and a distributor's order-to-cash |

`index.html` and `cli.js` both render through `ontology-md.js`, so the app and the pipeline can
never drift apart.

## For downstream agents

When consuming a generated document:

1. Parse the `json ontology` block in Appendix A — it is canonical; the prose above it is a view.
2. Use the IDs (`OBJ-nn`, `LNK-nn`, `ACT-nn`, `RULE-nn`, `EVT-nn`) as stable references in
   specs, tickets, tests and code comments, and record them in Part 8.2 as you go.
3. To scope work to one area, filter on `subdomains` in Appendix A (object tags are sub-domain
   ids — resolve them via the top-level `subdomains` list) or generate a view with
   `cli.js build --subdomain CODE`. Never treat a file headed *Filtered view* as the full model.
4. Treat each Action's pre-conditions, post-conditions, rules and failure paths as the
   test matrix for that operation; treat object `rules` as invariants to assert.
5. If a term you need is not in the glossary or object list, that is a gap to raise — not a
   detail to invent.
