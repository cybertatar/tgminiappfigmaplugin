// B UI: build the system component kit and insert instances into screens.
import { useState } from 'preact/hooks';
import { BAR_LAYOUTS, barArrangement, type BarLayout } from '../components/bottom-bar';
import type { ComponentsReport, PluginState } from '../shared/messages';
import { send } from './bridge';

/** Tiny schematic of a bar layout: M = Main, S = Secondary. */
function LayoutIcon({ layout }: { layout: BarLayout }) {
  const { direction, order } = barArrangement(layout);
  return (
    <span class={`layout-icon ${direction === 'VERTICAL' ? 'v' : 'h'}`}>
      {order.map((t) => (
        <span key={t} class={t === 'Main' ? 'm' : 's'} />
      ))}
    </span>
  );
}

export function ComponentsTab({ state, report }: { state: PluginState; report: ComponentsReport | null }) {
  const [layout, setLayout] = useState<BarLayout>('Main only');
  const target = state.insertTarget;

  return (
    <div class="tab">
      <section class="card">
        <div class="row">
          <div>
            <div class="title">
              System components <span class="badge">DRAFT</span>
            </div>
            <div class="muted">
              {state.componentsReady ? 'On the “TG System Components” page' : 'Not created in this file yet'}
            </div>
          </div>
          <button
            class={state.componentsReady ? 'secondary' : 'primary'}
            onClick={() => send({ type: 'build-components' })}
          >
            {state.componentsReady ? 'Update' : 'Create'}
          </button>
        </div>
        {report && report.fontWarnings.length > 0 && (
          <div class="warn">
            {report.fontWarnings.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
        )}
        <p class="muted small">
          Colors are bound to Telegram Theme. Sizes are approximate until checked against client screenshots.
        </p>
      </section>

      <section class="card matrix">
        <div class="title">Bottom bar</div>
        <div class="muted">MainButton / SecondaryButton</div>
        <div class="layouts">
          {BAR_LAYOUTS.map((l) => (
            <label key={l} class={layout === l ? 'layout on' : 'layout'}>
              <input type="radio" name="layout" checked={layout === l} onChange={() => setLayout(l)} />
              <LayoutIcon layout={l} />
              {l}
            </label>
          ))}
        </div>
        <button
          class="primary wide"
          disabled={!target}
          onClick={() => send({ type: 'insert-bottom-bar', layout })}
        >
          {target ? `Insert into “${target.name}” · ${target.platform}` : 'Select a screen to insert'}
        </button>
        <p class="muted small">
          Button states (Pressed, Inactive, Loading, Shine) and labels are set on the inserted instance in the right
          panel. Applying a theme switches the platform.
        </p>
      </section>
    </div>
  );
}
