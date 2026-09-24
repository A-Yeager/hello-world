#!/usr/bin/env node
/*
 * Ontology Builder CLI — render or validate an ontology outside the browser,
 * so build pipelines and AI agents can regenerate the Markdown without a UI.
 *
 *   node cli.js build   <source> [-o out.md] [--subdomain PERM,MEQC]
 *   node cli.js check   <source>                  # exits 1 if any check fails
 *   node cli.js extract <source> [-o out.json]    # Markdown -> canonical JSON
 *   node cli.js subdomains <source>               # list sub-domains, their SMEs and sizes
 *
 * <source> is an ontology .json, a generated .md, or a bundled example such as
 * example:cms-cpi or example:northwind.
 *
 * --subdomain writes a filtered view for reviewing one area with its SMEs: only the
 * Objects tagged with those codes, plus the Links and Actions that touch them. Use
 * "untagged" to list Objects that still need a sub-domain.
 *
 * Service Catalog — the services the solution provides, grounded in an ontology:
 *
 *   node cli.js catalog build   <catalog> [--ontology <source>] [-o out.md] [--subdomain PERM]
 *   node cli.js catalog check   <catalog> [--ontology <source>]   # exits 1 if any check fails
 *   node cli.js catalog extract <catalog> [-o out.json]
 *   node cli.js catalog service <catalog> SVC-02                  # one service as JSON, for agents
 *
 * <catalog> is a catalog .json, a generated catalog .md, or example:<name>. --ontology refreshes
 * the catalog's ontology snapshot from that ontology before building or checking, so references
 * are validated against the current model (examples use their own ontology automatically).
 */
'use strict';

var fs = require('fs');
var path = require('path');
var OM = require('./ontology-md.js');
var SC = require('./service-catalog.js');

function example(file) {
  var examples = require('./examples.js');
  var ex = examples[file.slice('example:'.length)];
  if (!ex) throw new Error('No such example. Available: ' + Object.keys(examples).map(function (k) { return 'example:' + k; }).join(', '));
  return ex;
}

function readModel(file) {
  if (/^example:/.test(file)) return OM.normalize(example(file).model);
  if (!fs.existsSync(file)) throw new Error('No such file: ' + file);
  var raw = fs.readFileSync(file, 'utf8');
  var model = OM.normalize(/\.json$/i.test(file) ? JSON.parse(raw) : OM.extractModel(raw));
  if (model.view && model.view.filtered) {
    console.error('Warning: ' + file + ' is a filtered sub-domain view, not the full document.');
  }
  return model;
}

function readCatalog(file) {
  if (/^example:/.test(file)) {
    var ex = example(file);
    if (!ex.catalog) throw new Error(file + ' has no service catalog');
    return SC.syncOntology(ex.catalog, OM.normalize(ex.model));
  }
  if (!fs.existsSync(file)) throw new Error('No such file: ' + file);
  var raw = fs.readFileSync(file, 'utf8');
  var data = /\.json$/i.test(file) ? JSON.parse(raw) : SC.extractCatalog(raw);
  if (!SC.isCatalog(data)) throw new Error(file + ' is not a service catalog (is it an ontology? use the commands without "catalog")');
  var catalog = SC.normalize(data);
  if (catalog.view && catalog.view.filtered) {
    console.error('Warning: ' + file + ' is a filtered sub-domain view, not the full catalog.');
  }
  return catalog;
}

function write(out, text) {
  if (out) { fs.writeFileSync(out, text); console.error('Wrote ' + path.resolve(out)); }
  else process.stdout.write(text);
}

