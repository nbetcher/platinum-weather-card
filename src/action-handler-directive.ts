import { noChange } from 'lit';
import { AttributePart, directive, Directive, DirectiveParameters } from 'lit/directive.js';

import { ActionHandlerDetail, ActionHandlerOptions } from './ha-types.js';
import { fireEvent } from './ha-helpers.js';

const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const ACTION_HANDLER_TAG = 'action-handler-platinum-weather-card';

interface ActionHandler extends HTMLElement {
  holdTime: number;
  bind(element: Element, options): void;
}
interface ActionHandlerElement extends HTMLElement {
  actionHandler?: boolean;
  actionHandlerOptions?: ActionHandlerOptions;
}

declare global {
  interface HASSDomEvents {
    action: ActionHandlerDetail;
  }
}

class ActionHandler extends HTMLElement implements ActionHandler {
  public holdTime = 500;

  public ripple: any;

  protected timer?: number;

  protected held = false;

  protected interactionActive = false;

  private dblClickTimeout?: number;

  constructor() {
    super();
    this.ripple = document.createElement('mwc-ripple');
  }

  public connectedCallback(): void {
    Object.assign(this.style, {
      position: 'absolute',
      width: isTouch ? '100px' : '50px',
      height: isTouch ? '100px' : '50px',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: '999',
    });

    this.appendChild(this.ripple);
    this.ripple.primary = true;

    ['touchcancel', 'mouseout', 'mouseup', 'touchmove', 'mousewheel', 'wheel', 'scroll'].forEach((ev) => {
      document.addEventListener(
        ev,
        () => {
          clearTimeout(this.timer);
          this.stopAnimation();
          this.timer = undefined;
          this.interactionActive = false;
        },
        { passive: true },
      );
    });
  }

  public bind(element: ActionHandlerElement, options): void {
    // Lit calls the directive again when options change. Event listeners are
    // installed once, while handlers read this latest options object.
    element.actionHandlerOptions = options ?? {};
    if (element.actionHandler) {
      return;
    }
    element.actionHandler = true;

    element.addEventListener('contextmenu', (ev: Event) => {
      const e = ev || window.event;
      if (e.preventDefault) {
        e.preventDefault();
      }
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      e.cancelBubble = true;
      e.returnValue = false;
      return false;
    });

    const start = (ev: Event): void => {
      this.held = false;
      this.interactionActive = true;
      let x;
      let y;
      if ((ev as TouchEvent).touches) {
        x = (ev as TouchEvent).touches[0].pageX;
        y = (ev as TouchEvent).touches[0].pageY;
      } else {
        x = (ev as MouseEvent).pageX;
        y = (ev as MouseEvent).pageY;
      }

      if (element.actionHandlerOptions?.hasHold) {
        this.timer = window.setTimeout(() => {
          this.startAnimation(x, y);
          this.held = true;
        }, this.holdTime);
      }
    };

    const end = (ev: Event): void => {
      // Prevent mouse event if touch event
      ev.preventDefault();
      if (ev.type === 'touchcancel') {
        clearTimeout(this.timer);
        this.stopAnimation();
        this.timer = undefined;
        this.interactionActive = false;
        return;
      }
      if (ev.type === 'touchend' && !this.interactionActive) {
        return;
      }
      clearTimeout(this.timer);
      this.stopAnimation();
      this.timer = undefined;
      this.interactionActive = false;
      if (this.held) {
        fireEvent(element, 'action', { action: 'hold' });
      } else if (element.actionHandlerOptions?.hasDoubleClick) {
        if ((ev.type === 'click' && (ev as MouseEvent).detail < 2) || !this.dblClickTimeout) {
          this.dblClickTimeout = window.setTimeout(() => {
            this.dblClickTimeout = undefined;
            fireEvent(element, 'action', { action: 'tap' });
          }, 250);
        } else {
          clearTimeout(this.dblClickTimeout);
          this.dblClickTimeout = undefined;
          fireEvent(element, 'action', { action: 'double_tap' });
        }
      } else {
        fireEvent(element, 'action', { action: 'tap' });
      }
    };

    const handleEnter = (ev: KeyboardEvent): void => {
      if (ev.keyCode !== 13) {
        return;
      }
      end(ev);
    };

    element.addEventListener('touchstart', start, { passive: true });
    element.addEventListener('touchend', end);
    element.addEventListener('touchcancel', end);

    element.addEventListener('mousedown', start, { passive: true });
    element.addEventListener('click', end);

    element.addEventListener('keyup', handleEnter);
  }

  private startAnimation(x: number, y: number): void {
    Object.assign(this.style, {
      left: `${x}px`,
      top: `${y}px`,
      display: null,
    });
    this.ripple.disabled = false;
    this.ripple.active = true;
    this.ripple.unbounded = true;
  }

  private stopAnimation(): void {
    this.ripple.active = false;
    this.ripple.disabled = true;
    this.style.display = 'none';
  }
}

if (!customElements.get(ACTION_HANDLER_TAG)) {
  customElements.define(ACTION_HANDLER_TAG, ActionHandler);
}

const getActionHandler = (): ActionHandler => {
  const body = document.body;
  if (body.querySelector(ACTION_HANDLER_TAG)) {
    return body.querySelector(ACTION_HANDLER_TAG) as ActionHandler;
  }

  const actionhandler = document.createElement(ACTION_HANDLER_TAG);
  body.appendChild(actionhandler);

  return actionhandler as ActionHandler;
};

export const actionHandlerBind = (element: ActionHandlerElement, options?: ActionHandlerOptions): void => {
  const actionhandler: ActionHandler = getActionHandler();
  if (!actionhandler) {
    return;
  }
  actionhandler.bind(element, options);
};

export const actionHandler = directive(
  class extends Directive {
    update(part: AttributePart, [options]: DirectiveParameters<this>) {
      actionHandlerBind(part.element as ActionHandlerElement, options);
      return noChange;
    }

    render(_options?: ActionHandlerOptions) {}
  },
);
