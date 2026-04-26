import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scriptMatch = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/);

assert.ok(scriptMatch, 'index.html should contain one inline script');

const script = scriptMatch[1];
new vm.Script(script, { filename: 'index.html inline script' });

const context = vm.createContext({
  console,
  document: {
    addEventListener() {},
    querySelector() {
      throw new Error('DOM query was not expected during model tests');
    },
    querySelectorAll() {
      throw new Error('DOM query was not expected during model tests');
    }
  },
  window: {
    location: { href: 'http://example.test/index.html', search: '' },
    innerHeight: 768,
    innerWidth: 1024,
    addEventListener() {}
  },
  URL,
  URLSearchParams,
  Math,
  Number,
  String,
  Array,
  Object,
  Boolean,
  Set,
  Map,
  setTimeout() {
    return 0;
  },
  clearTimeout() {},
  setInterval() {
    return 0;
  },
  clearInterval() {},
  requestAnimationFrame() {
    return 0;
  },
  performance: { now: () => 0 },
  IntersectionObserver: class {
    observe() {}
    unobserve() {}
  },
  devicePixelRatio: 1
});

vm.runInContext(
  `${script}
globalThis.__commissionerApi = {
  normalizeCommissionerInputs,
  deriveLeagueParameters,
  simulateExpectedCommissionerOutcomes,
  simulateExampleCommissionerEra,
  simulateCommissionerEra,
  seriesWinProbability
};`,
  context,
  { filename: 'index.html inline script' }
);

const api = context.__commissionerApi;
const eps = 1e-12;
const plain = value => JSON.parse(JSON.stringify(value));

for (const name of [
  'normalizeCommissionerInputs',
  'deriveLeagueParameters',
  'simulateExpectedCommissionerOutcomes',
  'simulateExampleCommissionerEra',
  'simulateCommissionerEra',
  'seriesWinProbability'
]) {
  assert.equal(typeof api[name], 'function', `${name} should be exposed by the app script`);
}

assert.match(html, /Expected top-seed title rate/);
assert.match(html, /Headlines are expected values across deterministic scenario samples/);
assert.match(html, /Example era:/);

for (const key of ['cm', 'tm', 'gm', 'sg', 'st', 'pa', 'dr', 'pt', 'bo', 'yr']) {
  assert.ok(script.includes(`searchParams.set('${key}'`), `share URL should encode ${key}`);
}

for (const key of ['tm', 'gm', 'sg', 'st', 'pa', 'dr', 'pt', 'bo', 'yr']) {
  assert.ok(script.includes(`num('${key}'`), `share URL hydration should read ${key}`);
}

assert.deepEqual(
  plain(api.normalizeCommissionerInputs({
    teams: 99,
    games: 1,
    scoring: 999,
    star: 99,
    parity: -99,
    draw: 9,
    playoffTeams: 99,
    series: 99,
    years: 1
  })),
  {
    teams: 40,
    games: 17,
    scoring: 120,
    star: 10,
    parity: 1,
    draw: 0.32,
    playoffTeams: 24,
    series: 7,
    years: 25
  }
);

assert.equal(api.seriesWinProbability(0.6, 1), 0.6);
assert.ok(Math.abs(api.seriesWinProbability(0.5, 7) - 0.5) < eps);
assert.ok(api.seriesWinProbability(0.6, 3) > api.seriesWinProbability(0.6, 1));
assert.ok(api.seriesWinProbability(0.6, 5) > api.seriesWinProbability(0.6, 3));
assert.ok(api.seriesWinProbability(0.6, 7) > api.seriesWinProbability(0.6, 5));

const defaults = {
  teams: 30,
  games: 82,
  scoring: 102,
  star: 9.2,
  parity: 5.4,
  draw: 0,
  playoffTeams: 16,
  series: 7,
  years: 50
};

function inputs(overrides = {}) {
  return api.normalizeCommissionerInputs({ ...defaults, ...overrides });
}

function expected(overrides = {}) {
  const normalized = inputs(overrides);
  const params = api.deriveLeagueParameters(normalized);
  return api.simulateExpectedCommissionerOutcomes(normalized, params);
}

function range(start, end, step = 1) {
  const values = [];
  for (let value = start; value <= end + eps; value += step) {
    values.push(Number(value.toFixed(10)));
  }
  return values;
}

