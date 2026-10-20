// C2 UI: text layers × themes contrast table.
import { PRESETS } from '../core';
import type { ContrastResult, PluginState } from '../shared/messages';
import { send } from './bridge';

const SHORT: Record<string, string> = {
  'ios-light': 'iOS L',
  'ios-dark': 'iOS D',
  'android-light': 'And L',
  'android-dark': 'And D',
  'desktop-dark': 'Desk D',
  stress: 'Stress',
};

export function ContrastView({ state, result }: { state: PluginState; result: ContrastResult | null }) {
  const connected = state.collection !== null;
  const failingRows = result?.rows.filter((r) => r.failing > 0).length ?? 0;

  return (
    <div>
      <div class="row">
        <div>
          <div class="title">Contrast in every theme</div>
          <div class="muted small">WCAG 2.1 AA: 4.5 for text, 3 for large text</div>
        </div>
        <button class="secondary" disabled={!connected} onClick={() => send({ type: 'contrast' })}>
          {result ? 'Check again' : 'Check selection'}
        </button>
      </div>
      {!connected && <div class="warn">Connect Telegram Theme on the Themes tab first.</div>}

      {result && (
        <>
          <p class={failingRows ? 'warn' : 'ok'}>
            {result.rows.length === 0
              ? 'No text layers with a solid background found.'
              : failingRows
                ? `${failingRows} of ${result.rows.length} text layers are hard to read in some theme.`
                : `All ${result.rows.length} text layers pass in every theme.`}
          </p>
          {result.rows.length > 0 && (
            <div class="table-wrap">
              <table class="contrast">
                <thead>
                  <tr>
                    <th>Layer</th>
                    {result.presetIds.map((id) => (
                      <th key={id} title={PRESETS.find((p) => p.id === id)?.name}>
                        {SHORT[id] ?? id}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.nodeId} onClick={() => send({ type: 'select-node', nodeId: row.nodeId })}>
                      <td class="layer" title={row.text}>
                        <div class="names">{row.name}</div>
                        <div class="muted small names">
                          {row.large ? 'large · ' : ''}
                          {row.text}
                        </div>
                      </td>
                      {row.ratios.map((r, i) => (
                        <td key={i} class={r === null ? 'na' : r < row.threshold ? 'bad' : 'good'}>
                          {r === null ? '—' : r.toFixed(1)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div class="stats small muted">
            <div>
              {result.checked} text layers checked{result.truncated ? ' (limit reached, select less)' : ''}
            </div>
            {result.skipped.noBackground > 0 && (
              <div>{result.skipped.noBackground} without a solid background behind them</div>
            )}
            {result.skipped.system > 0 && (
              <div>{result.skipped.system} in Telegram system components, drawn by Telegram (skipped)</div>
            )}
            {result.skipped.unsupported > 0 && (
              <div>{result.skipped.unsupported} over gradients or images, not supported yet</div>
            )}
            <div>Click a row to select the layer.</div>
          </div>
        </>
      )}
    </div>
  );
}
