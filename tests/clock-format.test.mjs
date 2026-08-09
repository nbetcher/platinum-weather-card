import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const sourcePath = fileURLToPath(new URL('../src/clock-format.ts', import.meta.url));
const source = await readFile(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const clock = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('formats explicit 12 and 24 hour clocks without inline seconds', () => {
  const afternoon = new Date('2026-08-08T13:05:07Z');

  assert.deepEqual(clock.formatClockTime(afternoon, '12hour', 'en-US', undefined, 'UTC'), {
    time: '1:05',
    period: 'PM',
    periodPosition: 'after',
  });
  assert.deepEqual(clock.formatClockTime(afternoon, '24hour', 'en-US', undefined, 'UTC'), {
    time: '13:05',
    period: '',
    periodPosition: 'after',
  });
});

test('preserves the native day-period position for prefix locales', () => {
  const afternoon = new Date('2026-08-08T13:05:07Z');
  const formatted = clock.formatClockTime(afternoon, '12hour', 'ja-JP', undefined, 'UTC');

  assert.equal(formatted.time, '1:05');
  assert.equal(formatted.period, '午後');
  assert.equal(formatted.periodPosition, 'before');
});

test('includes accessible seconds only when the seconds indicator is enabled', () => {
  const afternoon = new Date('2026-08-08T13:05:07Z');

  assert.equal(clock.formatClockAriaTime(afternoon, '24hour', 'en-US', undefined, 'UTC', false), '13:05');
  assert.equal(clock.formatClockAriaTime(afternoon, '24hour', 'en-US', undefined, 'UTC', true), '13:05:07');
});

test('uses 00 at midnight in explicit 24 hour mode', () => {
  const midnight = new Date('2026-08-08T00:04:09Z');
  assert.equal(clock.formatClockTime(midnight, '24hour', 'en-US', undefined, 'UTC').time, '00:04');
});

test('formats every numeric date preset with fixed padding', () => {
  const date = new Date('2024-02-29T12:00:00Z');
  const expected = new Map([
    ['MM/dd/yyyy', '02/29/2024'],
    ['MM/dd/yy', '02/29/24'],
    ['dd/MM/yyyy', '29/02/2024'],
    ['dd/MM/yy', '29/02/24'],
    ['yyyy-MM-dd', '2024-02-29'],
  ]);

  for (const [format, value] of expected) {
    assert.equal(clock.formatClockDate(date, format, 'en-US', 'UTC'), value);
  }
});

test('formats the compact and long named date presets', () => {
  const date = new Date('2026-08-08T12:00:00Z');
  assert.equal(clock.formatClockDate(date, 'DOW, Mon ##', 'en-US', 'UTC'), 'Sat, Aug 8');
  assert.equal(clock.formatClockDate(date, 'DOW, Month ##', 'en-US', 'UTC'), 'Sat, August 8');
  assert.equal(clock.formatClockDate(date, 'DOW, ## Mon', 'en-US', 'UTC'), 'Sat, 8 Aug');
  assert.equal(clock.formatClockDate(date, 'Mon ##, yyyy', 'en-US', 'UTC'), 'Aug 8, 2026');
  assert.equal(clock.formatClockDate(date, 'Month ##, yyyy', 'en-US', 'UTC'), 'August 8, 2026');
  assert.equal(clock.formatClockDate(date, '## Mon yyyy', 'en-US', 'UTC'), '8 Aug 2026');
});

test('falls back safely for an unknown raw-YAML date format', () => {
  const date = new Date('2026-08-08T12:00:00Z');
  assert.equal(clock.formatClockDate(date, 'not-a-format', 'en-US', 'UTC'), 'Sat, Aug 8');
});

test('keeps a valid locale when the configured time zone is invalid', () => {
  const date = new Date('2026-08-08T12:00:00Z');
  assert.match(clock.formatClockDate(date, 'DOW, Month ##', 'fr-FR', 'Invalid/Zone'), /^sam\./i);
});

test('aligns one-shot timers to fresh second and minute boundaries', () => {
  assert.equal(clock.millisecondsUntilNextClockTick(12_345, true), 675);
  assert.equal(clock.millisecondsUntilNextClockTick(12_345, false), 47_675);
  assert.equal(clock.millisecondsUntilNextClockTick(60_000, false), 60_020);
});