function assertMonotonic({ label, values, metric, direction, override }) {
  let previous;
  for (const value of values) {
    const current = expected(override(value))[metric];
    assert.equal(Number.isFinite(current), true, `${label} produced a finite ${metric}`);
    if (previous == null) {
      previous = { value, current };
      continue;
    }
    if (direction === 'up') {
      assert.ok(
        current + eps >= previous.current,
        `${label} should not decrease ${metric}: ${previous.value} -> ${value} (${previous.current} -> ${current})`
      );
    } else {
      assert.ok(
        current <= previous.current + eps,
        `${label} should not increase ${metric}: ${previous.value} -> ${value} (${previous.current} -> ${current})`
      );
    }
    previous = { value, current };
  }
}

assertMonotonic({
  label: 'scoring signal',
  values: range(2, 120),
  metric: 'topSeedTitleRate',
  direction: 'up',
  override: value => ({ scoring: value })
});

assertMonotonic({
  label: 'star leverage title rate',
  values: range(1, 10, 0.1),
  metric: 'topSeedTitleRate',
  direction: 'up',
  override: value => ({ star: value })
});

assertMonotonic({
  label: 'star leverage dynasty score',
  values: range(1, 10, 0.1),
  metric: 'dynastyScore',
  direction: 'up',
  override: value => ({ star: value })
});

assertMonotonic({
  label: 'parity dynasty score',
  values: range(1, 10, 0.1),
  metric: 'dynastyScore',
  direction: 'down',
  override: value => ({ parity: value })
});

assertMonotonic({
  label: 'parity max titles',
  values: range(1, 10, 0.1),
  metric: 'maxTitles',
  direction: 'down',
  override: value => ({ parity: value })
});

assertMonotonic({
  label: 'draw rate dominant season',
  values: range(0, 0.32, 0.01),
  metric: 'dominantWinPct',
  direction: 'down',
  override: value => ({ draw: value })
});

assertMonotonic({
  label: 'playoff teams title rate',
  values: range(2, 24),
  metric: 'topSeedTitleRate',
  direction: 'down',
  override: value => ({ playoffTeams: value })
});

assertMonotonic({
  label: 'series length title rate',
  values: [1, 3, 5, 7],
  metric: 'topSeedTitleRate',
  direction: 'up',
  override: value => ({ series: value })
});

function assertFiniteNumbers(value, path = 'value') {
  if (typeof value === 'number') {
    assert.equal(Number.isFinite(value), true, `${path} should be finite`);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assertFiniteNumbers(child, `${path}.${key}`);
  }
}

for (const raw of [
  { teams: 8, games: 17, scoring: 2, star: 1, parity: 10, draw: 0.32, playoffTeams: 2, series: 1, years: 25 },
  { teams: 40, games: 162, scoring: 120, star: 10, parity: 1, draw: 0, playoffTeams: 24, series: 7, years: 100 },
  { teams: 40, games: 17, scoring: 120, star: 10, parity: 1, draw: 0.32, playoffTeams: 24, series: 7, years: 25 }
]) {
  const normalized = inputs(raw);
  const result = api.simulateCommissionerEra(normalized);
  assert.equal(result.seasons.length, normalized.years);
  assert.equal(result.teams.length, normalized.teams);
  assert.equal(result.stats.length, normalized.teams);
  assert.equal(result.topStats.length, normalized.teams);
  assert.ok(result.teams.every(team => !/^Club \d+$/.test(team.name)), 'example teams should use named franchises');
  assert.ok(result.expected.topSeedTitleRate >= 0 && result.expected.topSeedTitleRate <= 1);
  assert.ok(result.expected.dominantWinPct >= 0 && result.expected.dominantWinPct <= 1);
  assert.ok(result.expected.maxTitles >= 1 && result.expected.maxTitles <= normalized.years);
  assertFiniteNumbers(result.expected, 'expected');
}

function eraSignature(result) {
  return {
    expected: result.expected,
    seasons: result.seasons.map(season => [
      season.season,
      season.champion.id,
      season.bestTeam.id,
      season.bestRecord,
      Number(season.bestWinPct.toFixed(12))
    ]),
    topStats: result.topStats.map(stat => [stat.team.id, stat.titles, stat.bestSeasons])
  };
}

const repeatInputs = inputs();
assert.deepEqual(
  eraSignature(api.simulateCommissionerEra(repeatInputs)),
  eraSignature(api.simulateCommissionerEra(repeatInputs)),
  'same Commissioner settings should generate a deterministic example era'
);

console.log('Commissioner model tests passed');
