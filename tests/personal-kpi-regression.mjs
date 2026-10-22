import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../analyse.html', import.meta.url), 'utf8');

function between(start, end) {
  const a = html.indexOf(start);
  assert.notEqual(a, -1, `Missing source marker: ${start}`);
  const b = html.indexOf(end, a + start.length);
  assert.notEqual(b, -1, `Missing end marker: ${end}`);
  return html.slice(a, b);
}

// Guard the real UI and existing persistence path, without logging into or writing to Supabase.
const personalPanel = between('function renderMeinMonat(){', 'document.querySelectorAll(\'[data-meinmonat-check]\')');
assert.match(personalPanel, /id="staffCostKpi"/);
assert.match(personalPanel, /mrow\(k\)\.staffCostsComplete===true/);
assert.match(personalPanel, /Number\(mrow\(k\)\.staffCosts\)>0/);
assert.match(personalPanel, /d\.gross>0/);
assert.match(personalPanel, /d\.gross\/Number\(mrow\(k\)\.staffCosts\)/);
assert.match(personalPanel, /Number\(mrow\(k\)\.staffCosts\)\/d\.gross\*100/);

// Month navigation must redraw the panel, otherwise the previous month's values could remain visible.
const monthHandler = between("$('month').onchange=", ";$('saveMonth').onclick=");
assert.match(monthHandler, /renderMeinMonat\(\)/);
assert.match(monthHandler, /fill\(\)/);

// Save path must preserve both values in the month row and invoke the established persistence flow.
const saveHandler = between("$('saveMonth').onclick=", ";['openingStock'");
assert.match(saveHandler, /r\.staffCosts=staffRaw===''\?null:Number\(staffRaw\)/);
assert.match(saveHandler, /r\.staffCostsComplete=\$('staffCostsComplete'\)\.checked/);
assert.match(saveHandler, /await persist\(\)/);
assert.match(html, /function saveLocal\(\)\{try\{localStorage\.setItem\('tse_current',JSON\.stringify\(data\)\)/);
assert.match(html, /async function persist\(\)\{saveLocal\(\);try\{await cloudSave\(\)/);

// Exercise representative arithmetic and display gates independently.
const cases = [
  { gross: 25000, staff: 10000, complete: true, visible: true, perEuro: 2.5, share: 40 },
  { gross: 25000, staff: 10000, complete: false, visible: false },
  { gross: 25000, staff: 0, complete: true, visible: false },
  { gross: 0, staff: 10000, complete: true, visible: false },
  { gross: -1, staff: 10000, complete: true, visible: false },
];
for (const c of cases) {
  const visible = c.complete === true && Number(c.staff) > 0 && c.gross > 0;
  assert.equal(visible, c.visible, JSON.stringify(c));
  if (visible) {
    assert.equal(c.gross / c.staff, c.perEuro);
    assert.equal(c.staff / c.gross * 100, c.share);
  }
}

console.log('PASS: Personal KPI source guards, month refresh, local/cloud save path, and 5 KPI arithmetic/gate cases.');
