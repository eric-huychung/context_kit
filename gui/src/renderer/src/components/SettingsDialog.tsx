import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Gear } from '@phosphor-icons/react';
import { useBridge } from '../bridge-context';
import { FOCUS_RING } from '../lib/focus-ring';
import type { LlmProvider } from '../../../shared/ipc';

const PROVIDERS: { id: LlmProvider; label: string }[] = [
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'openrouter', label: 'OpenRouter' },
];

type Status = { kind: 'idle' } | { kind: 'saving' } | { kind: 'success' } | { kind: 'error'; message: string };

/**
 * Header gear: BYOK for doctor's LLM slice. Provider + key, Save also
 * pings (1-token call) so a bad key fails clearly right away. The
 * renderer never re-reads the key after Save — only `hasLlmKey()`'s
 * boolean.
 *
 * `open`/`onOpenChange` are optional: uncontrolled by default (the gear
 * button owns its own state), or controlled so another surface — the
 * Discover Suggestion tab's "no key" empty state — can open the same
 * dialog instead of duplicating the form.
 */
export default function SettingsDialog({
  open: openProp,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const bridge = useBridge();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [hasKey, setHasKey] = useState(false);
  const [provider, setProvider] = useState<LlmProvider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    if (!open) return;
    void bridge.hasLlmKey().then(setHasKey);
  }, [bridge, open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  function close() {
    setOpen(false);
    setApiKey('');
    setStatus({ kind: 'idle' });
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = apiKey.trim();
    if (!trimmed) return;

    setStatus({ kind: 'saving' });
    const saved = await bridge.saveLlmSettings(provider, trimmed);
    if (!saved.ok) {
      setStatus({ kind: 'error', message: saved.error.message });
      return;
    }

    const pinged = await bridge.pingLlm();
    if (!pinged.ok) {
      setStatus({ kind: 'error', message: pinged.error.message });
      return;
    }

    setHasKey(true);
    setApiKey('');
    setStatus({ kind: 'success' });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="LLM settings"
        title="LLM settings"
        className={`icon-button ${FOCUS_RING}`}
      >
        <Gear size={16} weight="regular" aria-hidden="true" />
      </button>

      {open && (
        <div className="modal-backdrop" role="presentation" onClick={close}>
          <div
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="llm-settings-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleDialogKeyDown}
          >
            <p className="eyebrow">Settings</p>
            <h2 id="llm-settings-title">LLM key</h2>
            <p className="muted-copy">
              Powers doctor&apos;s conflict and vague-trigger findings. Stored encrypted on this machine, direct to
              the provider — never through skil&apos;s servers.
            </p>
            <p className="sync-status">
              <span className={`sync-status-dot ${hasKey ? 'connected' : 'disconnected'}`} />
              {hasKey ? 'Key saved' : 'No key saved'}
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="llm-provider" className="text-sm font-medium">
                  Provider
                </label>
                <select
                  id="llm-provider"
                  value={provider}
                  onChange={(event) => setProvider(event.target.value as LlmProvider)}
                  className={`rounded-md border border-input bg-transparent px-3 py-2 text-sm ${FOCUS_RING}`}
                >
                  {PROVIDERS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="llm-api-key" className="text-sm font-medium">
                  API key
                </label>
                <input
                  id="llm-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  autoFocus
                  autoComplete="off"
                  placeholder={hasKey ? 'Enter a new key to replace the saved one' : 'sk-...'}
                  className={`rounded-md border border-input bg-transparent px-3 py-2 text-sm ${FOCUS_RING}`}
                />
              </div>
              {status.kind === 'error' && (
                <p role="alert" className="text-sm text-destructive">
                  {status.message}
                </p>
              )}
              {status.kind === 'success' && (
                <p className="text-sm status-copy-success">Key saved and verified.</p>
              )}
              <div className="modal-actions">
                <button type="button" className={`outline-button ${FOCUS_RING}`} onClick={close}>
                  Close
                </button>
                <button
                  type="submit"
                  className={`primary-button ${FOCUS_RING}`}
                  disabled={status.kind === 'saving' || !apiKey.trim()}
                >
                  {status.kind === 'saving' ? 'Saving…' : 'Save + Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
