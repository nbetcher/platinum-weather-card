import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const transpile = async (relativePath) => {
  const sourcePath = fileURLToPath(new URL(relativePath, import.meta.url));
  const source = await readFile(sourcePath, 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
};

const typesSource = await transpile('../src/types.ts');
const typesUrl = `data:text/javascript;base64,${Buffer.from(typesSource).toString('base64')}`;
const configSource = (await transpile('../src/config.ts')).replace('./types.js', typesUrl);
const config = await import(`data:text/javascript;base64,${Buffer.from(configSource).toString('base64')}`);

test('supplies every section for raw YAML without section_order', () => {
  assert.deepEqual(config.normalizeSectionOrder(undefined), ['clock', 'overview', 'extended', 'slots', 'daily_forecast']);
});

test('preserves valid order while filtering invalid and duplicate sections', () => {
  assert.deepEqual(config.normalizeSectionOrder(['slots', 'invalid', 'slots', 'overview']), ['clock', 'slots', 'overview', 'extended', 'daily_forecast']);
});

test('normalization clones the order and leaves the clock opt-in', () => {
  const source = {
    type: 'custom:platinum-weather-card',
    section_order: ['overview'],
  };
  const normalized = config.normalizeWeatherCardConfig(source);

  assert.notEqual(normalized.section_order, source.section_order);
  assert.equal(normalized.show_section_clock, undefined);
  assert.equal(normalized.card_config_version, 9);
});

test('an explicit partial order keeps omitted legacy sections hidden', () => {
  const normalized = config.normalizeWeatherCardConfig({
    type: 'custom:platinum-weather-card',
    section_order: ['overview'],
  });

  assert.deepEqual(normalized.section_order, ['clock', 'overview', 'extended', 'slots', 'daily_forecast']);
  assert.equal(normalized.show_section_overview, undefined);
  assert.equal(normalized.show_section_extended, false);
  assert.equal(normalized.show_section_slots, false);
  assert.equal(normalized.show_section_daily_forecast, false);
});

test('migrates false-valued legacy aliases and preserves unknown HA metadata', () => {
  const normalized = config.normalizeWeatherCardConfig({
    type: 'custom:platinum-weather-card',
    static_icons: false,
    show_today_decimals: false,
    view_layout: { grid_column: 'span 2' },
  });

  assert.equal(normalized.option_static_icons, false);
  assert.equal(normalized.option_today_temperature_decimals, false);
  assert.deepEqual(normalized.view_layout, { grid_column: 'span 2' });
  assert.equal('static_icons' in normalized, false);
  assert.equal('show_today_decimals' in normalized, false);
});

test('keeps an explicit modern value when a legacy alias is also present', () => {
  const normalized = config.normalizeWeatherCardConfig({
    type: 'custom:platinum-weather-card',
    static_icons: true,
    option_static_icons: false,
  });

  assert.equal(normalized.option_static_icons, false);
});

test('migrates numeric and string legacy time formats without guessing', () => {
  assert.equal(config.normalizeWeatherCardConfig({ time_format: 12 }).option_time_format, '12hour');
  assert.equal(config.normalizeWeatherCardConfig({ time_format: '24' }).option_time_format, '24hour');
  assert.equal(config.normalizeWeatherCardConfig({ time_format: 'system' }).option_time_format, 'system');
});
