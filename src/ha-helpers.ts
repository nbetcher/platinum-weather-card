/**
 * Home Assistant helper functions for custom card development.
 * These are small, self-contained helpers adapted from patterns used in the
 * Home Assistant frontend / ecosystem to avoid dependency on the abandoned
 * custom-card-helpers package.
 */

import type { HomeAssistant, ActionConfig, Lovelace, FrontendLocaleData } from './ha-types.js';

/**
 * Fire a custom DOM event
 */
export const fireEvent = <T = any>(
  node: HTMLElement | Window,
  type: string,
  detail?: T,
  options?: {
    bubbles?: boolean;
    cancelable?: boolean;
    composed?: boolean;
  },
): void => {
  const event = new CustomEvent(type, {
    bubbles: options?.bubbles ?? true,
    cancelable: options?.cancelable ?? false,
    composed: options?.composed ?? true,
    detail,
  });
  node.dispatchEvent(event);
};

/**
 * Create a debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false,
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) {
        func.apply(this, args);
      }
    };

    const callNow = immediate && !timeout;

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);

    if (callNow) {
      func.apply(this, args);
    }
  };
};

/**
 * Get the Lovelace instance
 */
export const getLovelace = (): Lovelace | null => {
  let root: any = document.querySelector('home-assistant');
  root = root && root.shadowRoot;
  root = root && root.querySelector('home-assistant-main');
  root = root && root.shadowRoot;
  root = root && root.querySelector('app-drawer-layout partial-panel-resolver, ha-drawer partial-panel-resolver');
  root = (root && root.shadowRoot) || root;
  root = root && root.querySelector('ha-panel-lovelace');
  root = root && root.shadowRoot;
  root = root && root.querySelector('hui-root');
  if (root) {
    const ll = root.lovelace;
    ll.current_view = root.___curView;
    return ll;
  }
  return null;
};

/**
 * Check if action is configured
 */
export const hasAction = (config: ActionConfig | undefined): boolean => {
  return config !== undefined && config.action !== 'none';
};

/**
 * Handle action execution
 */
export const handleAction = (
  node: HTMLElement,
  hass: HomeAssistant,
  config: {
    entity?: string;
    camera_image?: string;
    hold_action?: ActionConfig;
    tap_action?: ActionConfig;
    double_tap_action?: ActionConfig;
  },
  action: string,
): void => {
  let actionConfig: ActionConfig | undefined;

  if (action === 'double_tap' && config.double_tap_action) {
    actionConfig = config.double_tap_action;
  } else if (action === 'hold' && config.hold_action) {
    actionConfig = config.hold_action;
  } else if (action === 'tap' && config.tap_action) {
    actionConfig = config.tap_action;
  }

  if (!actionConfig) {
    actionConfig = {
      action: 'more-info',
    };
  }

  if (actionConfig.confirmation) {
    if (
      actionConfig.confirmation.exemptions &&
      actionConfig.confirmation.exemptions.some((e) => e.user === hass.user?.id)
    ) {
      // User is exempt from confirmation
    } else if (!confirm(actionConfig.confirmation.text || `Are you sure you want to ${actionConfig.action}?`)) {
      return;
    }
  }

  switch (actionConfig.action) {
    case 'more-info':
      if (config.entity || config.camera_image) {
        fireEvent(node, 'hass-more-info', {
          entityId: config.entity ?? config.camera_image,
        });
      }
      break;
    case 'navigate':
      if (actionConfig.navigation_path) {
        navigate(actionConfig.navigation_path);
      }
      break;
    case 'url':
      if (actionConfig.url_path) {
        window.open(actionConfig.url_path);
      }
      break;
    case 'toggle':
      if (config.entity) {
        toggleEntity(hass, config.entity);
      }
      break;
    case 'call-service': {
      if (!actionConfig.service) {
        return;
      }
      const [domain, service] = actionConfig.service.split('.', 2);
      hass.callService(domain, service, actionConfig.service_data, actionConfig.target);
      break;
    }
    case 'fire-dom-event':
      fireEvent(node, 'll-custom', actionConfig);
      break;
  }
};

/**
 * Navigate to a path
 */
export const navigate = (path: string, replace = false): void => {
  if (replace) {
    history.replaceState(null, '', path);
  } else {
    history.pushState(null, '', path);
  }
  const event = new CustomEvent('location-changed', {
    bubbles: true,
    composed: true,
    detail: { replace },
  });
  window.dispatchEvent(event);
};

/**
 * Toggle an entity
 */
export const toggleEntity = (hass: HomeAssistant, entityId: string): void => {
  const turnOn = ['closed', 'locked', 'off'].includes(hass.states[entityId]?.state);
  const stateDomain = entityId.split('.')[0];

  let serviceDomain = stateDomain;
  let service = turnOn ? 'turn_on' : 'turn_off';

  switch (stateDomain) {
    case 'lock':
      service = turnOn ? 'lock' : 'unlock';
      break;
    case 'cover':
      service = turnOn ? 'open_cover' : 'close_cover';
      break;
    case 'button':
    case 'input_button':
      service = 'press';
      break;
    case 'group':
      serviceDomain = 'homeassistant';
      break;
    case 'scene':
      service = 'turn_on';
      break;
    case 'valve':
      service = turnOn ? 'open_valve' : 'close_valve';
      break;
  }

  hass.callService(serviceDomain, service, { entity_id: entityId });
};

/**
 * Format a date
 */
export const formatDate = (date: Date, locale: FrontendLocaleData): string => {
  return date.toLocaleDateString(locale.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format a time
 */
export const formatTime = (date: Date, locale: FrontendLocaleData): string => {
  return date.toLocaleTimeString(locale.language, {
    hour: 'numeric',
    minute: '2-digit',
  });
};

/**
 * Format a date and time
 */
export const formatDateTime = (date: Date, locale: FrontendLocaleData): string => {
  return date.toLocaleString(locale.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};
