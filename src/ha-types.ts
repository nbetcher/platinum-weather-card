/**
 * Home Assistant types for custom card development.
 * These types are a minimal subset based on Home Assistant frontend typings,
 * kept local to avoid dependency on the abandoned custom-card-helpers package.
 */

import type { HassEntities, HassConfig, HassUser, HassServices, HassServiceTarget } from 'home-assistant-js-websocket';

// Re-export types from home-assistant-js-websocket
export type { HassEntity, HassEntities, HassConfig, HassUser, HassServices, HassServiceTarget } from 'home-assistant-js-websocket';

// Number format options
export enum NumberFormat {
  language = 'language',
  system = 'system',
  comma_decimal = 'comma_decimal',
  decimal_comma = 'decimal_comma',
  space_comma = 'space_comma',
  none = 'none',
}

// Time format options
export enum TimeFormat {
  language = 'language',
  system = 'system',
  am_pm = '12',
  twenty_four = '24',
}

// Date format options
export enum DateFormat {
  language = 'language',
  system = 'system',
  DMY = 'DMY',
  MDY = 'MDY',
  YMD = 'YMD',
}

// First weekday options
export enum FirstWeekday {
  language = 'language',
  monday = 'monday',
  tuesday = 'tuesday',
  wednesday = 'wednesday',
  thursday = 'thursday',
  friday = 'friday',
  saturday = 'saturday',
  sunday = 'sunday',
}

// Time zone options
export enum TimeZone {
  local = 'local',
  server = 'server',
}

// Frontend locale data structure
export interface FrontendLocaleData {
  language: string;
  number_format: NumberFormat;
  time_format?: TimeFormat;
  date_format?: DateFormat;
  first_weekday?: FirstWeekday;
  time_zone?: TimeZone;
}

// Localize function type
export type LocalizeFunc = (key: string, ...args: any[]) => string;

// Main Home Assistant interface
export interface HomeAssistant {
  auth: {
    data: {
      hassUrl: string;
    };
  };
  connection: {
    haVersion: string;
  };
  connected: boolean;
  states: HassEntities;
  services: HassServices;
  config: HassConfig;
  themes: {
    default_theme: string;
    default_dark_theme: string | null;
    themes: Record<string, Record<string, string>>;
    darkMode: boolean;
    theme: string;
  };
  panels: Record<string, {
    component_name: string;
    config: Record<string, any> | null;
    icon: string | null;
    title: string | null;
    url_path: string;
  }>;
  panelUrl: string;
  language: string;
  selectedLanguage: string | null;
  locale: FrontendLocaleData;
  resources: Record<string, Record<string, string>>;
  localize: LocalizeFunc;
  translationMetadata: {
    fragments: string[];
    translations: Record<string, {
      hash: string;
      nativeName: string;
      isRTL: boolean;
    }>;
  };
  dockedSidebar: 'docked' | 'always_hidden' | 'auto';
  vibrate: boolean;
  debugConnection: boolean;
  suspendWhenHidden: boolean;
  enableShortcuts: boolean;
  moreInfoEntityId: string | null;
  user?: HassUser;
  userData?: {
    showAdvanced: boolean;
  };
  hassUrl(path?: string): string;
  callService(
    domain: string,
    service: string,
    serviceData?: Record<string, any>,
    target?: HassServiceTarget,
    notifyOnError?: boolean,
    returnResponse?: boolean,
  ): Promise<any>;
  callApi<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    parameters?: Record<string, any>,
    headers?: Record<string, string>,
  ): Promise<T>;
  fetchWithAuth(path: string, init?: RequestInit): Promise<Response>;
  sendWS(msg: any): void;
  callWS<T>(msg: any): Promise<T>;
  formatEntityState(stateObj: any, state?: string): string;
  formatEntityAttributeValue(stateObj: any, attribute: string, value?: any): string;
  formatEntityAttributeName(stateObj: any, attribute: string): string;
}

// Lovelace types
export interface LovelaceCardConfig {
  index?: number;
  view_index?: number;
  view_layout?: any;
  type: string;
  [key: string]: any;
}

export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  isPanel?: boolean;
  editMode?: boolean;
  getCardSize(): number | Promise<number>;
  setConfig(config: LovelaceCardConfig): void;
}

export interface LovelaceCardEditor extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceCardConfig): void;
}

export interface Lovelace {
  config: {
    background?: string;
    views: Array<{
      cards?: LovelaceCardConfig[];
      [key: string]: any;
    }>;
    [key: string]: any;
  };
  editMode: boolean;
  urlPath: string | null;
  mode: 'generated' | 'yaml' | 'storage';
  locale: FrontendLocaleData;
  enableFullEditMode(): void;
  setEditMode(editMode: boolean): void;
  saveConfig(newConfig: any): Promise<void>;
  deleteConfig(): Promise<void>;
}

// Action types
export interface ActionConfig {
  action: 'none' | 'toggle' | 'call-service' | 'navigate' | 'url' | 'more-info' | 'fire-dom-event';
  navigation_path?: string;
  url_path?: string;
  service?: string;
  service_data?: Record<string, any>;
  target?: HassServiceTarget;
  confirmation?: {
    exemptions?: Array<{ user: string }>;
    text?: string;
  };
}

export interface ActionHandlerDetail {
  action: 'tap' | 'hold' | 'double_tap';
}

export interface ActionHandlerOptions {
  hasHold?: boolean;
  hasDoubleClick?: boolean;
  disabled?: boolean;
}

// Event type for action handler
export type ActionHandlerEvent = CustomEvent<ActionHandlerDetail>;
