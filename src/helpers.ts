import { FrontendLocaleData, HomeAssistant, NumberFormat } from './ha-types.js';

export const getLocale = (hass: HomeAssistant): FrontendLocaleData =>
    hass.locale || {
        language: hass.language,
        number_format: NumberFormat.system,
    };
