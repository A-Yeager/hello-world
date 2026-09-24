# Ontology Builder

A guided, dependency-free app that walks a Product Manager through capturing a customer's
**Business Model / Ontology** — Objects, the Links between them, and the Actions taken on them —
and writes it out as the Markdown template in
[`templates/business-model-ontology-template.md`](../../templates/business-model-ontology-template.md).

The generated Markdown is the grounding artifact for the rest of the AI-Driven Development
lifecycle: requirements, specs, test specs and code all trace back to the IDs it defines.

The app has two modules, switched with the tabs in the header:

| Module | Captures | Writes |
|---|---|---|
| **Business Model** | Sub-domains, Objects, Links, Actions — what the business *is* | `<customer>-business-model.md` ([template](../../templates/business-model-ontology-template.md)) |
| **Service Catalog** | The services the solution must provide, which sub-domains use them, and the specs and work items that deliver them — what we will *build* | `<customer>-service-catalog.md` ([template](../../templates/service-catalog-template.md)) |

The catalog is grounded in the Business Model: services pick their sub-domains, Objects and
Actions from it by ID. Build the Business Model first.

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

## Service Catalog

Open it with the **Service Catalog** tab. Five steps:

1. **Overview** — header and scope. Shows which Business Model the catalog is grounded in.
2. **Services** — one card per service (`SVC-nn`): the sub-domains that use it, category, type,
   status, priority, owners, the Objects and Actions it covers, operations, service levels,
   dependencies on other services, security, acceptance criteria and open questions.
3. **Delivery** — per service, the technical specs and work items (epics, stories, tasks) that
   deliver it, using your tracker's keys.
4. **Coverage** — a sub-domain × service matrix, and every Action in the Business Model with the
   services that implement it. Actions with no service are requirements nobody is building.
5. **Review & export** — open questions, change log, preview and download.

How it stays tied to the Business Model:

- The catalog stores ontology **IDs** (`SD-nn`, `OBJ-nn`, `ACT-nn`) plus a snapshot of the names
  and codes it references, so the catalog file reads and validates on its own.
- While the open Business Model is for the same customer, the snapshot refreshes as you edit it —
  add an Action to the model and it appears on the Coverage step as uncovered.
- If the open Business Model is for a **different** customer, the catalog keeps its saved
  snapshot and shows a warning; **Re-ground in open model** switches it deliberately.
- The **sub-domain filter bar** works here too: pick PERM and the Services, Delivery and Coverage
  steps and the preview narrow to services PERM uses. Services added while filtered are tagged
  with that sub-domain. **Download … view** exports a filtered catalog for an SME review.

**Import** detects which kind of file you picked and opens the matching module. **Reset** only
clears the module you're in. **Load example…** loads a Business Model and its catalog together.

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

Service Catalog commands sit under `catalog`:

```bash
node apps/ontology-builder/cli.js catalog build   catalog.json --ontology docs/cpi-business-model.md -o docs/cpi-service-catalog.md
node apps/ontology-builder/cli.js catalog check   docs/cpi-service-catalog.md --ontology docs/cpi-business-model.md
node apps/ontology-builder/cli.js catalog build   docs/cpi-service-catalog.md --subdomain PERM -o perm-services.md
node apps/ontology-builder/cli.js catalog extract docs/cpi-service-catalog.md -o catalog.json
node apps/ontology-builder/cli.js catalog service docs/cpi-service-catalog.md SVC-05   # one service, references resolved
```

`--ontology` refreshes the catalog's snapshot from the current Business Model before building or
checking, so a reference to an Object or Action that has since been removed fails `check`. It
warns if the two name different customers. `catalog service` prints one service as JSON with its
sub-domains, Objects, Actions and dependencies resolved — a ready-made brief for an agent.

## Files

| File | Purpose |
|---|---|
| `index.html` | The guided app — UI only, no dependencies |
| `ontology-md.js` | Business Model: shared model, Markdown renderer and validator (browser + Node) |
| `service-catalog.js` | Service Catalog: shared model, Markdown renderer, validator and sub-domain filter (browser + Node) |
| `cli.js` | `build` / `check` / `extract` / `subdomains`, and `catalog build` / `check` / `extract` / `service`, for pipelines |
| `examples.js` | Worked examples, each a Business Model plus its Service Catalog: CMS / CPI with PERM, MEQC and BEA sub-domains (illustrative, not an official CMS model), and a distributor's order-to-cash |

`index.html` and `cli.js` both render through `ontology-md.js` and `service-catalog.js`, so the
app and the pipeline can never drift apart.

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

When implementing from a Service Catalog:

1. Parse the `json service-catalog` block in Appendix A, or run `cli.js catalog service <file> SVC-nn`
   for one service with its references resolved. Read the Business Model it names alongside it.
2. Build a service from its **operations** (each is an endpoint, screen action or job), honour its
   **service levels** and **security** notes, and turn its **acceptance criteria** into tests.
   The Actions it references carry the pre/post-conditions and rules to enforce.
3. Build **dependencies** first — the Part 3 graph gives the order.
4. Reference the service's `SVC-nn` ID, and the spec or work-item key you are working on, in
   commits, specs and tests; add new specs and work items to the service's Delivery section so
   the trail stays complete.
5. Services used by several sub-domains are shared contracts — don't change one to suit a single
   sub-domain without raising it.
