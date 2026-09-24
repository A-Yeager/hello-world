/*
 * service-catalog.js — shared model, Markdown renderer, validator and sub-domain filter for the
 * Service Catalog: the services the IT solution must provide to the business.
 *
 * Each service is grounded in the Business Model / Ontology (sub-domains SD-nn, objects OBJ-nn,
 * actions ACT-nn) and traced forward to technical specs and work items (epics, stories, tasks),
 * so AI agents can go from "what the business needs" to "what to build" without guessing.
 *
 * The catalog is its own document (.json / .md) that references an ontology by ID. It carries a
 * snapshot of the ontology entries it needs (`ontology`) so it renders and validates on its own;
 * the app and CLI refresh that snapshot from the live ontology when one is available.
 *
 * Runs unchanged in the browser (window.ServiceCatalog) and in Node (module.exports).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ServiceCatalog = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCHEMA_VERSION = 1;
  var KIND = 'service-catalog';
  var UNTAGGED = 'UNTAGGED'; // same filter key as the ontology, for services with no sub-domain

  var CATEGORIES = ['Business', 'Application', 'Data', 'Integration', 'Reporting & analytics', 'Platform', 'Security & identity'];
  var SERVICE_TYPES = ['User-facing (UI)', 'API', 'Batch / scheduled', 'Event-driven', 'Report / dashboard', 'Integration / interface', 'Workflow'];
  var STATUSES = ['Proposed', 'Approved', 'In design', 'In build', 'Live', 'Retired'];
  var PRIORITIES = ['Must', 'Should', 'Could', "Won't (this release)"];
  var ACCESS = ['Read', 'Create', 'Update', 'Delete', 'Create / update'];
  var WORK_TYPES = ['Epic', 'Feature', 'Story', 'Task', 'Spike', 'Bug'];
  var BUILDING = ['In build', 'Live'];

  /* ---------------------------------------------------------------- model */

  function emptyCatalog() {
    return {
      schemaVersion: SCHEMA_VERSION,
      kind: KIND,
      meta: {
        customer: '', domain: '', owner: '', version: 'v0.1',
        status: 'Draft', lastUpdated: today(), approvedBy: ''
      },
      purpose: '',
      // Snapshot of the ontology this catalog is grounded in; see snapshotOntology().
      ontology: { customer: '', domain: '', version: '', subdomains: [], objects: [], actions: [] },
      services: [],       // see emptyService()
      openQuestions: [],  // {question, owner, due, impact, status}
      changeLog: []       // {version, date, author, change}
    };
  }

  function emptyService(id) {
    return {
      id: id || '', name: '', summary: '', description: '',
      category: 'Application', type: 'User-facing (UI)', status: 'Proposed', priority: 'Must',
      businessOwner: '', technicalOwner: '', consumers: '',
      subdomains: [],      // SD ids of the sub-domains that use this service
      objects: [],         // OBJ ids the service manages or exposes
      actions: [],         // ACT ids the service implements or supports
      operations: [],      // {name, description, action, object, access, inputs, outputs}
      availability: '', responseTime: '', throughput: '', supportHours: '', recovery: '',
      dependsOn: [],       // SVC ids
      externalSystems: '',
      sensitivity: 'Internal', security: '',
      acceptance: '',      // one Given/When/Then per line
      techSpecs: [],       // {id, title, link, status}
      workItems: [],       // {id, type, title, status, link}
      questions: [],       // {question, owner, due, status}
      notes: ''
    };
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function nextId(prefix, list) {
    var max = 0;
    (list || []).forEach(function (item) {
      var m = /(\d+)\s*$/.exec(String(item && item.id || ''));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return prefix + '-' + pad(max + 1);
  }

  function arr(v) { return Array.isArray(v) ? v : []; }

  /** Fill in anything missing so older or hand-edited files load cleanly. */
  function normalize(catalog) {
    var src = JSON.parse(JSON.stringify(catalog || {}));
    var c = Object.assign(emptyCatalog(), src);
    c.kind = KIND;
    c.meta = Object.assign(emptyCatalog().meta, src.meta || {});
    c.ontology = Object.assign(emptyCatalog().ontology, src.ontology || {});
    ['subdomains', 'objects', 'actions'].forEach(function (k) { c.ontology[k] = arr(c.ontology[k]); });
    c.openQuestions = arr(c.openQuestions);
    c.changeLog = arr(c.changeLog);
    c.services = arr(c.services).map(function (s) {
      var n = Object.assign(emptyService(), s);
      ['subdomains', 'objects', 'actions', 'operations', 'dependsOn', 'techSpecs', 'workItems', 'questions']
        .forEach(function (k) { n[k] = arr(n[k]); });
      return n;
    });
    c.schemaVersion = SCHEMA_VERSION;
    return c;
  }

  /* ------------------------------------------------------------- ontology */

  /**
   * The slice of an ontology a catalog needs to stand on its own: identity, sub-domain codes,
   * and object / action names. Takes a normalized ontology model (see ontology-md.js).
   */
  function snapshotOntology(o) {
    o = o || {};
    var meta = o.meta || {};
    return {
      customer: meta.customer || '', domain: meta.domain || '', version: meta.version || '',
      subdomains: arr(o.subdomains).map(function (sd) {
        return { id: sd.id, code: sd.code || '', name: sd.name || '', smes: sd.smes || '' };
      }),
      objects: arr(o.objects).map(function (x) {
        return { id: x.id, name: x.name || '', subdomains: arr(x.subdomains).slice() };
      }),
      actions: arr(o.actions).map(function (a) {
        return { id: a.id, name: a.name || '', object: a.object || '' };
      })
    };
  }

  function hasOntology(snap) {
    return !!(snap && (snap.subdomains.length || snap.objects.length || snap.actions.length));
  }

  /**
   * Whether an ontology can safely refresh this catalog's snapshot: the catalog has none yet,
   * or both name the same customer. Guards against grounding a catalog in the wrong customer.
   */
  function sameCustomer(catalog, ontologyModel) {
    var c = normalize(catalog);
    var theirs = String((ontologyModel && ontologyModel.meta && ontologyModel.meta.customer) || '').trim().toLowerCase();
    var ours = String(c.ontology.customer || '').trim().toLowerCase();
    return !hasOntology(c.ontology) || !ours || !theirs || ours === theirs;
  }

  /** Refresh the snapshot from an ontology, and default the catalog header from it. */
  function syncOntology(catalog, ontologyModel) {
    var c = normalize(catalog);
    c.ontology = snapshotOntology(ontologyModel);
    if (!has(c.meta.customer)) c.meta.customer = c.ontology.customer;
    if (!has(c.meta.domain)) c.meta.domain = c.ontology.domain;
    return c;
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function sdCode(c, id) {
    var sd = byId(c.ontology.subdomains, id);
    return sd ? (sd.code || sd.name || sd.id) : '?' + id;
  }
  function codesFor(c, ids) { return arr(ids).map(function (id) { return sdCode(c, id); }); }

  function refLabel(c, kind, id) {
    var list = kind === 'object' ? c.ontology.objects : kind === 'action' ? c.ontology.actions : c.services;
    var hit = byId(list, id);
    return hit && hit.name ? id + ' ' + hit.name : id + (hasOntology(c.ontology) || kind === 'service' ? ' (not found)' : '');
  }

  /* ------------------------------------------------------------ filtering */

  function serviceMatches(s, keys) {
    if (!keys || !keys.length) return true;
    var tags = arr(s.subdomains);
    if (keys.indexOf(UNTAGGED) !== -1 && !tags.length) return true;
    return tags.some(function (t) { return keys.indexOf(t) !== -1; });
  }

  /** Turn "PERM, meqc, untagged" into sub-domain ids using the catalog's snapshot. */
  function resolveSubdomainKeys(catalog, tokens) {
    var c = normalize(catalog);
    return (Array.isArray(tokens) ? tokens : String(tokens || '').split(','))
      .map(function (t) { return String(t).trim(); }).filter(Boolean)
      .map(function (t) {
        if (t.toUpperCase() === UNTAGGED) return UNTAGGED;
        var hit = c.ontology.subdomains.filter(function (sd) {
          return String(sd.code || '').toUpperCase() === t.toUpperCase() || sd.id === t.toUpperCase();
        })[0];
        if (!hit) {
          throw new Error('Unknown sub-domain "' + t + '". Defined: ' +
            (c.ontology.subdomains.map(function (sd) { return sd.code || sd.id; }).join(', ') || 'none') + ', untagged');
        }
        return hit.id;
      });
  }

  /**
   * A copy of the catalog narrowed to services used by the given sub-domains. Services those
   * depend on are listed as outside the view rather than hidden, so reviewers see what their
   * services rely on. Empty keys returns the whole catalog.
   */
  function filterCatalog(catalog, keys) {
    var full = normalize(catalog);
    if (!keys || !keys.length) return full;
    var c = normalize(full);
    c.services = full.services.filter(function (s) { return serviceMatches(s, keys); });
    var shownIds = c.services.map(function (s) { return s.id; });
    var outside = [];
    c.services.forEach(function (s) {
      s.dependsOn.forEach(function (id) {
        if (shownIds.indexOf(id) !== -1 || outside.some(function (o) { return o.id === id; })) return;
        var d = byId(full.services, id);
        if (d) outside.push({ id: d.id, name: d.name, subdomains: d.subdomains.slice() });
      });
    });
    c.openQuestions = full.openQuestions.filter(function (q) {
      var refs = String(q.question + ' ' + q.impact).match(/\bSVC-\d+\b/g) || [];
      return !refs.length || refs.some(function (r) { return shownIds.indexOf(r) !== -1; });
    });
    c.view = {
      filtered: true,
      subdomains: keys.slice(),
      labels: keys.map(function (k) {
        if (k === UNTAGGED) return 'Services with no sub-domain';
        var sd = byId(full.ontology.subdomains, k);
        return sd ? (sd.code || sd.id) + (sd.name ? ' (' + sd.name + ')' : '') : k;
      }),
      otherServices: outside,
      shown: c.services.length,
      total: full.services.length
    };
    return c;
  }

  /* ------------------------------------------------------------ md helpers */

  function has(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }
  function cell(v) {
    if (!has(v)) return '—';
    return String(v).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>').trim();
  }
  function text(v, fallback) { return has(v) ? String(v).trim() : (fallback || '_Not yet captured._'); }
  /** opts.empty: text when there are no rows; opts.blank: render empty cells as blank, not "—". */
  function table(headers, rows, opts) {
    opts = typeof opts === 'string' ? { empty: opts } : (opts || {});
    if (!rows.length) return opts.empty || '_None captured yet._';
    var out = ['| ' + headers.join(' | ') + ' |', '|' + headers.map(function () { return '---'; }).join('|') + '|'];
    rows.forEach(function (r) {
      out.push('| ' + r.map(function (v) { return opts.blank && !has(v) ? ' ' : cell(v); }).join(' | ') + ' |');
    });
    return out.join('\n');
  }
  function list(v) {
    return String(v || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean)
      .map(function (l) { return '- ' + l; }).join('\n');
  }
  function link(title, url) {
    if (!has(url)) return title;
    return has(title) ? '[' + String(title).replace(/[[\]]/g, '') + '](' + String(url).trim() + ')' : String(url).trim();
  }
  function section(title, body) { return '## ' + title + '\n\n' + body + '\n'; }
  function tickList(ids, fmt) {
    return arr(ids).map(function (id) { return '`' + fmt(id) + '`'; }).join(' · ');
  }

  /* --------------------------------------------------------------- render */

  function toMarkdown(catalog) {
    var c = normalize(catalog);
    var meta = c.meta, onto = c.ontology;
    var view = c.view && c.view.filtered ? c.view : null;
    var useSd = onto.subdomains.length > 0;
    var out = [];

    out.push('# Service Catalog — ' + text(meta.customer, '<Customer Name>') +
             (view ? ' — ' + view.labels.map(function (l) { return l.split(' (')[0]; }).join(', ') + ' view' : ''));
    out.push('');
    if (view) {
      var smes = [];
      view.subdomains.forEach(function (k) {
        var sd = byId(onto.subdomains, k);
        String(sd && sd.smes || '').split(/[;\n]/).forEach(function (x) {
          x = x.trim(); if (x && smes.indexOf(x) === -1) smes.push(x);
        });
      });
      out.push('> **Filtered view — sub-domains: ' + view.labels.join(', ') + '.** Showing ' + view.shown +
               ' of ' + view.total + ' services.' + (smes.length ? ' Reviewing SMEs: ' + smes.join('; ') + '.' : ''));
      out.push('> A reading aid for a sub-domain review, **not the canonical catalog** — make changes in the full version.');
      out.push('');
    }
    out.push('> **The services the IT solution must provide to the business.** Each service is grounded in');
    out.push('> the Business Model / Ontology (sub-domains, Objects and Actions by ID) and traced to the');
    out.push('> technical specs and work items that deliver it. Specs, stories and code for a service must');
    out.push('> trace back to its `SVC-nn` ID here.');
    out.push('>');
    out.push('> Generated by the Ontology Builder (`apps/ontology-builder`, Service Catalog module) on ' + today() + '.');
    out.push(view
      ? '> Appendix A holds this view\'s data only; re-import the full catalog to continue editing.'
      : '> Re-import this file into the app to continue editing — Appendix A holds the source data.');
    out.push('');
    out.push(table(['Field', 'Value'], [
      ['Customer', meta.customer],
      ['Business unit / domain in scope', meta.domain],
      ['Catalog owner', meta.owner],
      ['Grounded in ontology', hasOntology(onto)
        ? 'Business Model / Ontology — ' + (onto.customer || '?') + (onto.domain ? ' · ' + onto.domain : '') +
          (onto.version ? ' · ' + onto.version : '') + ' (' + onto.subdomains.length + ' sub-domains, ' +
          onto.objects.length + ' objects, ' + onto.actions.length + ' actions)'
        : ''],
      ['Version', meta.version],
      ['Status', meta.status],
      ['Last updated', meta.lastUpdated],
      ['Approved by (customer)', meta.approvedBy]
    ]));
    out.push('');
    out.push('---');
    out.push('');

    /* Part 1 — overview */
    var p1 = [];
    p1.push('### 1.1 Purpose & scope');
    p1.push('');
    p1.push(text(c.purpose));
    p1.push('');
    p1.push('### 1.2 Service index');
    p1.push('');
    p1.push(table(['ID', 'Service', 'Category', 'Type', 'Sub-domain(s)', 'Status', 'Priority', 'Business owner'],
      c.services.map(function (s) {
        return [s.id, s.name, s.category, s.type, codesFor(c, s.subdomains).join(', '), s.status, s.priority, s.businessOwner];
      })));
    if (view && view.otherServices.length) {
      p1.push('');
      p1.push('_Outside this view but depended on by it: ' + view.otherServices.map(function (s) {
        return s.id + ' `' + s.name + '` (' + (codesFor(c, s.subdomains).join(', ') || 'no sub-domain') + ')';
      }).join(', ') + '._');
    }
    if (useSd) {
      var sds = view ? onto.subdomains.filter(function (sd) { return view.subdomains.indexOf(sd.id) !== -1; }) : onto.subdomains;
      p1.push('');
      p1.push('### 1.3 Sub-domain coverage');
      p1.push('');
      p1.push('> Which sub-domains use which services. A sub-domain with no services is either out of');
      p1.push('> scope for this release or a gap to raise.');
      p1.push('');
      p1.push(table(['Service'].concat(sds.map(function (sd) { return sd.code || sd.id; })),
        c.services.map(function (s) {
          return [s.id + ' ' + s.name].concat(sds.map(function (sd) { return s.subdomains.indexOf(sd.id) !== -1 ? '●' : ''; }));
        }).concat([['**Services**'].concat(sds.map(function (sd) {
          return '**' + c.services.filter(function (s) { return s.subdomains.indexOf(sd.id) !== -1; }).length + '**';
        }))]), { blank: true }));
      var bare = sds.filter(function (sd) {
        return !c.services.some(function (s) { return s.subdomains.indexOf(sd.id) !== -1; });
      });
      if (bare.length) {
        p1.push('');
        p1.push('_Sub-domains with no service yet: ' + bare.map(function (sd) { return '`' + (sd.code || sd.id) + '`'; }).join(', ') + '._');
      }
    }
    if (onto.actions.length && !view) {
      p1.push('');
      p1.push('### 1.4 Ontology coverage');
      p1.push('');
      p1.push('> Every business Action in the ontology should be implemented or supported by a service.');
      p1.push('> Actions with no service are requirements nobody is building yet.');
      p1.push('');
      p1.push(table(['Action', 'Primary object', 'Implemented by'], onto.actions.map(function (a) {
        return [a.id + ' ' + a.name, a.object, servicesForAction(c, a.id).join(', ') || '**none**'];
      })));
    }
    out.push(section('Part 1 — Catalog Overview', p1.join('\n')));

    /* Part 2 — services */
    var p2 = [];
    if (!c.services.length) p2.push('_No services defined yet._');
    c.services.forEach(function (s, i) {
      if (i) { p2.push('---'); p2.push(''); }
      p2.push('### ' + (s.id || 'SVC-??') + ' · `' + text(s.name, '<Unnamed service>') + '`');
      p2.push('');
      if (useSd) {
        p2.push('**Sub-domains:** ' + (s.subdomains.length ? tickList(s.subdomains, function (id) { return sdCode(c, id); }) : '_None tagged_'));
        p2.push('');
      }
      p2.push('**Summary** — ' + text(s.summary));
      p2.push('');
      p2.push('**At a glance**');
      p2.push('');
      p2.push(table(['Attribute', 'Value'], [
        ['Category', s.category], ['Type', s.type], ['Status', s.status], ['Priority', s.priority],
        ['Business owner', s.businessOwner], ['Technical owner', s.technicalOwner],
        ['Consumers (roles / systems)', s.consumers], ['Data sensitivity', s.sensitivity]
      ]));
      if (has(s.description)) {
        p2.push('');
        p2.push('**Description**');
        p2.push('');
        p2.push(String(s.description).trim());
      }
      p2.push('');
      p2.push('**Grounding in the ontology**');
      p2.push('');
      p2.push(table(['Kind', 'Reference'],
        s.objects.map(function (id) { return ['Object', refLabel(c, 'object', id)]; })
          .concat(s.actions.map(function (id) { return ['Action', refLabel(c, 'action', id)]; })),
        '_Not grounded yet — link the Objects and Actions this service manages._'));
      p2.push('');
      p2.push('**Operations**');
      p2.push('');
      p2.push(table(['Operation', 'Description', 'Implements action', 'On object', 'Access', 'Inputs', 'Outputs'],
        s.operations.map(function (op) {
          return [op.name, op.description, has(op.action) ? refLabel(c, 'action', op.action) : '',
                  has(op.object) ? refLabel(c, 'object', op.object) : '', op.access, op.inputs, op.outputs];
        })));
      var levels = [['Availability', s.availability], ['Response time', s.responseTime], ['Throughput / volume', s.throughput],
                    ['Support hours', s.supportHours], ['Recovery (RPO / RTO)', s.recovery]].filter(function (r) { return has(r[1]); });
      if (levels.length) {
        p2.push('');
        p2.push('**Service levels**');
        p2.push('');
        p2.push(table(['Measure', 'Target'], levels));
      }
      if (s.dependsOn.length || has(s.externalSystems)) {
        p2.push('');
        p2.push('**Dependencies**');
        p2.push('');
        if (s.dependsOn.length) p2.push('- Services: ' + s.dependsOn.map(function (id) { return refLabel(c, 'service', id); }).join(', '));
        if (has(s.externalSystems)) p2.push('- External systems: ' + String(s.externalSystems).trim().replace(/\r?\n/g, '; '));
      }
      if (has(s.security)) {
        p2.push('');
        p2.push('**Security & compliance**');
        p2.push('');
        p2.push(String(s.security).trim());
      }
      p2.push('');
      p2.push('**Acceptance criteria**');
      p2.push('');
      p2.push(has(s.acceptance) ? list(s.acceptance) : '_Not yet captured._');
      p2.push('');
      p2.push('**Delivery — technical specs**');
      p2.push('');
      p2.push(table(['Spec', 'Title', 'Status'], s.techSpecs.map(function (t) {
        return [t.id, link(t.title, t.link), t.status];
      })));
      p2.push('');
      p2.push('**Delivery — work items**');
      p2.push('');
      p2.push(table(['Key', 'Type', 'Title', 'Status'], s.workItems.map(function (w) {
        return [w.id, w.type, link(w.title, w.link), w.status];
      })));
      if (s.questions.length) {
        p2.push('');
        p2.push('**Open questions**');
        p2.push('');
        p2.push(table(['Question', 'Owner', 'Due', 'Status'], s.questions.map(function (q) {
          return [q.question, q.owner, q.due, q.status];
        })));
      }
      if (has(s.notes)) {
        p2.push('');
        p2.push('**Notes** — ' + String(s.notes).trim());
      }
      p2.push('');
    });
    out.push(section('Part 2 — Services', p2.join('\n').trim()));

    /* Part 3 — dependency map */
    var edges = [];
    c.services.forEach(function (s) {
      s.dependsOn.forEach(function (d) { edges.push([s.id, d]); });
    });
    if (edges.length) {
      var nodes = {};
      var allKnown = c.services.concat(view ? view.otherServices : []);
      var p3 = ['> Arrows point from a service to the services it depends on — build order runs against them.', '', '```mermaid', 'flowchart LR'];
      edges.forEach(function (e) {
        [e[0], e[1]].forEach(function (id) {
          if (nodes[id]) return;
          nodes[id] = true;
          var s = byId(allKnown, id);
          p3.push('    ' + mid(id) + '["' + id + (s && s.name ? ' ' + String(s.name).replace(/"/g, '') : '') + '"]');
        });
      });
      edges.forEach(function (e) { p3.push('    ' + mid(e[0]) + ' --> ' + mid(e[1])); });
      p3.push('```');
      out.push(section('Part 3 — Service Dependencies', p3.join('\n')));
    }

    /* Part 4 — traceability */
    out.push(section('Part 4 — Delivery Traceability',
      '> One row per service: where it comes from (sub-domains, ontology) and what delivers it (specs, work items).\n\n' +
      table(['Service', 'Sub-domain(s)', 'Ontology refs', 'Tech specs', 'Work items', 'Status'],
        c.services.map(function (s) {
          return [s.id + ' ' + s.name, codesFor(c, s.subdomains).join(', '), s.objects.concat(s.actions).join(', '),
                  s.techSpecs.map(function (t) { return t.id || t.title; }).join(', '),
                  s.workItems.map(function (w) { return w.id || w.title; }).join(', '), s.status];
        }))));

    /* Part 5 — review */
    var p5 = [];
    p5.push('### 5.1 Validation checklist');
    p5.push('');
    if (view) p5.push('_The checklist applies to the full catalog — see the unfiltered version._');
    else validate(c).forEach(function (k) {
      p5.push('- [' + (k.pass ? 'x' : ' ') + '] ' + k.label + (k.pass ? '' : ' — ' + k.detail));
    });
    p5.push('');
    p5.push('### 5.2 Open questions (consolidated)');
    p5.push('');
    var qs = c.openQuestions.map(function (q) { return [q.question, q.owner, q.due, q.impact, q.status]; });
    c.services.forEach(function (s) {
      s.questions.forEach(function (q) { qs.push(['[' + s.id + '] ' + q.question, q.owner, q.due, '', q.status]); });
    });
    p5.push(table(['Question', 'Owner', 'Due', 'Impact if unresolved', 'Status'], qs));
    p5.push('');
    p5.push('### 5.3 Change log');
    p5.push('');
    p5.push(table(['Version', 'Date', 'Author', 'Change'], c.changeLog.map(function (x) {
      return [x.version, x.date, x.author, x.change];
    })));
    out.push(section('Part 5 — Review', p5.join('\n')));

    /* Appendix A */
    out.push('---');
    out.push('');
    out.push('## Appendix A — Machine-readable source');
    out.push('');
    if (view) {
      out.push('> Data for this filtered view only (see `view`). Not canonical: agents should read the full catalog.');
    } else {
      out.push('> Canonical data for this catalog. Agents implementing a service should parse this block:');
      out.push('> `services[].subdomains`, `.objects` and `.actions` are ontology IDs, resolved through the');
      out.push('> `ontology` snapshot (or the ontology document itself); `techSpecs` and `workItems` are the');
      out.push('> delivery trail. Regenerate the file rather than hand-editing prose and appendix separately.');
    }
    out.push('');
    out.push('```json ' + KIND);
    var data = JSON.parse(JSON.stringify(c));
    data.generatedAt = today();
    out.push(JSON.stringify(data, null, 2));
    out.push('```');
    out.push('');
    return out.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  function mid(id) { return String(id).replace(/[^A-Za-z0-9]/g, '_'); }

  function servicesForAction(c, actionId) {
    return c.services.filter(function (s) {
      return s.actions.indexOf(actionId) !== -1 ||
             s.operations.some(function (op) { return op.action === actionId; });
    }).map(function (s) { return s.id; });
  }

  /* ------------------------------------------------------------- validate */

  function validate(catalog) {
    var c = normalize(catalog);
    var svcs = c.services, onto = c.ontology, grounded = hasOntology(onto);
    var checks = [];
    function check(label, pass, detail) { checks.push({ label: label, pass: !!pass, detail: detail || '' }); }
    function missing(test) {
      return svcs.filter(test).map(function (s) { return s.id || s.name || '(unnamed)'; }).join(', ');
    }
    var ids = function (list) { return list.map(function (x) { return x.id; }); };
    var sdIds = ids(onto.subdomains), objIds = ids(onto.objects), actIds = ids(onto.actions), svcIds = ids(svcs);

    check('Customer, domain and catalog owner recorded',
      has(c.meta.customer) && has(c.meta.domain) && has(c.meta.owner), 'fill in the Overview step');
    check('Catalog is grounded in an ontology', grounded,
      'build the Business Model first — services reference its sub-domains, objects and actions');
    check('At least one service defined', svcs.length > 0, 'see the Services step');

    var dup = svcIds.filter(function (id, i) { return id && svcIds.indexOf(id) !== i; });
    check('Service IDs are unique', !dup.length, dup.join(', '));

    check('Every service has a name, summary and business owner',
      !missing(function (s) { return !has(s.name) || !has(s.summary) || !has(s.businessOwner); }),
      missing(function (s) { return !has(s.name) || !has(s.summary) || !has(s.businessOwner); }));

    var noSd = onto.subdomains.length ? missing(function (s) { return !s.subdomains.length; }) : '';
    check('Every service is used by at least one sub-domain', !noSd, noSd);

    var badSd = missing(function (s) { return s.subdomains.some(function (t) { return sdIds.indexOf(t) === -1; }); });
    check('Sub-domain tags refer to sub-domains in the ontology', !badSd, badSd);

    var bareSd = onto.subdomains.filter(function (sd) {
      return !svcs.some(function (s) { return s.subdomains.indexOf(sd.id) !== -1; });
    }).map(function (sd) { return sd.code || sd.id; }).join(', ');
    check('Every sub-domain uses at least one service', !svcs.length || !bareSd, bareSd);

    var ungrounded = missing(function (s) { return !s.objects.length && !s.actions.length; });
    check('Every service is grounded in at least one ontology Object or Action', !ungrounded, ungrounded);

    var badRefs = grounded ? missing(function (s) {
      var ops = s.operations;
      return s.objects.some(function (id) { return objIds.indexOf(id) === -1; }) ||
             s.actions.some(function (id) { return actIds.indexOf(id) === -1; }) ||
             ops.some(function (op) {
               return (has(op.action) && actIds.indexOf(op.action) === -1) ||
                      (has(op.object) && objIds.indexOf(op.object) === -1);
             });
    }) : '';
    check('Ontology references resolve', !badRefs, badRefs);

    var uncovered = onto.actions.filter(function (a) { return !servicesForAction(c, a.id).length; })
      .map(function (a) { return a.id; }).join(', ');
    check('Every ontology Action is covered by a service', !svcs.length || !uncovered, uncovered);

    var noOps = missing(function (s) { return !s.operations.length; });
    check('Every service lists at least one operation', !noOps, noOps);

    var noAc = missing(function (s) { return !has(s.acceptance); });
    check('Every service has acceptance criteria', !noAc, noAc);

    var noSla = missing(function (s) { return s.priority === 'Must' && !has(s.availability) && !has(s.responseTime); });
    check('Every Must service has an availability or response-time target', !noSla, noSla);

    var badDeps = missing(function (s) {
      return s.dependsOn.some(function (d) { return d === s.id || svcIds.indexOf(d) === -1; });
    });
    check('Service dependencies refer to other defined services', !badDeps, badDeps);

    var cycle = findCycle(svcs);
    check('Service dependencies have no cycles', !cycle, cycle ? cycle.join(' → ') : '');

    var untraced = missing(function (s) {
      return BUILDING.indexOf(s.status) !== -1 && (!s.techSpecs.length || !s.workItems.length);
    });
    check('Services in build or live have a tech spec and work items', !untraced, untraced);

    var openQs = c.openQuestions.concat.apply(c.openQuestions, svcs.map(function (s) { return s.questions; }))
      .filter(function (q) { return String(q.status || 'Open') !== 'Closed' && (!has(q.owner) || !has(q.due)); }).length;
    check('All open questions have an owner and a due date', !openQs, openQs + ' question(s) unassigned');

    return checks;
  }

  function findCycle(svcs) {
    var graph = {};
    svcs.forEach(function (s) { graph[s.id] = s.dependsOn; });
    var state = {}, stack = [];
    function visit(id) {
      if (state[id] === 1) return stack.slice(stack.indexOf(id)).concat([id]);
      if (state[id] === 2 || !graph[id]) return null;
      state[id] = 1; stack.push(id);
      for (var i = 0; i < graph[id].length; i++) {
        if (graph[id][i] === id) continue; // self-reference is reported by the dependency check
        var found = visit(graph[id][i]);
        if (found) return found;
      }
      stack.pop(); state[id] = 2;
      return null;
    }
    for (var k in graph) { var f = visit(k); if (f) return f; }
    return null;
  }

  /* --------------------------------------------------------------- import */

  function extractCatalog(markdown) {
    var m = /```json service-catalog\s*\n([\s\S]*?)\n```/.exec(String(markdown || ''));
    if (!m) throw new Error('No "```json service-catalog" block found — this file is not a Service Catalog generated by the Ontology Builder.');
    return JSON.parse(m[1]);
  }

  /** Whether a parsed JSON document is a service catalog (vs an ontology). */
  function isCatalog(data) {
    return !!data && (data.kind === KIND || Array.isArray(data.services));
  }

  return {
    SCHEMA_VERSION: SCHEMA_VERSION,
    KIND: KIND,
    UNTAGGED: UNTAGGED,
    CATEGORIES: CATEGORIES,
    SERVICE_TYPES: SERVICE_TYPES,
    STATUSES: STATUSES,
    PRIORITIES: PRIORITIES,
    ACCESS: ACCESS,
    WORK_TYPES: WORK_TYPES,
    emptyCatalog: emptyCatalog,
    emptyService: emptyService,
    nextId: nextId,
    today: today,
    normalize: normalize,
    snapshotOntology: snapshotOntology,
    hasOntology: hasOntology,
    sameCustomer: sameCustomer,
    syncOntology: syncOntology,
    codesFor: codesFor,
    serviceMatches: serviceMatches,
    servicesForAction: servicesForAction,
    resolveSubdomainKeys: resolveSubdomainKeys,
    filterCatalog: filterCatalog,
    toMarkdown: toMarkdown,
    validate: validate,
    extractCatalog: extractCatalog,
    isCatalog: isCatalog
  };
});
