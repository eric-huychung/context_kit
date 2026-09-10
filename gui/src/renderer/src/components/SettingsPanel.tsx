import { useEffect, useState, type FormEvent } from 'react';
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
 * Settings workspace tab: BYOK for doctor's LLM slice. Provider + key,
 * Save also pings (1-token call) so a bad key fails clearly right away.
 * The renderer never re-reads the key after Save — only `hasLlmKey()`'s
 * boolean.
 */
export default function SettingsPanel() {
  const bridge = useBridge();
  const [hasKey, setHasKey] = useState(false);
  const [provider, setProvider] = useState<LlmProvider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    void bridge.hasLlmKey().then(setHasKey);
  }, [bridge]);

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
    <section className="settings-panel panel-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>LLM key</h1>
          <p className="workspace-lede">
            Powers doctor&apos;s conflict and vague-trigger findings. Stored encrypted on this machine, direct to the
            provider — never through skil&apos;s servers.
          </p>
        </div>
      </div>

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
        {status.kind === 'success' && <p className="text-sm status-copy-success">Key saved and verified.</p>}
        <div className="modal-actions">
          <button
            type="submit"
            className={`primary-button ${FOCUS_RING}`}
            disabled={status.kind === 'saving' || !apiKey.trim()}
          >
            {status.kind === 'saving' ? 'Saving…' : 'Save + Test'}
          </button>
        </div>
      </form>
    </section>
  );
}
