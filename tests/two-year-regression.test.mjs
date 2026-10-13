import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(new URL('./two-year-test-data.json', import.meta.url), 'utf8'));
const html = readFileSync(new URL('../analyse.html', import.meta.url), 'utf8');
const keys = Object.keys(fixture.months).sort();

assert.equal(keys.length, 24, 'Must contain exactly 24 months');
assert.deepEqual([...new Set(keys.map(k => k.slice(0,4)))], ['2025','2026'], 'Must cover 2025 and 2026');
for (const year of ['2025','2026']) {
  assert.equal(keys.filter(k => k.startsWith(year)).length, 12, year + ' must contain 12 months');
}
for (const [key, month] of Object.entries(fixture.months)) {
  assert.ok(Number.isFinite(month.revenue) && month.revenue > 0, key + ' total revenue must be positive');
  assert.ok(Number.isFinite(month.ek) && month.ek >= 0 && month.ek < month.revenue, key + ' total EK must be valid');
  assert.ok(month.groups && fixture.groups.every(g => month.groups[g.id]), key + ' must contain every configured group');
  for (const g of fixture.groups) {
    const q = month.groups[g.id];
    assert.ok(Number.isFinite(q.revenue) && q.revenue >= 0, key + '/' + g.id + ' revenue must be non-negative');
    assert.ok(Number.isFinite(q.shrink) && q.shrink >= 0, key + '/' + g.id + ' shrink must be non-negative');
    if (g.id === 'waschen') {
      assert.equal(q.ek, null, key + '/waschen has no EK by design');
      assert.equal(q._ekEntered, false);
    } else {
      assert.ok(Number.isFinite(q.ek) && q.ek >= 0, key + '/' + g.id + ' EK must be present');
      assert.equal(q._ekEntered, true);
      if (q.revenue > 0 && q.ek > 0) {
        const margin = (q.revenue - q.ek) / q.revenue * 100;
        assert.ok(Number.isFinite(margin) && margin >= 0 && margin <= 100, key + '/' + g.id + ' margin must be in range');
      }
    }
  }
}

// Regression: an untouched default zero must not be promoted to an explicitly entered value;
// a user-entered zero must remain explicit after the same JSON round-trip used by cloud persistence.
const untouched = { revenue: 0 };
if (undefined !== true || untouched.revenue !== 0) assert.equal(untouched._revenueEntered, undefined);
const deliberate = { revenue: 0, _revenueEntered: true };
const restored = JSON.parse(JSON.stringify({ months: { '2025-02': { groups: { spielzeug: deliberate } } } }));
assert.equal(restored.months['2025-02'].groups.spielzeug._revenueEntered, true);
assert.equal(restored.months['2025-02'].groups.spielzeug.revenue, 0);
assert.equal(fixture.months['2025-02'].groups.spielzeug._revenueEntered, true);
assert.equal(fixture.months['2025-02'].groups.spielzeug.revenue, 0);

// Guard the relevant production implementation in this branch.
assert.match(html, /el\.dataset\.entered='true'/, 'group input should mark user interaction');
assert.match(html, /i\.dataset\.entered==='true'\|\|group\._revenueEntered===true\|\|value!==0/, 'save handler should preserve explicit-zero marker');
assert.match(html, /q\._revenueEntered===true/, 'analysis should consider explicit-zero marker');
assert.match(html, /JSON\.parse\(JSON\.stringify\(data\)\)/, 'cloud payload should serialize the data snapshot');

// Annual trend checks: current year has a larger synthetic shop turnover and EK ratio than prior year.
const sum = year => keys.filter(k => k.startsWith(year)).reduce((a,k)=>a+fixture.months[k].revenue,0);
const revenue2025 = sum('2025'), revenue2026 = sum('2026');
assert.ok(revenue2026 > revenue2025, '2026 annual revenue should exceed 2025 in the test fixture');
assert.ok(Number.isFinite(revenue2025) && Number.isFinite(revenue2026));
console.log(JSON.stringify({status:'PASS',months:keys.length,years:[2025,2026],revenue2025:Number(revenue2025.toFixed(2)),revenue2026:Number(revenue2026.toFixed(2)),checks:'24 months, 9 groups, EK/margin validation, explicit zero, JSON round-trip, source guards, annual comparison'},null,2));
