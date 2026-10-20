// D UI: Telegram.WebApp snippet and CSS variables for the selected screen.
import { useState } from 'preact/hooks';
import type { HandoffResult, PluginState } from '../shared/messages';
import { send } from './bridge';

/** navigator.clipboard is blocked in Figma's plugin iframe; execCommand still works. */
function copy(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  return ok;
}

export function HandoffTab({ state, result }: { state: PluginState; result: HandoffResult | null }) {
  const [settings, setSettings] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const target = state.insertTarget;

  const doCopy = (what: string, text: string) => {
    if (copy(text)) {
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    }
  };

  return (
    <div class="tab">
      <section class="card">
        <div class="title">Copy for development</div>
        <div class="muted">
          JS for <code>Telegram.WebApp</code> from the system components on the screen.
        </div>
        <label class="check" style={{ margin: '10px 0' }}>
          <input type="checkbox" checked={settings} onChange={(e) => setSettings(e.currentTarget.checked)} />
          Settings item in the ⋯ menu (SettingsButton)
        </label>
        <button
          class="primary wide"
          disabled={!target}
          onClick={() => send({ type: 'handoff', settingsButton: settings })}
        >
          {target ? `Generate for “${target.name}”` : 'Select a screen'}
        </button>
      </section>

      {result && (
        <>
          <div class="section-label row">
            <span>
              {result.screenName}
              <span class="muted"> · {result.found.length ? result.found.join(', ') : 'no system components'}</span>
            </span>
            <button class="secondary" onClick={() => doCopy('js', result.snippet)}>
              {copied === 'js' ? 'Copied' : 'Copy JS'}
            </button>
          </div>
          <pre class="code">{result.snippet}</pre>

          {result.cssVars.length > 0 && (
            <>
              <div class="section-label row">
                <span>CSS variables used</span>
                <button class="secondary" onClick={() => doCopy('css', result.cssVars.join('\n'))}>
                  {copied === 'css' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre class="code">{result.cssVars.join('\n')}</pre>
            </>
          )}
          <p class="muted small">
            Colors bound to Telegram Theme need no code: the client fills <code>--tg-theme-*</code>. Only
            non-default header, bottom bar and button colors appear in the snippet.
          </p>
        </>
      )}
    </div>
  );
}
