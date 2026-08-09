import { LitElement, html, css, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { clockDateFormat, timeFormat } from './types.js';
import type { ClockTimeParts } from './clock-format.js';
import { DEFAULT_CLOCK_DATE_FORMAT, formatClockAriaTime, formatClockDate, formatClockTime, millisecondsUntilNextClockTick } from './clock-format.js';

declare global {
  interface HTMLElementTagNameMap {
    'platinum-weather-clock': PlatinumWeatherClock;
  }
}

@customElement('platinum-weather-clock')
export class PlatinumWeatherClock extends LitElement {
  @property({ attribute: false }) public timeFormat: timeFormat = 'system';
  @property({ attribute: false }) public systemTimeFormat?: string;
  @property({ attribute: false }) public dateFormat: clockDateFormat = DEFAULT_CLOCK_DATE_FORMAT;
  @property({ attribute: false }) public locale?: string;
  @property({ attribute: false }) public timeZone?: string;
  @property({ type: Boolean, attribute: 'show-seconds' }) public showSeconds = false;

  @state() private _nowMs = Date.now();
  private _timer?: number;
  private _timeCache?: { key: string; value: ClockTimeParts };
  private _dateCache?: { key: string; value: string };

  private readonly _pageBecameActive = (): void => {
    if (document.visibilityState === 'hidden') {
      this._clearTimer();
      return;
    }
    this._resync();
  };

  public connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('visibilitychange', this._pageBecameActive);
    window.addEventListener('pageshow', this._pageBecameActive);
    this._resync();
  }

  public disconnectedCallback(): void {
    this._clearTimer();
    document.removeEventListener('visibilitychange', this._pageBecameActive);
    window.removeEventListener('pageshow', this._pageBecameActive);
    super.disconnectedCallback();
  }

  protected updated(changedProps: PropertyValues<this>): void {
    // The initial cadence is scheduled by connectedCallback. A later seconds
    // toggle changes the boundary from minute to second (or vice versa).
    if (changedProps.has('showSeconds') && changedProps.get('showSeconds') !== undefined) {
      this._resync();
    }
  }

  private _clearTimer(): void {
    if (this._timer !== undefined) {
      window.clearTimeout(this._timer);
      this._timer = undefined;
    }
  }

  private _resync(): void {
    this._clearTimer();
    this._nowMs = Date.now();
    if (this.isConnected && document.visibilityState !== 'hidden') {
      this._scheduleNextTick();
    }
  }

  private _scheduleNextTick(): void {
    if (!this.isConnected || document.visibilityState === 'hidden') {
      return;
    }
    const delay = millisecondsUntilNextClockTick(Date.now(), this.showSeconds);
    this._timer = window.setTimeout(() => {
      this._timer = undefined;
      if (!this.isConnected || document.visibilityState === 'hidden') {
        return;
      }
      // Always resample wall time. A delayed callback therefore corrects on
      // this tick instead of accumulating drift like setInterval/counter code.
      this._nowMs = Date.now();
      this._scheduleNextTick();
    }, delay);
  }

  private _formattedTime(now: Date): ClockTimeParts {
    const key = [Math.floor(this._nowMs / 60_000), this.timeFormat, this.systemTimeFormat, this.locale, this.timeZone].join('|');
    if (this._timeCache?.key !== key) {
      this._timeCache = {
        key,
        value: formatClockTime(now, this.timeFormat, this.locale, this.systemTimeFormat, this.timeZone),
      };
    }
    return this._timeCache.value;
  }

  private _formattedDate(now: Date): string {
    const key = [Math.floor(this._nowMs / 60_000), this.dateFormat, this.locale, this.timeZone].join('|');
    if (this._dateCache?.key !== key) {
      this._dateCache = {
        key,
        value: formatClockDate(now, this.dateFormat, this.locale, this.timeZone),
      };
    }
    return this._dateCache.value;
  }

  protected render(): TemplateResult {
    const now = new Date(this._nowMs);
    const { time, period, periodPosition } = this._formattedTime(now);
    const date = this._formattedDate(now);
    const seconds = now.getSeconds();
    const secondsText = String(seconds).padStart(2, '0');
    const secondsProgress = 100 - (seconds / 60) * 100;
    const ariaTime = formatClockAriaTime(now, this.timeFormat, this.locale, this.systemTimeFormat, this.timeZone, this.showSeconds);
    const indicatorPosition = period ? periodPosition : 'after';
    const indicator = this.showSeconds
      ? html`
          <span class="indicator-stack indicator-${indicatorPosition}">
            <span class="seconds" title="${secondsText} seconds" aria-hidden="true">
              <svg viewBox="0 0 22 22" focusable="false">
                <g class="seconds-rings" transform="rotate(-90 11 11)">
                  <circle class="seconds-track" cx="11" cy="11" r="9.25" pathLength="100"></circle>
                  <circle
                    class="seconds-progress"
                    cx="11"
                    cy="11"
                    r="9.25"
                    pathLength="100"
                    stroke-dasharray="100"
                    stroke-dashoffset=${secondsProgress}
                  ></circle>
                </g>
                <text class="seconds-value" x="11" y="11" text-anchor="middle" dominant-baseline="central">${secondsText}</text>
              </svg>
            </span>
            ${period ? html`<span class="period">${period}</span>` : ''}
          </span>
        `
      : period
        ? html`<span class="period period-${periodPosition}">${period}</span>`
        : '';

    return html`
      <div class="clock" role="timer" aria-live="off" aria-label=${date ? `${date}, ${ariaTime}` : ariaTime}>
        <div class="time-row">
          ${indicatorPosition === 'before' ? indicator : ''}
          <span class="time">${time}</span>
          ${indicatorPosition === 'after' ? indicator : ''}
        </div>
        ${date ? html`<div class="date">${date}</div>` : ''}
      </div>
    `;
  }

  public static styles = css`
    :host {
      display: inline-flex;
      color: var(--primary-text-color);
      font-family: inherit;
      contain: style paint;
    }
    .clock {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .time-row {
      display: flex;
      align-items: baseline;
      line-height: 1;
      white-space: nowrap;
      direction: ltr;
      unicode-bidi: isolate;
    }
    .time {
      font-size: 2.35em;
      font-weight: 300;
      letter-spacing: -0.035em;
      font-variant-numeric: tabular-nums;
    }
    .period {
      color: var(--secondary-text-color);
      font-size: 0.7em;
      font-weight: 500;
      letter-spacing: 0.055em;
      text-transform: uppercase;
    }
    .period-after,
    .indicator-after {
      margin-left: 0.35em;
    }
    .period-before {
      margin-right: 0.35em;
    }
    .indicator-before {
      margin-right: 0.35em;
    }
    .indicator-stack {
      display: inline-flex;
      flex-direction: column;
      align-self: center;
      align-items: center;
      gap: 1px;
      line-height: 1;
    }
    .seconds {
      display: block;
      width: 22px;
      height: 22px;
      color: var(--primary-color, var(--accent-color));
      font-variant-numeric: tabular-nums;
    }
    .seconds svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .seconds-track,
    .seconds-progress {
      fill: none;
      stroke-width: 1.25;
    }
    .seconds-track {
      stroke: var(--divider-color, rgba(127, 127, 127, 0.25));
    }
    .seconds-progress {
      stroke: currentColor;
      stroke-linecap: round;
      transition: stroke-dashoffset 160ms linear;
    }
    .seconds-value {
      fill: var(--secondary-text-color);
      font-size: 0.7em;
      font-weight: 500;
      letter-spacing: 0;
      pointer-events: none;
    }
    .date {
      margin-top: 4px;
      color: var(--secondary-text-color);
      font-size: 0.82em;
      font-weight: 400;
      letter-spacing: 0.025em;
      line-height: 1.25;
      white-space: nowrap;
    }
    @media (prefers-reduced-motion: reduce) {
      .seconds-progress {
        transition: none;
      }
    }
  `;
}
