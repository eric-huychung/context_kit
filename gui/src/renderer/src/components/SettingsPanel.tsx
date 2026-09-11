import { useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { CircleNotch, Eye, EyeSlash, ToggleLeft, ToggleRight, Trash } from '@phosphor-icons/react';
import { useBridge } from '../bridge-context';
import { FOCUS_RING } from '../lib/focus-ring';
import type { LlmKeyRow, LlmProvider, LlmStatus } from '../../../shared/ipc';
import { StatusSkeleton } from '../../../../../shared/status';

const PROVIDERS: { id: LlmProvider; label: string }[] = [
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'openrouter', label: 'OpenRouter' },
];

type FormStatus = { kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string };

function providerLabel(id: LlmProvider): string {
  return PROVIDERS.find((item) => item.id === id)?.label ?? id;
}

function keyMask(row: LlmKeyRow): string {
  return row.keyHint ? `sk-••••${row.keyHint}` : 'sk-••••';
}

function rowLabel(row: LlmKeyRow): string {
  return `${providerLabel(row.provider)} ${keyMask(row)}`;
}

/** Same On/Off control as commands and skills. One key on at a time. */
function LlmKeyToggle({
  row,
  on,
  busy,
  onToggle,
}: {
  row: LlmKeyRow;
  on: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  const label = rowLabel(row);
  return (
    <button
      type="button"
      className={`always-on-toggle ${on ? 'on' : 'off'} ${FOCUS_RING}`}
      aria-pressed={on}
      aria-busy={busy || undefined}
      disabled={busy}
      aria-label={on ? `Turn off ${label}` : `Turn on ${label}`}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      {busy ? (
        <CircleNotch size={18} weight="regular" className="spin" aria-hidden="true" />
      ) : on ? (
        <ToggleRight size={18} weight="fill" aria-hidden="true" />
      ) : (
        <ToggleLeft size={18} weight="regular" aria-hidden="true" />
      )}
      {busy ? null : on ? 'On' : 'Off'}
    </button>
  );
}

/**
 * One row per key: provider, masked key, eye, on/off. Add is the same
 * row with Save. Renderer never sees a raw key until the eye is clicked.
 */
export default function SettingsPanel() {
  const bridge = useBridge();
  const [llm, setLlm] = useState<LlmStatus | null>(null);
  const [provider, setProvider] = useState<LlmProvider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState<FormStatus>({ kind: 'idle' });
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LlmKeyRow | null>(null);

  useEffect(() => {
    void bridge.llmStatus().then(setLlm);
  }, [bridge]);

  async function refresh(): Promise<LlmStatus> {
    const next = await bridge.llmStatus();
    setLlm(next);
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = apiKey.trim();
    if (!trimmed) return;

    setForm({ kind: 'saving' });
    const saved = await bridge.saveLlmSettings(provider, trimmed);
    if (!saved.ok) {
      setForm({ kind: 'error', message: saved.error.message });
      return;
    }

    await refresh();
    setApiKey('');
    setShowKey(false);
    setForm({ kind: 'idle' });
  }

  async function handleToggle(id: string): Promise<void> {
    setTogglingId(id);
    const result = await bridge.setActiveLlmKey(id);
    setTogglingId(null);
    if (!result.ok) {
      setForm({ kind: 'error', message: result.error.message });
      return;
    }
    await refresh();
  }

  async function handleReveal(row: LlmKeyRow): Promise<void> {
    if (revealed[row.id]) {
      setRevealed((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      return;
    }
    try {
      const result = await bridge.revealLlmKey(row.id);
      if (!result.ok) {
        setForm({ kind: 'error', message: result.error.message });
        return;
      }
      if (typeof result.value !== 'string' || result.value.length === 0) {
        setForm({ kind: 'error', message: 'Restart skil to show saved keys.' });
        return;
      }
      setRevealed((current) => ({ ...current, [row.id]: result.value }));
    } catch (error) {
      setForm({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not show that key.',
      });
    }
  }

  function closeDelete(): void {
    setPendingDelete(null);
  }

  async function handleRemove(): Promise<void> {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    const result = await bridge.removeLlmKey(id);
    if (!result.ok) {
      setForm({ kind: 'error', message: result.error.message });
      return;
    }
    setRevealed((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setPendingDelete(null);
    await refresh();
  }

  return (
    <section className="settings-panel panel-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>LLM</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="llm-key-form">
        <div className="llm-key-row">
          <select
            id="llm-provider"
            aria-label="Provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value as LlmProvider)}
            className={`llm-key-provider ${FOCUS_RING}`}
          >
            {PROVIDERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <div className="llm-key-field">
            <input
              id="llm-api-key"
              aria-label="API key"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-…"
              className={`llm-key-input ${FOCUS_RING}`}
            />
            <button
              type="button"
              className={`llm-key-visibility ${FOCUS_RING}`}
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
              aria-pressed={showKey}
              onClick={() => setShowKey((current) => !current)}
            >
              {showKey ? (
                <EyeSlash size={16} weight="regular" aria-hidden="true" />
              ) : (
                <Eye size={16} weight="regular" aria-hidden="true" />
              )}
            </button>
          </div>
          <button
            type="submit"
            className={`primary-button ${FOCUS_RING}`}
            disabled={form.kind === 'saving' || !apiKey.trim()}
          >
            {form.kind === 'saving' ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>

      {llm === null ? (
        <StatusSkeleton label="Loading settings" />
      ) : llm.keys.length > 0 ? (
        <ul className="llm-key-list">
          {llm.keys.map((row) => {
            const active = row.id === llm.activeId;
            const plaintext = revealed[row.id];
            const shown = plaintext ?? keyMask(row);
            const label = rowLabel(row);
            return (
              <li key={row.id} className={`llm-key-item ${active ? 'active' : ''}`}>
                <span className="llm-key-name">{providerLabel(row.provider)}</span>
                <code className="llm-key-mask">{shown}</code>
                <button
                  type="button"
                  className={`llm-key-icon ${FOCUS_RING}`}
                  aria-label={plaintext ? `Hide ${label}` : `Show ${label}`}
                  aria-pressed={Boolean(plaintext)}
                  onClick={() => void handleReveal(row)}
                >
                  {plaintext ? (
                    <EyeSlash size={14} weight="regular" aria-hidden="true" />
                  ) : (
                    <Eye size={14} weight="regular" aria-hidden="true" />
                  )}
                </button>
                <LlmKeyToggle
                  row={row}
                  on={active}
                  busy={togglingId === row.id}
                  onToggle={() => void handleToggle(row.id)}
                />
                <button
                  type="button"
                  className={`llm-key-icon ${FOCUS_RING}`}
                  aria-label={`Remove ${label}`}
                  onClick={() => setPendingDelete(row)}
                >
                  <Trash size={14} weight="regular" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {form.kind === 'error' ? (
        <p role="alert" className="text-sm text-destructive">
          {form.message}
        </p>
      ) : null}

      {pendingDelete &&
        createPortal(
          <div className="modal-backdrop" role="presentation" onClick={closeDelete}>
            <div
              className="help-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-llm-key-title"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="eyebrow">Settings</p>
              <h2 id="delete-llm-key-title">Delete {rowLabel(pendingDelete)}?</h2>
              <p className="muted-copy">This cannot be undone.</p>
              <div className="modal-actions">
                <button type="button" className={`outline-button ${FOCUS_RING}`} onClick={closeDelete}>
                  Cancel
                </button>
                <button type="button" className={`primary-button ${FOCUS_RING}`} onClick={() => void handleRemove()}>
                  Delete key
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
