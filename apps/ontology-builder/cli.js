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
 */
'use strict';

var fs = require('fs');
var path = require('path');
var OM = require('./ontology-md.js');

function readModel(file) {
  if (/^example:/.test(file)) {
    var examples = require('./examples.js');
    var ex = examples[file.slice('example:'.length)];
    if (!ex) throw new Error('No such example. Available: ' + Object.keys(examples).map(function (k) { return 'example:' + k; }).join(', '));
    return OM.normalize(ex.model);
  }
  if (!fs.existsSync(file)) throw new Error('No such file: ' + file);
  var raw = fs.readFileSync(file, 'utf8');
  var model = OM.normalize(/\.json$/i.test(file) ? JSON.parse(raw) : OM.extractModel(raw));
  if (model.view && model.view.filtered) {
    console.error('Warning: ' + file + ' is a filtered sub-domain view, not the full document.');
  }
  return model;
}

function flag(args, names) {
  for (var i = 0; i < args.length; i++) if (names.indexOf(args[i]) !== -1) return args[i + 1];
  return null;
}

function main(argv) {
  var cmd = argv[0];
  var file = argv[1];
  if (!cmd || !file || ['-h', '--help', 'help'].includes(cmd)) {
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
    var checks = OM.validate(model);
    var failed = 0;
    checks.forEach(function (c) {
      if (!c.pass) failed++;
      console.log((c.pass ? '  ok  ' : ' FAIL ') + c.label + (c.pass || !c.detail ? '' : ' — ' + c.detail));
    });
    console.log('\n' + (checks.length - failed) + '/' + checks.length + ' checks passing');
    return failed ? 1 : 0;
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
