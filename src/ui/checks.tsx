// C1 UI: unbound colors grouped by color and usage, with suggested theme params.
import { useEffect, useState } from 'preact/hooks';
import {
  deltaE2000,
  hexToRgb,
  matchQuality,
  PRESETS,
  resolveParams,
  THEME_PARAM_KEYS,
  type PaintTarget,
  type ThemeParamKey,
} from '../core';
import type { ColorGroup, PluginState, ScanResult } from '../shared/messages';
import { send } from './bridge';

const TARGET_LABEL: Record<PaintTarget, string> = { text: 'Text', fill: 'Fill', icon: 'Icon', stroke: 'Stroke' };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function GroupRow({
  group,
  params,
  chosen,
  checked,
  onChoose,
  onCheck,
}: {
  group: ColorGroup;
  params: Record<ThemeParamKey, string>;
  chosen: ThemeParamKey;
  checked: boolean;
  onChoose: (k: ThemeParamKey) => void;
  onCheck: (v: boolean) => void;
}) {
  // Quality is recomputed when the user picks another param than suggested.
  const quality =
    chosen === group.suggestion.key
      ? group.suggestion.quality
      : matchQuality(deltaE2000(hexToRgb(group.hex), hexToRgb(params[chosen])));
  return (
    <li class="group">
      <input type="checkbox" checked={checked} onChange={(e) => onCheck(e.currentTarget.checked)} />
      <div class="group-body">
        <div class="group-line">
          <span class="swatch-sm" style={{ background: group.hex }} />
          <code>{group.hex}</code>
          <span class="muted">
            {TARGET_LABEL[group.target]} ×{group.count}
          </span>
          <span class="arrow">→</span>
          <span class="swatch-sm" style={{ background: params[chosen] }} />
          <select value={chosen} onChange={(e) => onChoose(e.currentTarget.value as ThemeParamKey)}>
            {THEME_PARAM_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <span class={`q q-${quality}`}>{quality}</span>
        </div>
        <div class="group-line small muted">
          <span class="names">{group.layerNames.join(', ')}</span>
          <button class="link" onClick={() => send({ type: 'show-group', groupId: group.id })}>
            Show
          </button>
          <button class="link" onClick={() => send({ type: 'ignore', groupIds: [group.id] })}>
            Ignore
          </button>
        </div>
      </div>
    </li>
  );
}

export function ChecksTab({ state, scan }: { state: PluginState; scan: ScanResult | null }) {
  const [overrides, setOverrides] = useState<Record<string, ThemeParamKey>>({});
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());
  // Figma blocks window.confirm in plugin iframes, so binding asks inline.
  const [confirming, setConfirming] = useState(false);

  // Fresh scan: weak suggestions start unchecked, manual choices are kept for groups that remain.
  useEffect(() => {
    setUnchecked(new Set(scan?.groups.filter((g) => g.suggestion.quality === 'weak').map((g) => g.id)));
    setConfirming(false);
  }, [scan]);

  const connected = state.collection !== null;

  if (!scan) {
    return (
      <div class="tab">
        <section class="card">
          <div class="title">Unbound colors</div>
          <p class="muted">
            Colors that aren't bound to Telegram Theme stay the same in every theme. Select a screen and scan it.
          </p>
          <button class="primary wide" onClick={() => send({ type: 'scan' })}>
            Scan selection
          </button>
        </section>
      </div>
    );
  }

  const preset = PRESETS.find((p) => p.id === scan.referencePresetId) ?? PRESETS[0];
  const params = resolveParams(preset.params, preset.scheme).params;
  const keyOf = (g: ColorGroup) => overrides[g.id] ?? g.suggestion.key;
  const selected = scan.groups.filter((g) => !unchecked.has(g.id));
  const paints = selected.reduce((n, g) => n + g.count, 0);
  const { stats } = scan;

  return (
    <div class="tab">
      <div class="row">
        <div>
          <div class="title">Unbound colors</div>
          <div class="muted small">in {scan.rootNames.slice(0, 2).join(', ')}{scan.rootNames.length > 2 ? '…' : ''}</div>
        </div>
        <button class="secondary" onClick={() => send({ type: 'scan' })}>
          Scan selection
        </button>
      </div>

      <label class="ref">
        <span class="muted">Colors were drawn in</span>
        <select
          value={scan.referencePresetId}
          onChange={(e) => send({ type: 'scan', rescan: true, referencePresetId: e.currentTarget.value })}
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {scan.groups.length === 0 ? (
        <p class="ok">All solid colors here are bound to variables.</p>
      ) : (
        <>
          <ul class="groups">
            {scan.groups.map((g) => (
              <GroupRow
                key={g.id}
                group={g}
                params={params}
                chosen={keyOf(g)}
                checked={!unchecked.has(g.id)}
                onChoose={(k) => {
                  setOverrides({ ...overrides, [g.id]: k });
                  const next = new Set(unchecked);
                  next.delete(g.id);
                  setUnchecked(next);
                }}
                onCheck={(v) => {
                  const next = new Set(unchecked);
                  if (v) next.delete(g.id);
                  else next.add(g.id);
                  setUnchecked(next);
                }}
              />
            ))}
          </ul>
          {!connected && <div class="warn">Connect Telegram Theme on the Themes tab to bind colors.</div>}
          {confirming ? (
            <div class="confirm">
              <span>
                Bind {plural(paints, 'paint')} in {plural(selected.length, 'color group')}?
              </span>
              <button class="secondary" onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button
                class="primary"
                onClick={() =>
                  send({ type: 'bind', bindings: selected.map((g) => ({ groupId: g.id, key: keyOf(g) })) })
                }
              >
                Bind
              </button>
            </div>
          ) : (
            <button
              class="primary wide"
              disabled={!connected || selected.length === 0}
              onClick={() => setConfirming(true)}
            >
              Bind {plural(selected.length, 'color')}
            </button>
          )}
          <p class="muted small">
            “weak” matches are unchecked: the color is far from every theme param. Pick a param by hand or mark it as
            an exception.
          </p>
        </>
      )}

      <div class="stats small muted">
        <div>{plural(stats.layers, 'layer')} checked{stats.truncated ? ' (limit reached, select less)' : ''}</div>
        {stats.styled > 0 && <div>{plural(stats.styled, 'paint')} use color styles, left as is</div>}
        {stats.gradients > 0 && <div>{plural(stats.gradients, 'gradient')} skipped, not supported yet</div>}
        <div>
          {plural(stats.ignored, 'exception')}
          {stats.ignored > 0 && (
            <button class="link" onClick={() => send({ type: 'clear-ignored' })}>
              Reset
            </button>
          )}
          <button class="link" onClick={() => send({ type: 'ignore-selection' })}>
            Exclude selected layers
          </button>
        </div>
      </div>
    </div>
  );
}
