// B UI: build the system component kit and insert instances into screens.
import { useState } from 'preact/hooks';
import { BAR_LAYOUTS, barArrangement, type BarLayout } from '../components/bottom-bar';
import { FULLSCREEN_LEFT, FULLSCREEN_TONES, type FullscreenLeft, type FullscreenTone } from '../components/fullscreen';
import { HEADER_COLORS, HEADER_LEFT, type HeaderColor, type HeaderLeft } from '../components/header';
import type { ComponentsReport, InsertRequest, PluginState } from '../shared/messages';
import { send } from './bridge';

type Kind = InsertRequest['kind'];
const KINDS: { id: Kind; label: string; hint: string }[] = [
  { id: 'header', label: 'Header', hint: 'Windowed mode · BackButton, setHeaderColor' },
  { id: 'bottom-bar', label: 'Bottom bar', hint: 'MainButton / SecondaryButton' },
  { id: 'fullscreen', label: 'Fullscreen', hint: 'Floating controls · requestFullscreen' },
];

const HEADER_COLOR_HINT: Record<HeaderColor, string> = {
  Header: 'header_bg_color (default)',
  Background: "setHeaderColor('bg_color')",
  Secondary: "setHeaderColor('secondary_bg_color')",
  'Custom dark': 'setHeaderColor(#hex), dark',
  'Custom light': 'setHeaderColor(#hex), light',
};

/** Tiny schematic of a bar layout: filled = Main, outlined = Secondary. */
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

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div class="segmented">
      {options.map((o) => (
        <button key={o} class={o === value ? 'on' : ''} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function ComponentsTab({ state, report }: { state: PluginState; report: ComponentsReport | null }) {
  const [kind, setKind] = useState<Kind>('header');
  const [layout, setLayout] = useState<BarLayout>('Main only');
  const [headerLeft, setHeaderLeft] = useState<HeaderLeft>('Close');
  const [headerColor, setHeaderColor] = useState<HeaderColor>('Header');
  const [fsLeft, setFsLeft] = useState<FullscreenLeft>('Close');
  const [fsTone, setFsTone] = useState<FullscreenTone>('Dark');
  const [guide, setGuide] = useState(true);
  const target = state.insertTarget;

  const request: InsertRequest =
    kind === 'header'
      ? { kind, left: headerLeft, color: headerColor }
      : kind === 'bottom-bar'
        ? { kind, layout }
        : { kind, left: fsLeft, tone: fsTone, guide };

  return (
    <div class="tab">
      <section class="card">
        <div class="row">
          <div>
            <div class="title">System components</div>
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
          Colors are bound to Telegram Theme. iOS sizes follow the official Telegram illustrations;{' '}
          <span class="badge">DRAFT</span> Android and Desktop are approximate.
        </p>
      </section>

      <section class="card matrix">
        <div class="kinds">
          {KINDS.map((k) => (
            <button key={k.id} class={kind === k.id ? 'kind on' : 'kind'} onClick={() => setKind(k.id)}>
              <span class="title">{k.label}</span>
              <span class="muted small">{k.hint}</span>
            </button>
          ))}
        </div>

        {kind === 'header' && (
          <div class="options">
            <label class="opt">
              <span class="muted">Left</span>
              <Segmented options={HEADER_LEFT} value={headerLeft} onChange={setHeaderLeft} />
            </label>
            <label class="opt">
              <span class="muted">Color</span>
              <select value={headerColor} onChange={(e) => setHeaderColor(e.currentTarget.value as HeaderColor)}>
                {HEADER_COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c} — {HEADER_COLOR_HINT[c]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {kind === 'bottom-bar' && (
          <div class="layouts">
            {BAR_LAYOUTS.map((l) => (
              <label key={l} class={layout === l ? 'layout on' : 'layout'}>
                <input type="radio" name="layout" checked={layout === l} onChange={() => setLayout(l)} />
                <LayoutIcon layout={l} />
                {l}
              </label>
            ))}
          </div>
        )}

        {kind === 'fullscreen' && (
          <div class="options">
            <label class="opt">
              <span class="muted">Left</span>
              <Segmented options={FULLSCREEN_LEFT} value={fsLeft} onChange={setFsLeft} />
            </label>
            <label class="opt">
              <span class="muted">Controls</span>
              <Segmented options={FULLSCREEN_TONES} value={fsTone} onChange={setFsTone} />
            </label>
            <label class="check">
              <input type="checkbox" checked={guide} onChange={(e) => setGuide(e.currentTarget.checked)} />
              Add safe area guide
            </label>
          </div>
        )}

        <button class="primary wide" disabled={!target} onClick={() => send({ type: 'insert', request })}>
          {target ? `Insert into “${target.name}” · ${target.platform}` : 'Select a screen to insert'}
        </button>
        <p class="muted small">
          States, labels and texts are set on the inserted instance in the right panel. Applying a theme switches
          the platform.
        </p>
      </section>
    </div>
  );
}