function catalogMain(argv) {
  var cmd = argv[0], file = argv[1];
  if (!cmd || !file) { console.error('Usage: node cli.js catalog <build|check|extract|service> <catalog> …'); return 1; }
  var rest = argv.slice(2);
  var catalog = readCatalog(file);
  var ontoArg = flag(rest, ['--ontology']);
  if (ontoArg) {
    var onto = readModel(ontoArg);
    if (!SC.sameCustomer(catalog, onto)) {
      console.error('Warning: the catalog was grounded in "' + catalog.ontology.customer + '" but ' + ontoArg +
                    ' is for "' + onto.meta.customer + '". Using it anyway.');
    }
    catalog = SC.syncOntology(catalog, onto);
  }
  var out = flag(rest, ['-o', '--out']);
  var sdArg = flag(rest, ['--subdomain', '--subdomains', '-s']);

  if (cmd === 'build') {
    if (sdArg) catalog = SC.filterCatalog(catalog, SC.resolveSubdomainKeys(catalog, sdArg));
    write(out, SC.toMarkdown(catalog));
    return 0;
  }
  if (cmd === 'extract') {
    write(out, JSON.stringify(catalog, null, 2) + '\n');
    return 0;
  }
  if (cmd === 'service') {
    var id = String(rest[0] || '').toUpperCase();
    var svc = catalog.services.filter(function (s) { return s.id === id; })[0];
    if (!svc) throw new Error('No service ' + (id || '(missing id)') + '. Defined: ' + catalog.services.map(function (s) { return s.id; }).join(', '));
    // Resolve references so an agent gets everything it needs in one payload.
    var o = catalog.ontology;
    function find(list, ref) { return list.filter(function (x) { return x.id === ref; })[0] || { id: ref, missing: true }; }
    write(flag(rest.slice(1), ['-o', '--out']), JSON.stringify({
      service: svc,
      resolved: {
        subdomains: svc.subdomains.map(function (r) { return find(o.subdomains, r); }),
        objects: svc.objects.map(function (r) { return find(o.objects, r); }),
        actions: svc.actions.map(function (r) { return find(o.actions, r); }),
        dependsOn: svc.dependsOn.map(function (r) {
          var d = find(catalog.services, r);
          return d.missing ? d : { id: d.id, name: d.name, summary: d.summary, status: d.status };
        })
      },
      catalog: { customer: catalog.meta.customer, version: catalog.meta.version, ontology: { customer: o.customer, version: o.version } }
    }, null, 2) + '\n');
    return 0;
  }
  if (cmd === 'check') {
    return report(SC.validate(catalog));
  }
  console.error('Unknown catalog command: ' + cmd);
  return 1;
}

function report(checks) {
  var failed = 0;
  checks.forEach(function (c) {
    if (!c.pass) failed++;
    console.log((c.pass ? '  ok  ' : ' FAIL ') + c.label + (c.pass || !c.detail ? '' : ' — ' + c.detail));
  });
  console.log('\n' + (checks.length - failed) + '/' + checks.length + ' checks passing');
  return failed ? 1 : 0;
}

function flag(args, names) {
  for (var i = 0; i < args.length; i++) if (names.indexOf(args[i]) !== -1) return args[i + 1];
  return null;
}

function main(argv) {
  var cmd = argv[0];
  var file = argv[1];
  if (cmd === 'catalog' && !['-h', '--help', 'help'].includes(file)) return catalogMain(argv.slice(1));
  if (!cmd || !file || ['-h', '--help', 'help'].includes(cmd) || cmd === 'catalog') {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].split('/*')[1].trim());
    return cmd ? 0 : 1;
  }
  var model = readModel(file);
  var out = flag(argv.slice(2), ['-o', '--out']);
  var sdArg = flag(argv.slice(2), ['--subdomain', '--subdomains', '-s']);

  if (cmd === 'build') {
    if (sdArg) model = OM.filterModel(model, OM.resolveSubdomainKeys(model, sdArg));
    var md = OM.toMarkdown(model);
    if (out) { fs.writeFileSync(out, md); console.error('Wrote ' + path.resolve(out)); }
    else process.stdout.write(md);
    return 0;
  }

  if (cmd === 'extract') {
    var json = JSON.stringify(model, null, 2) + '\n';
    if (out) { fs.writeFileSync(out, json); console.error('Wrote ' + path.resolve(out)); }
    else process.stdout.write(json);
    return 0;
  }

  if (cmd === 'subdomains') {
    if (!model.subdomains.length) { console.log('No sub-domains defined.'); return 0; }
    model.subdomains.forEach(function (sd) {
      var v = OM.filterModel(model, [sd.id]).view.shown;
      console.log((sd.code || sd.id) + '\t' + (sd.name || '') + '\n' +
        '    ' + v.objects + ' objects, ' + v.links + ' links, ' + v.actions + ' actions' +
        (sd.smes ? '\n    SMEs: ' + sd.smes : ''));
    });
    var untagged = model.objects.filter(function (o) { return !o.subdomains.length; }).length;
    if (untagged) console.log('\n' + untagged + ' object(s) untagged — build --subdomain untagged to list them');
    return 0;
  }

  if (cmd === 'check') {
    return report(OM.validate(model));
  }

  console.error('Unknown command: ' + cmd);
  return 1;
}

try {
  process.exit(main(process.argv.slice(2)));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
