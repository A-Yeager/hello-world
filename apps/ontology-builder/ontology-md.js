/*
 * ontology-md.js — shared model, Markdown renderer, and validator for the
 * Business Model / Ontology template.
 *
 * Runs unchanged in the browser (plain <script> tag, exposes window.OntologyMD)
 * and in Node (module.exports), so the guided app and the CLI always produce
 * byte-identical Markdown.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OntologyMD = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCHEMA_VERSION = 2;
  var UNTAGGED = 'UNTAGGED'; // filter key for objects with no sub-domain

  /* ---------------------------------------------------------------- model */

  function emptyModel() {
    return {
      schemaVersion: SCHEMA_VERSION,
      meta: {
        customer: '', domain: '', owner: '', smes: '',
        version: 'v0.1', status: 'Draft', lastUpdated: today(), approvedBy: ''
      },
      context: {
        whatBusinessDoes: '',
        scope: [],        // {inScope, outOfScope, reason}
        outcomes: [],     // {id, outcome, current, target, owner}
        sources: []       // {source, type, date, notes}
      },
      subdomains: [],     // {id, code, name, description, smes, owner}
      glossary: [],       // {term, definition, synonyms, notConfuse}
      conventions: '',
      objects: [],        // see emptyObject()
      links: [],          // see emptyLink()
      actions: [],        // see emptyAction()
      events: [],         // {id, name, raisedBy, carries, consumedBy}
      roles: [],          // {role, description, objects, actions, constraints}
      systems: [],        // {system, role, mastered, consumed, integration, notes}
      openQuestions: [],  // {question, owner, due, impact, status}
      traceability: [],   // {ontologyId, requirement, spec, component, tests}
      changeLog: [],      // {version, date, author, change, reapproval}
      signoff: []         // {name, role, org, date, reference}
    };
  }

  function emptyObject(id) {
    return {
      id: id || '', name: '', description: '', type: 'Core', aka: '',
      subdomains: [],       // sub-domain ids (SD-nn) this object belongs to
      owner: '', systemOfRecord: '', identifier: '', volume: '',
      retention: '', sensitivity: 'Internal',
      properties: [],       // {name, description, example, type, required, derived, source, notes}
      customProperties: [], // {name, description, why, appliesWhen}
      states: [],           // {state, meaning, enteredBy, exitsTo}
      rules: [],            // {id, rule, when, consequence}
      questions: [],        // {question, raisedBy, owner, due, status}
      example: ''
    };
  }

  function emptyLink(id) {
    return {
      id: id || '', source: '', verb: '', target: '', cardinality: '1 -> 0..*',
      reverse: '', required: 'Yes', lifecycle: '', why: '', mutable: '', onDelete: '',
      properties: [] // {name, description, example, notes}
    };
  }

  function emptyAction(id) {
    return {
      id: id || '', name: '', object: '', actor: '', trigger: 'Manual',
      pre: '', post: '', frequency: '', criticality: 'Medium',
      description: '', objectsRead: '', objectsModified: '', linksChanged: '',
      reversible: '', sla: '', audit: '', steps: '', rules: '',
      failures: [],    // {condition, handling}
      acceptance: ''   // one Given/When/Then per line
    };
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /** Next free sequential id for a prefix, e.g. nextId('OBJ', objects) -> 'OBJ-03'. */
  function nextId(prefix, list) {
    var max = 0;
    (list || []).forEach(function (item) {
      var m = /(\d+)\s*$/.exec(String(item && item.id || ''));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return prefix + '-' + pad(max + 1);
  }

  var LISTS = ['subdomains', 'glossary', 'objects', 'links', 'actions', 'events', 'roles',
               'systems', 'openQuestions', 'traceability', 'changeLog', 'signoff'];

  /** Fill in anything missing, so files from older versions (or hand-edited JSON) load cleanly. */
  function normalize(model) {
    var src = JSON.parse(JSON.stringify(model || {}));
    var m = Object.assign(emptyModel(), src);
    m.meta = Object.assign(emptyModel().meta, src.meta || {});
    m.context = Object.assign(emptyModel().context, src.context || {});
    ['scope', 'outcomes', 'sources'].forEach(function (k) {
      if (!Array.isArray(m.context[k])) m.context[k] = [];
    });
    LISTS.forEach(function (k) { if (!Array.isArray(m[k])) m[k] = []; });
    m.objects = m.objects.map(function (o) {
      var n = Object.assign(emptyObject(), o);
      ['subdomains', 'properties', 'customProperties', 'states', 'rules', 'questions'].forEach(function (k) {
        if (!Array.isArray(n[k])) n[k] = [];
      });
      return n;
    });
    m.links = m.links.map(function (l) {
      var n = Object.assign(emptyLink(), l);
      if (!Array.isArray(n.properties)) n.properties = [];
      return n;
    });
    m.actions = m.actions.map(function (a) {
      var n = Object.assign(emptyAction(), a);
      if (!Array.isArray(n.failures)) n.failures = [];
      return n;
    });
    m.schemaVersion = SCHEMA_VERSION;
    return m;
  }

  /* ----------------------------------------------------------- sub-domains */

  function subdomainById(m, id) {
    for (var i = 0; i < (m.subdomains || []).length; i++) if (m.subdomains[i].id === id) return m.subdomains[i];
    return null;
  }

  /** Display codes for a list of sub-domain ids; unknown ids show as "?SD-nn". */
  function codesFor(m, ids) {
    return (ids || []).map(function (id) {
      var sd = subdomainById(m, id);
      return sd ? (sd.code || sd.name || sd.id) : '?' + id;
    });
  }

  function objectByName(m, name) {
    var key = String(name || '').toLowerCase();
    for (var i = 0; i < m.objects.length; i++) if (String(m.objects[i].name || '').toLowerCase() === key) return m.objects[i];
    return null;
  }

  function tagsOf(m, objectName) {
    var o = objectByName(m, objectName);
    if (!o && m.view && m.view.otherObjects) {
      var key = String(objectName || '').toLowerCase();
      o = m.view.otherObjects.filter(function (x) { return String(x.name || '').toLowerCase() === key; })[0];
    }
    return o ? (o.subdomains || []) : [];
  }

  /**
   * Sub-domains a link belongs to, derived from its two objects. Links whose objects share a
   * sub-domain sit inside it; links whose objects share none are boundary links.
   */
  function linkScope(m, l) {
    var src = tagsOf(m, l.source), tgt = tagsOf(m, l.target);
    var shared = src.filter(function (id) { return tgt.indexOf(id) !== -1; });
    if (shared.length) return { ids: shared, boundary: false, label: codesFor(m, shared).join(', ') };
    var union = src.concat(tgt.filter(function (id) { return src.indexOf(id) === -1; }));
    if (src.length && tgt.length) {
      return { ids: union, boundary: true, src: src, tgt: tgt,
               label: codesFor(m, src).join('/') + ' ↔ ' + codesFor(m, tgt).join('/') };
    }
    return { ids: union, boundary: false, label: codesFor(m, union).join(', ') };
  }

  function actionScope(m, a) { return tagsOf(m, a.object); }

  /**
   * Whether a link belongs in a view of the given sub-domains. A link inside a sub-domain follows
   * that sub-domain (so a shared object doesn't drag in every area's links); a boundary link shows
   * in the views of both sides; a link to an untagged object follows whichever end is visible.
   */
  function linkMatches(m, l, keys) {
    if (!keys || !keys.length) return true;
    if (tagsOf(m, l.source).length && tagsOf(m, l.target).length) {
      return linkScope(m, l).ids.some(function (id) { return keys.indexOf(id) !== -1; });
    }
    var src = objectByName(m, l.source), tgt = objectByName(m, l.target);
    return !!((src && objectMatches(src, keys)) || (tgt && objectMatches(tgt, keys)));
  }

  function actionMatches(m, a, keys) {
    if (!keys || !keys.length) return true;
    var o = objectByName(m, a.object);
    return !!(o && objectMatches(o, keys));
  }

  /** Events follow the actions that raise them. */
  function eventMatches(m, e, keys) {
    if (!keys || !keys.length) return true;
    var raisedBy = String(e.raisedBy || '');
    return m.actions.some(function (a) {
      return actionMatches(m, a, keys) && [a.id, a.name].some(function (ref) {
        return has(ref) && new RegExp('\\b' + escapeRe(ref) + '\\b').test(raisedBy);
      });
    });
  }

  function objectMatches(o, keys) {
    if (!keys || !keys.length) return true;
    var tags = o.subdomains || [];
    if (keys.indexOf(UNTAGGED) !== -1 && !tags.length) return true;
    return tags.some(function (t) { return keys.indexOf(t) !== -1; });
  }

  /** Turn user input like "PERM, meqc, untagged" into sub-domain ids. Throws on unknown codes. */
  function resolveSubdomainKeys(model, tokens) {
    var m = normalize(model);
    return (Array.isArray(tokens) ? tokens : String(tokens || '').split(','))
      .map(function (t) { return String(t).trim(); }).filter(Boolean)
      .map(function (t) {
        if (t.toUpperCase() === UNTAGGED) return UNTAGGED;
        var hit = m.subdomains.filter(function (sd) {
          return String(sd.code || '').toUpperCase() === t.toUpperCase() || sd.id === t.toUpperCase();
        })[0];
        if (!hit) {
          throw new Error('Unknown sub-domain "' + t + '". Defined: ' +
            (m.subdomains.map(function (sd) { return sd.code || sd.id; }).join(', ') || 'none') + ', untagged');
        }
        return hit.id;
      });
  }

  function escapeRe(v) { return String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  var ID_RE = /\b(?:OBJ|LNK|ACT|EVT|RULE)-\d+\b/g;
  function idsIn(v) { return String(v || '').match(ID_RE) || []; }

  /**
   * A copy of the model narrowed to the given sub-domain ids (plus UNTAGGED): matching objects,
   * links inside those sub-domains or on their boundary (see linkMatches), actions on the objects,
   * events those actions raise, and the traces, questions, roles and systems that refer to them.
   * Context and glossary are kept whole. Empty keys returns the full model.
   */
  function filterModel(model, keys) {
    var full = normalize(model);
    if (!keys || !keys.length) return full;
    var m = normalize(full);

    m.objects = full.objects.filter(function (o) { return objectMatches(o, keys); });
    var names = m.objects.map(function (o) { return String(o.name || '').toLowerCase(); });
    function kept(name) { return names.indexOf(String(name || '').toLowerCase()) !== -1; }

    m.links = full.links.filter(function (l) { return linkMatches(full, l, keys); });
    m.actions = full.actions.filter(function (a) { return actionMatches(full, a, keys); });
    m.events = full.events.filter(function (e) { return eventMatches(full, e, keys); });

    var keptIds = [];
    m.objects.forEach(function (o) {
      keptIds.push(o.id);
      (o.rules || []).forEach(function (r) { keptIds.push(r.id); });
    });
    m.links.concat(m.actions, m.events).forEach(function (x) { keptIds.push(x.id); });
    function relevant() {
      var refs = idsIn(Array.prototype.join.call(arguments, ' '));
      return !refs.length || refs.some(function (r) { return keptIds.indexOf(r) !== -1; });
    }
    m.traceability = full.traceability.filter(function (t) { return relevant(t.ontologyId); });
    m.openQuestions = full.openQuestions.filter(function (q) { return relevant(q.question, q.impact); });

    // Roles and systems are free text: keep those that mention a visible object or action, or
    // that mention none at all (they are general and apply everywhere).
    var allNames = full.objects.map(function (o) { return o.name; }).filter(Boolean);
    var allActionIds = full.actions.map(function (a) { return a.id; }).filter(Boolean);
    function mentions(textValue, list) {
      return list.filter(function (n) { return new RegExp('\\b' + escapeRe(n) + '\\b').test(textValue); });
    }
    function inView() {
      var t = Array.prototype.join.call(arguments, ' ');
      var objs = mentions(t, allNames), acts = mentions(t, allActionIds);
      if (!objs.length && !acts.length) return true;
      return objs.some(kept) || acts.some(function (id) { return keptIds.indexOf(id) !== -1; });
    }
    m.roles = full.roles.filter(function (r) { return inView(r.objects, r.actions); });
    m.systems = full.systems.filter(function (x) { return inView(x.mastered, x.consumed); });

    // Objects outside the view that visible links point at — kept so boundary links still
    // resolve to their sub-domains.
    var otherObjects = [];
    m.links.forEach(function (l) {
      [l.source, l.target].forEach(function (n) {
        if (kept(n)) return;
        var o = objectByName(full, n);
        if (o && !otherObjects.some(function (x) { return x.id === o.id; })) {
          otherObjects.push({ id: o.id, name: o.name, subdomains: o.subdomains.slice() });
        }
      });
    });

    m.view = {
      filtered: true,
      otherObjects: otherObjects,
      subdomains: keys.slice(),
      labels: keys.map(function (k) {
        if (k === UNTAGGED) return 'Untagged objects';
        var sd = subdomainById(full, k);
        return sd ? (sd.code || sd.id) + (sd.name ? ' (' + sd.name + ')' : '') : k;
      }),
      shown: { objects: m.objects.length, links: m.links.length, actions: m.actions.length },
      total: { objects: full.objects.length, links: full.links.length, actions: full.actions.length }
    };
    return m;
  }

  /** Business SMEs for the given sub-domain ids, one entry per line/semicolon in the SME field. */
  function smesFor(model, keys) {
    var m = normalize(model), out = [];
    (keys || []).forEach(function (k) {
      var sd = subdomainById(m, k);
      if (!sd || !has(sd.smes)) return;
      String(sd.smes).split(/[;\n]/).forEach(function (x) {
        x = x.trim();
        if (x && out.indexOf(x) === -1) out.push(x);
      });
    });
    return out;
  }

  /* ----------------------------------------------------------- md helpers */

  function has(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }

  /** Escape a value for use inside a Markdown table cell. */
  function cell(v) {
    if (!has(v)) return '—';
    return String(v).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>').trim();
  }

  function text(v, fallback) {
    return has(v) ? String(v).trim() : (fallback || '_Not yet captured._');
  }

  function table(headers, rows) {
    if (!rows.length) return '_None captured yet._';
    var out = ['| ' + headers.join(' | ') + ' |',
               '|' + headers.map(function () { return '---'; }).join('|') + '|'];
    rows.forEach(function (r) { out.push('| ' + r.map(cell).join(' | ') + ' |'); });
    return out.join('\n');
  }

  function list(v, bullet) {
    if (!has(v)) return '';
    return String(v).split(/\r?\n/).filter(function (l) { return l.trim(); })
      .map(function (l, i) { return (bullet === 'number' ? (i + 1) + '. ' : '- ') + l.trim(); })
      .join('\n');
  }

  function section(title, body) { return '## ' + title + '\n\n' + body + '\n'; }

  /* -------------------------------------------------------------- render */

  function toMarkdown(model) {
    var m = normalize(model);
    var meta = m.meta;
    var view = m.view && m.view.filtered ? m.view : null;
    var useSd = m.subdomains.length > 0;
    var out = [];

    out.push('# Business Model / Ontology — ' + text(meta.customer, '<Customer Name>') +
             (view ? ' — ' + view.labels.map(function (l) { return l.split(' (')[0]; }).join(', ') + ' view' : ''));
    out.push('');
    if (view) {
      var smes = smesFor(m, view.subdomains);
      out.push('> **Filtered view — sub-domains: ' + view.labels.join(', ') + '.**');
      out.push('> Showing ' + view.shown.objects + ' of ' + view.total.objects + ' Objects, ' +
               view.shown.links + ' of ' + view.total.links + ' Links and ' +
               view.shown.actions + ' of ' + view.total.actions + ' Actions.' +
               (smes.length ? ' Reviewing SMEs: ' + smes.join('; ') + '.' : ''));
      out.push('> Links to Objects outside these sub-domains are kept and marked ↔. This is a reading aid');
      out.push('> for a sub-domain review, **not the canonical document** — make changes in the full version.');
      out.push('');
    }
    out.push('> **Grounding artifact for the AI-Driven Development lifecycle.** Requirements, specs,');
    out.push('> data models, API contracts, tests and generated code must trace back to the Objects,');
    out.push('> Links and Actions defined here. If a term does not appear in this document, it does');
    out.push('> not belong in a spec.');
    out.push('>');
    out.push('> Generated by the Ontology Builder (`apps/ontology-builder`) on ' + today() + '.');
    out.push(view
      ? '> Appendix A holds this view\'s data only; re-import the full document to continue editing.'
      : '> Re-import this file into the app to continue editing — Appendix A holds the source data.');
    out.push('');
    out.push(table(['Field', 'Value'], [
      ['Customer', meta.customer],
      ['Business unit / domain in scope', meta.domain],
      ['Document owner (PM)', meta.owner],
      ['Customer SMEs consulted', meta.smes],
      ['Version', meta.version],
      ['Status', meta.status],
      ['Last updated', meta.lastUpdated],
      ['Approved by (customer)', meta.approvedBy]
    ]));
    out.push('');
    out.push('---');
    out.push('');

    /* Part 1 — context */
    var ctx = m.context || {};
    var p1 = [];
    p1.push('### 1.1 What the business does');
    p1.push('');
    p1.push(text(ctx.whatBusinessDoes));
    p1.push('');
    p1.push('### 1.2 Sub-domains');
    p1.push('');
    p1.push(renderSubdomains(m, view));
    p1.push('');
    p1.push('### 1.3 Scope');
    p1.push('');
    p1.push(table(['In scope', 'Out of scope', 'Reason'],
      (ctx.scope || []).map(function (s) { return [s.inScope, s.outOfScope, s.reason]; })));
    p1.push('');
    p1.push('### 1.4 Business outcomes this engagement must move');
    p1.push('');
    p1.push(table(['#', 'Outcome', 'Current measure', 'Target', 'Owner'],
      (ctx.outcomes || []).map(function (o, i) {
        return [o.id || 'O' + (i + 1), o.outcome, o.current, o.target, o.owner];
      })));
    p1.push('');
    p1.push('### 1.5 Source material');
    p1.push('');
    p1.push(table(['Source', 'Type', 'Date', 'Notes'],
      (ctx.sources || []).map(function (s) { return [s.source, s.type, s.date, s.notes]; })));
    out.push(section('Part 1 — Business Context', p1.join('\n')));

    /* Part 2 — glossary */
    var p2 = [];
    p2.push('### 2.1 Ubiquitous language');
    p2.push('');
    p2.push(table(['Term', 'Definition', 'Synonyms / aliases in use', 'Do NOT confuse with'],
      (m.glossary || []).map(function (g) { return [g.term, g.definition, g.synonyms, g.notConfuse]; })));
    p2.push('');
    p2.push('### 2.2 Conventions');
    p2.push('');
    p2.push('- **Objects** are singular `PascalCase` nouns (`PurchaseOrder`, not `purchase_orders`).');
    p2.push('- **Links** are verb phrases read source → target (`Customer *places* Order`).');
    p2.push('- **Actions** are imperative verbs (`ApproveInvoice`, not `InvoiceApproval`).');
    p2.push('- IDs: Objects `OBJ-nn`, Links `LNK-nn`, Actions `ACT-nn`, Rules `RULE-nn`, Events `EVT-nn`.');
    if (has(m.conventions)) { p2.push(''); p2.push(String(m.conventions).trim()); }
    out.push(section('Part 2 — Glossary & Naming Conventions', p2.join('\n')));

    /* Part 3 — objects */
    var p3 = [];
    p3.push('### 3.1 Object index');
    p3.push('');
    p3.push(table(col(['ID', 'Object', 'One-line description', 'Type', 'Owner (business)', 'System of record', 'Est. volume'], 2, 'Sub-domain(s)', useSd),
      (m.objects || []).map(function (o) {
        return col([o.id, o.name, firstLine(o.description), o.type, o.owner, o.systemOfRecord, o.volume],
                   2, codesFor(m, o.subdomains).join(', '), useSd);
      })));
    if (view && view.otherObjects.length) {
      p3.push('');
      p3.push('_Outside this view but linked from it: ' + view.otherObjects.map(function (o) {
        return o.id + ' `' + o.name + '` (' + (codesFor(m, o.subdomains).join(', ') || 'untagged') + ')';
      }).join(', ') + '._');
    }
    p3.push('');
    (m.objects || []).forEach(function (o) {
      p3.push('---');
      p3.push('');
      p3.push('### ' + cellId(o.id) + ' · `' + text(o.name, '<Unnamed>') + '`');
      p3.push('');
      if (useSd) {
        p3.push('**Sub-domains:** ' + (o.subdomains.length
          ? codesFor(m, o.subdomains).map(function (c) { return '`' + c + '`'; }).join(' · ')
          : '_None tagged_'));
        p3.push('');
      }
      p3.push('**Description**');
      p3.push('');
      p3.push(text(o.description));
      p3.push('');
      p3.push('**At a glance**');
      p3.push('');
      p3.push(table(['Attribute', 'Value'], [
        ['Also known as', o.aka]
      ].concat(useSd ? [['Sub-domain(s)', codesFor(m, o.subdomains).join(', ')]] : []).concat([
        ['Type', o.type],
        ['Business owner', o.owner],
        ['System of record', o.systemOfRecord],
        ['Unique identifier', o.identifier],
        ['Typical volume / growth', o.volume],
        ['Retention / regulatory', o.retention],
        ['Data sensitivity', o.sensitivity]
      ])));
      p3.push('');
      p3.push('**Properties**');
      p3.push('');
      p3.push(table(['Property', 'Description', 'Example value', 'Type', 'Required?', 'Derived? (formula)', 'Source', 'Notes / constraints'],
        (o.properties || []).map(function (p) {
          return [p.name, p.description, p.example, p.type, p.required, p.derived, p.source, p.notes];
        })));
      if ((o.customProperties || []).length) {
        p3.push('');
        p3.push('**Custom / customer-specific properties**');
        p3.push('');
        p3.push(table(['Property', 'Description', 'Why it exists / who asked for it', 'Applies when'],
          o.customProperties.map(function (p) { return [p.name, p.description, p.why, p.appliesWhen]; })));
      }
      if ((o.states || []).length) {
        p3.push('');
        p3.push('**States (lifecycle)**');
        p3.push('');
        p3.push(table(['State', 'Meaning', 'Entered by (Action)', 'Exits to'],
          o.states.map(function (s) { return [s.state, s.meaning, s.enteredBy, s.exitsTo]; })));
      }
      if ((o.rules || []).length) {
        p3.push('');
        p3.push('**Business rules & invariants**');
        p3.push('');
        p3.push(table(['ID', 'Rule', 'Enforced when', 'Consequence if violated'],
          o.rules.map(function (r, i) { return [r.id || 'RULE-' + pad(i + 1), r.rule, r.when, r.consequence]; })));
      }
      if ((o.questions || []).length) {
        p3.push('');
        p3.push('**Open questions**');
        p3.push('');
        p3.push(table(['Question', 'Raised by', 'Needs answer from', 'By when', 'Status'],
          o.questions.map(function (q) { return [q.question, q.raisedBy, q.owner, q.due, q.status]; })));
      }
      if (has(o.example)) {
        p3.push('');
        p3.push('**Example instance**');
        p3.push('');
        p3.push('```yaml');
        p3.push(String(o.example).trim());
        p3.push('```');
      }
      p3.push('');
    });
    out.push(section('Part 3 — Objects', p3.join('\n').trim()));

    /* Part 4 — links */
    var p4 = [];
    p4.push('### 4.1 Link index');
    p4.push('');
    p4.push(table(col(['ID', 'Source object', 'Link (source → target)', 'Target object', 'Cardinality', 'Reverse reading', 'Required?', 'Lifecycle rule', 'Why it matters'], 4, 'Sub-domain(s)', useSd),
      (m.links || []).map(function (l) {
        return col([l.id, l.source, l.verb, l.target, l.cardinality, l.reverse || reverseReading(l), l.required, l.lifecycle, l.why],
                   4, linkScope(m, l).label, useSd);
      })));
    if (useSd && m.links.some(function (l) { return linkScope(m, l).boundary; })) {
      p4.push('');
      p4.push('_↔ marks a boundary link: its Objects share no sub-domain, so it is an integration point to agree with the SMEs on both sides._');
    }
    var detailed = (m.links || []).filter(function (l) {
      return (l.properties || []).length || has(l.mutable) || has(l.onDelete);
    });
    if (detailed.length) {
      p4.push('');
      p4.push('### 4.2 Link detail');
      detailed.forEach(function (l) {
        p4.push('');
        p4.push('#### ' + cellId(l.id) + ' · `' + text(l.source, '?') + ' ' + text(l.verb, '?') + ' ' + text(l.target, '?') + '`');
        p4.push('');
        p4.push(table(['Attribute', 'Value'], [
          ['Cardinality', l.cardinality],
          ['Optional / mandatory', l.required],
          ['Can it change over time?', l.mutable],
          ['On delete/archive of source', l.onDelete]
        ]));
        if ((l.properties || []).length) {
          p4.push('');
          p4.push('**Link properties**');
          p4.push('');
          p4.push(table(['Property', 'Description', 'Example', 'Notes'],
            l.properties.map(function (p) { return [p.name, p.description, p.example, p.notes]; })));
        }
      });
    }
    if ((m.links || []).length) {
      p4.push('');
      p4.push('### 4.3 Relationship map');
      p4.push('');
      p4.push('```mermaid');
      p4.push('erDiagram');
      (m.links || []).forEach(function (l) {
        if (!has(l.source) || !has(l.target)) return;
        p4.push('    ' + mermaidName(l.source) + ' ' + mermaidCard(l.cardinality) + ' ' +
                mermaidName(l.target) + ' : "' + String(l.verb || 'relates to').replace(/"/g, '') + '"');
      });
      p4.push('```');
    }
    out.push(section('Part 4 — Links Between Objects', p4.join('\n')));

    /* Part 5 — actions */
    var p5 = [];
    p5.push('### 5.1 Action index');
    p5.push('');
    p5.push(table(col(['ID', 'Action', 'Primary object', 'Actor / role', 'Trigger', 'Pre-conditions', 'Post-conditions', 'Frequency', 'Criticality'], 3, 'Sub-domain(s)', useSd),
      (m.actions || []).map(function (a) {
        return col([a.id, a.name, a.object, a.actor, a.trigger, a.pre, a.post, a.frequency, a.criticality],
                   3, codesFor(m, actionScope(m, a)).join(', '), useSd);
      })));
    var richActions = (m.actions || []).filter(function (a) {
      return has(a.description) || has(a.steps) || has(a.acceptance) || (a.failures || []).length;
    });
    if (richActions.length) {
      p5.push('');
      p5.push('### 5.2 Action detail');
      richActions.forEach(function (a) {
        p5.push('');
        p5.push('#### ' + cellId(a.id) + ' · `' + text(a.name, '<Unnamed>') + '`');
        p5.push('');
        p5.push(text(a.description));
        p5.push('');
        p5.push(table(['Attribute', 'Value'], [
          ['Objects read', a.objectsRead],
          ['Objects created / modified', a.objectsModified],
          ['Links created / broken', a.linksChanged],
          ['Actor(s) & authority', a.actor],
          ['Trigger', a.trigger],
          ['Reversible?', a.reversible],
          ['SLA / timing', a.sla],
          ['Audit requirement', a.audit],
          ['Rules applied', a.rules]
        ]));
        if (has(a.steps)) {
          p5.push('');
          p5.push('**Steps**');
          p5.push('');
          p5.push(list(a.steps, 'number'));
        }
        if ((a.failures || []).length) {
          p5.push('');
          p5.push('**Failure / exception paths**');
          p5.push('');
          p5.push(table(['Condition', 'Business handling'],
            a.failures.map(function (f) { return [f.condition, f.handling]; })));
        }
        if (has(a.acceptance)) {
          p5.push('');
          p5.push('**Acceptance criteria (draft)**');
          p5.push('');
          p5.push(list(a.acceptance));
        }
      });
    }
    if ((m.events || []).length) {
      p5.push('');
      p5.push('### 5.3 Events');
      p5.push('');
      p5.push(table(['ID', 'Event', 'Raised by', 'Carries', 'Consumed by'],
        m.events.map(function (e) { return [e.id, e.name, e.raisedBy, e.carries, e.consumedBy]; })));
    }
    out.push(section('Part 5 — Actions', p5.join('\n')));

    /* Parts 6-8 */
    out.push(section('Part 6 — Actors, Roles & Permissions',
      table(['Role', 'Description', 'Objects they see', 'Actions they may perform', 'Constraints'],
        (m.roles || []).map(function (r) { return [r.role, r.description, r.objects, r.actions, r.constraints]; }))));

    out.push(section('Part 7 — Systems & Data Landscape',
      table(['System', 'Role', 'Objects mastered', 'Objects consumed', 'Integration style', 'Notes'],
        (m.systems || []).map(function (s) { return [s.system, s.role, s.mastered, s.consumed, s.integration, s.notes]; }))));

    var p8 = [];
    p8.push('### 8.1 Outcome → ontology coverage');
    p8.push('');
    p8.push(table(['Outcome', 'Objects involved', 'Actions involved'],
      (m.context.outcomes || []).map(function (o, i) {
        var oid = o.id || 'O' + (i + 1);
        return [oid + ' — ' + (o.outcome || ''), coveringObjects(m, oid), coveringActions(m, oid)];
      })));
    p8.push('');
    p8.push('### 8.2 Downstream traceability');
    p8.push('');
    p8.push(table(['Ontology ID', 'Requirement / Epic', 'Spec', 'Component / Module', 'Tests'],
      (m.traceability || []).map(function (t) {
        return [t.ontologyId, t.requirement, t.spec, t.component, t.tests];
      })));
    out.push(section('Part 8 — Coverage & Traceability', p8.join('\n')));

    /* Part 9 */
    var p9 = [];
    p9.push('### 9.1 Validation checklist');
    p9.push('');
    if (view) {
      p9.push('_The checklist applies to the full document — see the unfiltered version._');
    } else {
      validate(m).forEach(function (c) {
        p9.push('- [' + (c.pass ? 'x' : ' ') + '] ' + c.label + (c.pass ? '' : ' — ' + c.detail));
      });
    }
    p9.push('');
    p9.push('### 9.2 Open questions (consolidated)');
    p9.push('');
    p9.push(table(['Question', 'Owner', 'Due', 'Impact if unresolved', 'Status'],
      allQuestions(m).map(function (q) { return [q.question, q.owner, q.due, q.impact, q.status]; })));
    p9.push('');
    p9.push('### 9.3 Change log');
    p9.push('');
    p9.push(table(['Version', 'Date', 'Author', 'Change', 'Customer re-approval needed?'],
      (m.changeLog || []).map(function (c) { return [c.version, c.date, c.author, c.change, c.reapproval]; })));
    p9.push('');
    p9.push('### 9.4 Sign-off');
    p9.push('');
    p9.push(table(['Name', 'Role', 'Organisation', 'Date', 'Signature / approval reference'],
      (m.signoff || []).map(function (s) { return [s.name, s.role, s.org, s.date, s.reference]; })));
    out.push(section('Part 9 — Review & Sign-off', p9.join('\n')));

    /* Appendix A — machine-readable round-trip source */
    out.push('---');
    out.push('');
    out.push('## Appendix A — Machine-readable source');
    out.push('');
    if (view) {
      out.push('> Data for this filtered view only (see `view`). Not canonical: agents should read the full');
      out.push('> document, and importing this block into the Ontology Builder would drop everything outside the filter.');
    } else {
      out.push('> Canonical data for this document. Downstream agents may parse this block instead of the');
      out.push('> prose above; the Ontology Builder reads it back to resume editing. Keep it in sync by');
      out.push('> regenerating the file rather than hand-editing both. Objects carry `subdomains` as');
      out.push('> sub-domain ids; resolve them to codes through the top-level `subdomains` list.');
    }
    out.push('');
    out.push('```json ontology');
    out.push(JSON.stringify(withMeta(m), null, 2));
    out.push('```');
    out.push('');

    return out.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  function withMeta(m) {
    var copy = JSON.parse(JSON.stringify(m));
    copy.schemaVersion = SCHEMA_VERSION;
    copy.generatedAt = today();
    return copy;
  }

  /** Insert a column at index when enabled — used for the optional Sub-domain(s) column. */
  function col(row, index, value, enabled) {
    if (!enabled) return row;
    var r = row.slice();
    r.splice(index, 0, value);
    return r;
  }

  function renderSubdomains(m, view) {
    if (!m.subdomains.length) return '_No sub-domains defined — the domain in scope is modelled as a single area._';
    var shown = view
      ? m.subdomains.filter(function (sd) { return view.subdomains.indexOf(sd.id) !== -1; })
      : m.subdomains;
    var out = [];
    out.push(table(['ID', 'Code', 'Sub-domain', 'Description', 'Business SMEs', 'Business owner'],
      shown.map(function (sd) { return [sd.id, sd.code, sd.name, sd.description, sd.smes, sd.owner]; })));
    out.push('');
    out.push('#### 1.2.1 Sub-domain map');
    out.push('');
    var rows = shown.map(function (sd) {
      var inside = [], boundary = [];
      m.links.forEach(function (l) {
        var sc = linkScope(m, l);
        if (sc.boundary) {
          if (sc.src.indexOf(sd.id) !== -1) boundary.push(l.id + ' (↔ ' + codesFor(m, sc.tgt).join('/') + ')');
          else if (sc.tgt.indexOf(sd.id) !== -1) boundary.push(l.id + ' (↔ ' + codesFor(m, sc.src).join('/') + ')');
        } else if (sc.ids.indexOf(sd.id) !== -1) inside.push(l.id);
      });
      return [
        sd.code || sd.id,
        m.objects.filter(function (o) { return o.subdomains.indexOf(sd.id) !== -1; }).map(function (o) { return o.id; }).join(', '),
        m.actions.filter(function (a) { return actionScope(m, a).indexOf(sd.id) !== -1; }).map(function (a) { return a.id; }).join(', '),
        inside.join(', '),
        boundary.join(', ')
      ];
    });
    var untagged = m.objects.filter(function (o) { return !o.subdomains.length; });
    if (untagged.length && (!view || view.subdomains.indexOf(UNTAGGED) !== -1)) {
      rows.push(['_(untagged)_', untagged.map(function (o) { return o.id; }).join(', '), '', '', '']);
    }
    out.push(table(['Sub-domain', 'Objects', 'Actions', 'Links within', 'Boundary links'], rows));
    return out.join('\n');
  }

  function cellId(id) { return has(id) ? id : 'OBJ-??'; }
  function firstLine(v) {
    if (!has(v)) return '';
    var l = String(v).trim().split(/\r?\n/)[0];
    return l.length > 120 ? l.slice(0, 117) + '…' : l;
  }
  // English passives can't be derived reliably from a verb phrase ("is measured in" -> ?), so
  // show the relationship read from the target's side rather than guess at grammar.
  function reverseReading(l) {
    if (!has(l.source) || !has(l.target)) return '';
    return l.target + ' ← ' + (l.verb || 'linked to') + ' — ' + l.source;
  }
  function mermaidName(n) { return String(n).toUpperCase().replace(/[^A-Z0-9]/g, '_'); }
  function mermaidCard(c) {
    var s = String(c || '');
    if (/1\.\.\*/.test(s)) return '||--|{';
    if (/0\.\.\*/.test(s)) return '||--o{';
    if (/0\.\.1/.test(s)) return '||--o|';
    return '||--||';
  }
  function coveringObjects(m, outcomeId) {
    return (m.objects || []).filter(function (o) { return refersTo(o, outcomeId); })
      .map(function (o) { return o.id; }).join(', ');
  }
  function coveringActions(m, outcomeId) {
    return (m.actions || []).filter(function (a) { return refersTo(a, outcomeId); })
      .map(function (a) { return a.id; }).join(', ');
  }
  function refersTo(item, id) {
    return new RegExp('\\b' + id + '\\b').test(JSON.stringify(item));
  }
  function allQuestions(m) {
    var qs = (m.openQuestions || []).slice();
    (m.objects || []).forEach(function (o) {
      (o.questions || []).forEach(function (q) {
        qs.push({ question: '[' + o.id + '] ' + q.question, owner: q.owner, due: q.due, impact: '', status: q.status });
      });
    });
    return qs;
  }

  /* ------------------------------------------------------------ validate */

  function validate(model) {
    var m = normalize(model);
    var objs = m.objects || [], links = m.links || [], acts = m.actions || [];
    var names = objs.map(function (o) { return (o.name || '').toLowerCase(); });
    var checks = [];

    function check(label, pass, detail) { checks.push({ label: label, pass: !!pass, detail: detail || '' }); }
    function missing(items, test, label) {
      return items.filter(test).map(function (i) { return i.id || i.name || label; }).join(', ');
    }

    check('Customer, domain and document owner recorded',
      has(m.meta.customer) && has(m.meta.domain) && has(m.meta.owner), 'fill in the header');
    var sds = m.subdomains, seen = {};
    var badSd = sds.filter(function (sd) {
      var code = String(sd.code || '').trim().toUpperCase();
      var dup = code && seen[code];
      seen[code] = true;
      return !code || dup || !has(sd.name) || !has(sd.smes);
    }).map(function (sd) { return sd.code || sd.id; }).join(', ');
    check('Every sub-domain has a unique code, a name and at least one business SME', !badSd, badSd);

    var untaggedObjs = sds.length ? missing(objs, function (o) { return !o.subdomains.length; }) : '';
    check('Every Object is tagged with at least one sub-domain', !untaggedObjs, untaggedObjs);

    var sdIds = sds.map(function (sd) { return sd.id; });
    var dangling = missing(objs, function (o) {
      return o.subdomains.some(function (t) { return sdIds.indexOf(t) === -1; });
    });
    check('Object sub-domain tags refer to defined sub-domains', !dangling, dangling);

    check('Business context and at least one outcome captured',
      has(m.context.whatBusinessDoes) && (m.context.outcomes || []).length, 'see Part 1');
    check('At least one Object defined', objs.length > 0, 'see Part 3');

    var noDesc = missing(objs, function (o) { return !has(o.description); });
    check('Every Object has a description', !noDesc, noDesc);

    var noOwner = missing(objs, function (o) { return !has(o.owner) || !has(o.systemOfRecord); });
    check('Every Object has an owner and a system of record', !noOwner, noOwner);

    var noId = missing(objs, function (o) { return !has(o.identifier); });
    check('Every Object has a unique identifier property', !noId, noId);

    var noProps = missing(objs, function (o) { return !(o.properties || []).length; });
    check('Every Object has at least one property', !noProps, noProps);

    var orphan = missing(objs, function (o) {
      return !links.some(function (l) { return same(l.source, o.name) || same(l.target, o.name); });
    });
    check('Every Object participates in at least one Link', objs.length < 2 || !orphan, orphan);

    var badLink = missing(links, function (l) {
      return !names.includes(String(l.source || '').toLowerCase()) ||
             !names.includes(String(l.target || '').toLowerCase());
    });
    check('Every Link points at defined Objects', !badLink, badLink);

    var noCard = missing(links, function (l) { return !has(l.cardinality); });
    check('Every Link has a cardinality', !noCard, noCard);

    check('At least one Action defined', acts.length > 0, 'see Part 5');

    var thinAction = missing(acts, function (a) { return !has(a.actor) || !has(a.trigger) || !has(a.post); });
    check('Every Action names its actor, trigger and post-conditions', !thinAction, thinAction);

    var badActionObj = missing(acts, function (a) {
      return has(a.object) && !names.includes(String(a.object).toLowerCase());
    });
    check('Every Action targets a defined Object', !badActionObj, badActionObj);

    var statesNoAction = missing(objs, function (o) {
      return (o.states || []).some(function (s) { return !has(s.enteredBy); });
    });
    check('Every lifecycle state is entered by a named Action', !statesNoAction, statesNoAction);

    var noExample = missing(objs.filter(function (o) { return o.type === 'Core'; }),
      function (o) { return !has(o.example); });
    check('Every Core object has a concrete example', !noExample, noExample);

    check('Glossary has at least one term', (m.glossary || []).length > 0, 'see Part 2');

    var unassigned = allQuestions(m).filter(function (q) {
      return String(q.status || 'Open') !== 'Closed' && (!has(q.owner) || !has(q.due));
    }).length;
    check('All open questions have an owner and a due date', !unassigned,
      unassigned + ' question(s) unassigned');

    return checks;
  }

  function same(a, b) { return String(a || '').toLowerCase() === String(b || '').toLowerCase(); }

  /* -------------------------------------------------------------- import */

  /** Pull the Appendix A JSON back out of a generated Markdown file. */
  function extractModel(markdown) {
    var m = /```json ontology\s*\n([\s\S]*?)\n```/.exec(String(markdown || ''));
    if (!m) throw new Error('No "```json ontology" block found — this file was not generated by the Ontology Builder.');
    return JSON.parse(m[1]);
  }

  return {
    SCHEMA_VERSION: SCHEMA_VERSION,
    emptyModel: emptyModel,
    emptyObject: emptyObject,
    emptyLink: emptyLink,
    emptyAction: emptyAction,
    nextId: nextId,
    today: today,
    toMarkdown: toMarkdown,
    validate: validate,
    extractModel: extractModel,
    normalize: normalize,
    UNTAGGED: UNTAGGED,
    codesFor: codesFor,
    linkScope: linkScope,
    linkMatches: linkMatches,
    actionMatches: actionMatches,
    eventMatches: eventMatches,
    actionScope: actionScope,
    objectMatches: objectMatches,
    filterModel: filterModel,
    resolveSubdomainKeys: resolveSubdomainKeys,
    smesFor: smesFor
  };
});
