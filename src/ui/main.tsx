import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { PRESETS, resolveParams, type Preset } from '../core';
import type { MainToUi, PluginState, SyncReport, UiToMain } from '../shared/messages';
import './styles.css';

const send = (msg: UiToMain) => parent.postMessage({ pluginMessage: msg }, '*');

type Tab = 'themes' | 'components' | 'checks' | 'handoff';
const TABS: { id: Tab; label: string }[] = [
  { id: 'themes', label: 'Themes' },
  { id: 'components', label: 'Components' },
  { id: 'checks', label: 'Checks' },
  { id: 'handoff', label: 'Handoff' },
];

const SWATCH_KEYS = ['bg_color', 'secondary_bg_color', 'text_color', 'hint_color', 'button_color', 'accent_text_color'] as const;

function Swatches({ preset }: { preset: Preset }) {
  const p = resolveParams(preset.params, preset.scheme).params;
  return (
    <span class="swatches">
      {SWATCH_KEYS.map((k) => (
        <span key={k} class="swatch" style={{ background: p[k] }} title={`${k} ${p[k]}`} />
      ))}
    </span>
  );
}

function ThemesTab({ state, report }: { state: PluginState; report: SyncReport | null }) {
  const connected = state.collection !== null;
  const inCollection = new Set(state.collection?.modes.map((m) => m.presetId));
  const canApply = connected && state.selection.themeable > 0;

  return (
    <div class="tab">
      <section class="card">
        <div class="row">
          <div>
            <div class="title">Telegram Theme</div>
            <div class="muted">
              {connected ? `${state.collection!.modes.length} themes · 15 variables` : 'Not connected in this file'}
            </div>
          </div>
          <button class={connected ? 'secondary' : 'primary'} onClick={() => send({ type: 'connect-theme' })}>
            {connected ? 'Update' : 'Connect'}
          </button>
        </div>
        {report && report.skippedPresets.length > 0 && (
          <div class="warn">
            Mode limit reached, skipped: {report.skippedPresets.join(', ')}. Your Figma plan allows fewer modes per
            collection.
          </div>
        )}
      </section>

      <div class="section-label">
        {canApply
          ? `Apply to ${state.selection.themeable} selected ${state.selection.themeable === 1 ? 'layer' : 'layers'}`
          : connected
            ? 'Select a frame to apply a theme'
            : 'Themes'}
      </div>
      <ul class="presets">
        {PRESETS.map((preset) => {
          const active = state.selection.presetId === preset.id;
          const available = inCollection.has(preset.id);
          return (
            <li key={preset.id}>
              <button
                class={`preset${active ? ' active' : ''}`}
                disabled={!canApply || !available}
                onClick={() => send({ type: 'apply-preset', presetId: preset.id })}
                title={preset.source}
              >
                <Swatches preset={preset} />
                <span class="preset-name">{preset.name}</span>
                {preset.draft && <span class="badge">DRAFT</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <p class="muted small">
        DRAFT themes use approximate colors. Capture real values with the sniffer page and update{' '}
        <code>presets/*.json</code>.
      </p>
    </div>
  );
}

function Placeholder({ what }: { what: string }) {
  return (
    <div class="tab">
      <p class="muted">{what} — coming next.</p>
    </div>
  );
}

function App() {
  const [tab, setTab] = useState<Tab>('themes');
  const [state, setState] = useState<PluginState | null>(null);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onmessage = (e: MessageEvent) => {
      const msg = e.data.pluginMessage as MainToUi | undefined;
      if (!msg) return;
      if (msg.type === 'state') {
        setState(msg.state);
        setError(null);
      } else if (msg.type === 'sync-done') setReport(msg.report);
      else if (msg.type === 'error') setError(msg.message);
    };
    send({ type: 'ready' });
  }, []);

  return (
    <div class="app">
      <nav class="tabs">
        {TABS.map((t) => (
          <button key={t.id} class={tab === t.id ? 'tab-btn on' : 'tab-btn'} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      {error && <div class="error">{error}</div>}
      {!state ? (
        <p class="muted pad">Loading…</p>
      ) : tab === 'themes' ? (
        <ThemesTab state={state} report={report} />
      ) : tab === 'components' ? (
        <Placeholder what="Telegram system components" />
      ) : tab === 'checks' ? (
        <Placeholder what="Unbound colors & contrast audit" />
      ) : (
        <Placeholder what="Copy for development" />
      )}
    </div>
  );
}

render(<App />, document.getElementById('app')!);
