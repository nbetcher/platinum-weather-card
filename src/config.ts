import { sectionNames } from './types.js';
import type { sectionType, WeatherCardConfig } from './types.js';

export const CURRENT_CONFIG_VERSION = 9;

const legacyAliases: Array<[string, string, ((value: any) => any)?]> = [
  ['static_icons', 'option_static_icons'],
  [
    'time_format',
    'option_time_format',
    (value) => {
      const format = String(value);
      if (format === '12' || format === '12hour') return '12hour';
      if (format === '24' || format === '24hour') return '24hour';
      return 'system';
    },
  ],
  ['locale', 'option_locale'],
  ['show_today_decimals', 'option_today_temperature_decimals'],
  ['show_decimals_pressure', 'option_pressure_decimals'],
  ['tooltips', 'option_tooltips'],
  ['show_beaufort', 'option_show_beaufort'],
  ['entity_daytime_high', 'entity_forecast_max'],
  ['entity_daytime_low', 'entity_forecast_min'],
  ['entity_current_conditions', 'entity_forecast_icon'],
  ['entity_current_text', 'entity_summary'],
  ['entity_daily_summary', 'entity_extended'],
  ['entity_forecast_high_temp_1', 'entity_forecast_max_1'],
  ['entity_forecast_low_temp_1', 'entity_forecast_min_1'],
  ['entity_possible_today', 'entity_pos'],
  ['entity_fire_danger_summary', 'entity_fire_danger'],
  ['show_decimals', 'option_show_overview_decimals'],
  ['show_separator', 'option_show_overview_separator'],
];

export const migrateWeatherCardConfig = (config: WeatherCardConfig): WeatherCardConfig => {
  const migrated: WeatherCardConfig = { ...config };

  for (const [oldKey, newKey, transform = (value) => value] of legacyAliases) {
    if (migrated[oldKey] !== undefined) {
      if (migrated[newKey] === undefined) {
        migrated[newKey] = transform(migrated[oldKey]);
      }
      delete migrated[oldKey];
    }
  }

  for (const slot of [
    'slot_l1',
    'slot_l2',
    'slot_l3',
    'slot_l4',
    'slot_l5',
    'slot_l6',
    'slot_l7',
    'slot_l8',
    'slot_r1',
    'slot_r2',
    'slot_r3',
    'slot_r4',
    'slot_r5',
    'slot_r6',
    'slot_r7',
    'slot_r8',
  ]) {
    if (migrated[slot] === 'daytime_high') migrated[slot] = 'forecast_max';
    if (migrated[slot] === 'daytime_low') migrated[slot] = 'forecast_min';
  }

  migrated.card_config_version = CURRENT_CONFIG_VERSION;
  return migrated;
};

export const normalizeSectionOrder = (value: unknown): sectionType[] => {
  const configuredOrder = Array.isArray(value) ? value : [];
  const knownSections = configuredOrder.filter(
    (section, index): section is sectionType =>
      typeof section === 'string' && sectionNames.includes(section as sectionType) && configuredOrder.indexOf(section) === index,
  );

  const missingSections = sectionNames.filter((section) => !knownSections.includes(section));
  return [
    ...(missingSections.includes('clock') ? (['clock'] as sectionType[]) : []),
    ...knownSections,
    ...missingSections.filter((section) => section !== 'clock'),
  ];
};

export const normalizeWeatherCardConfig = (config: WeatherCardConfig): WeatherCardConfig => {
  const migrated = migrateWeatherCardConfig(config);
  const normalized: WeatherCardConfig = {
    ...migrated,
    section_order: normalizeSectionOrder(migrated.section_order),
  };

  // In older raw YAML, an explicit partial order also selected which sections
  // existed. Complete the order for editor reordering without unexpectedly
  // making omitted sections visible after an upgrade.
  if (Array.isArray(migrated.section_order)) {
    const configuredSections = new Set(
      migrated.section_order.filter((section): section is sectionType => typeof section === 'string' && sectionNames.includes(section as sectionType)),
    );
    const visibilityKeys: Array<[sectionType, string]> = [
      ['overview', 'show_section_overview'],
      ['extended', 'show_section_extended'],
      ['slots', 'show_section_slots'],
      ['daily_forecast', 'show_section_daily_forecast'],
    ];
    for (const [section, key] of visibilityKeys) {
      if (!configuredSections.has(section) && normalized[key] === undefined) {
        normalized[key] = false;
      }
    }
  }

  return normalized;
};
