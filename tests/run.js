// Regression tests for Wells.AI (run: `node tests/run.js`)
// Loads the app's inline <script>, stubs the DOM, and exercises the coding
// engine: live edit tool, TODO checklist, thinking blocks, model helpers,
// Gemini spend cap, and the fence parser.
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name); }
}

// 0. No NUL bytes, and every inline script parses.
ok('no NUL bytes in source', html.indexOf(String.fromCharCode(0)) === -1);
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
const blocks = [];
let m;
while ((m = re.exec(html)) !== null) blocks.push(m[1]);
let syntaxErrors = 0;
blocks.forEach((c, i) => {
  try { new Function(c); } catch (e) { syntaxErrors++; console.log('   script #' + (i + 1) + ' syntax: ' + e.message); }
});
ok('all inline scripts parse', syntaxErrors === 0);

// Load the main app script under DOM stubs.
const appScript = blocks[1];
const makeEl = () => new Proxy(function () {}, {
  get: (t, k) => k === 'classList' ? { add() {}, remove() {}, toggle() {}, contains: () => true } : makeEl(),
  apply: () => makeEl(), set: () => true,
});
const doc = new Proxy({}, {
  get: (t, k) => (k === 'getElementById' || k === 'querySelector') ? () => makeEl()
    : (k === 'querySelectorAll' ? () => [] : (k === 'addEventListener' ? () => {} : makeEl())),
});
const store = {};
const localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };

const wrapped = appScript + '\n;module.exports={' +
  'applyEditsFromReply,parseEditBlocks,renderTodoCard,renderEditCard,parseMarkdown,' +
  'canonicalLang,parseFenceInfo,langLabel,modelShortName,looksComplex,editSessionActive,' +
  'gemPence,loadGemSpend,saveGemSpend,GEMINI_LIMIT,ADAPTIVE_THINK_MODELS,' +
  'setFiles:(f)=>{canvasFiles=f;canvasActive=0;},getFiles:()=>canvasFiles};';
const fn = new Function('module', 'require', 'document', 'window', 'localStorage', 'navigator', 'alert', 'setInterval', 'clearInterval', 'setTimeout', wrapped);
const mod = { exports: {} };
fn(mod, require, doc, new Proxy({}, { get: () => () => {} }), localStorage, {}, () => {}, () => {}, () => {}, () => {});
const X = mod.exports;

console.log('\nLive edit tool');
X.setFiles([{ name: 'script.js', lang: 'javascript', code: 'const x = 1;\nconsole.log(x);' }]);
const applied = X.applyEditsFromReply('bump it\n```edit script.js\n<<<<<<< SEARCH\nconst x = 1;\n=======\nconst x = 42;\n>>>>>>> REPLACE\n```');
ok('applies one edit', applied === 1);
ok('edits the working copy in place', X.getFiles()[0].code === 'const x = 42;\nconsole.log(x);');
X.setFiles([{ name: 'a.js', lang: 'javascript', code: 'let a=1;' }]);
ok('appends when SEARCH is empty', X.applyEditsFromReply('```edit a.js\n<<<<<<< SEARCH\n=======\nlet b=2;\n>>>>>>> REPLACE\n```') === 1 && /let b=2;/.test(X.getFiles()[0].code));

console.log('\nTODO checklist');
ok('renders progress count', X.renderTodoCard('- [x] one\n- [ ] two\n- [ ] three').includes('1/3'));
ok('marks done items', X.renderTodoCard('- [x] done').includes('☑'));

console.log('\nThinking blocks');
const md = X.parseMarkdown('<thinking>\nplan the steps\n</thinking>\n\nHere is the answer', true);
ok('renders a Thought process card', md.includes('Thought process'));
ok('keeps the thinking text', md.includes('plan the steps'));
ok('no leftover sentinel', !md.includes('@@THINK@@'));

console.log('\nFence + coding fences');
ok('parses filename fences', X.parseFenceInfo('js app.js').filename === 'app.js');
ok('edit fence -> Edited card', X.parseMarkdown('```edit x.js\n<<<<<<< SEARCH\na\n=======\nb\n>>>>>>> REPLACE\n```', true).includes('Edited'));
ok('todo fence -> Plan card', X.parseMarkdown('```todo\n- [ ] step\n```', true).includes('Plan'));

console.log('\nModels');
ok('Opus 4.8 short name', X.modelShortName('claude-opus-4-8') === 'Opus 4.8');
ok('Fable 5 short name', X.modelShortName('claude-fable-5') === 'Fable 5');
ok('adaptive-think model list', X.ADAPTIVE_THINK_MODELS.includes('claude-opus-4-8') && X.ADAPTIVE_THINK_MODELS.includes('claude-fable-5'));
ok('looksComplex flags coding', X.looksComplex('build me a snake game') === true);
ok('looksComplex skips chit-chat', X.looksComplex('hi') === false);

console.log('\nGemini spend cap (~3p)');
ok('limit is ~3p ($0.038)', Math.abs(X.GEMINI_LIMIT - 0.038) < 1e-9);
X.saveGemSpend(0.019);
ok('pence display ~1.5p at half', Math.abs(X.gemPence(X.loadGemSpend()) - 1.5) < 0.01);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
