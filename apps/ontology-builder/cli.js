#!/usr/bin/env node
/*
 * Ontology Builder CLI — render or validate an ontology outside the browser,
 * so build pipelines and AI agents can regenerate the Markdown without a UI.
 *
 *   node cli.js build  <ontology.json|generated.md> [-o out.md]
 *   node cli.js check  <ontology.json|generated.md>   # exits 1 if any check fails
 *   node cli.js extract <generated.md> [-o out.json]  # Markdown -> canonical JSON
 */
'use strict';

var fs = require('fs');
var path = require('path');
var OM = require('./ontology-md.js');

function readModel(file) {
  var raw = fs.readFileSync(file, 'utf8');
  return /\.json$/i.test(file) ? JSON.parse(raw) : OM.extractModel(raw);
}

function outFlag(args) {
  var i = args.indexOf('-o');
  if (i === -1) i = args.indexOf('--out');
  return i === -1 ? null : args[i + 1];
}

function main(argv) {
  var cmd = argv[0];
  var file = argv[1];
  if (!cmd || !file || ['-h', '--help', 'help'].includes(cmd)) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].split('/*')[1].trim());
    return cmd ? 0 : 1;
  }
  if (!fs.existsSync(file)) { console.error('No such file: ' + file); return 1; }

  var model = readModel(file);
  var out = outFlag(argv.slice(2));

  if (cmd === 'build') {
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

process.exit(main(process.argv.slice(2)));
