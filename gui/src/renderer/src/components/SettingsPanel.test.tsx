import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPanel from './SettingsPanel';
import { createInMemoryEngine, createTestBridge, renderWithProviders } from '../test-utils';
import { err } from '../../../../../src/core/result.js';
import type { LlmStatus } from '../../../shared/ipc.js';

describe('SettingsPanel', () => {
  it('shows an add form and no keys for a fresh session', async () => {
    const bridge = createTestBridge(createInMemoryEngine());

    renderWithProviders(<SettingsPanel />, { bridge });

    await waitFor(() => expect(screen.queryByRole('status', { name: 'Loading settings' })).not.toBeInTheDocument());
    expect(screen.getByLabelText('API key')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Turn (on|off) / })).not.toBeInTheDocument();
  });

  it('shows a list skeleton while saved keys are loading', async () => {
    let resolveStatus!: (value: LlmStatus) => void;
    const statusPromise = new Promise<LlmStatus>((resolve) => {
      resolveStatus = resolve;
    });
    const inner = createTestBridge(createInMemoryEngine(), { hasLlmKey: true, llmKeyHint: 'uvwx' });
    const bridge = { ...inner, llmStatus: () => statusPromise };

    renderWithProviders(<SettingsPanel />, { bridge });

    expect(screen.getByRole('status', { name: 'Loading settings' })).toBeInTheDocument();
    expect(screen.getByLabelText('API key')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Turn (on|off) / })).not.toBeInTheDocument();
    expect(screen.queryByText('Loading\u2026')).not.toBeInTheDocument();

    resolveStatus(await inner.llmStatus());
    expect(await screen.findByRole('button', { name: 'Turn off Anthropic sk-••••uvwx' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading settings' })).not.toBeInTheDocument();
  });

  it('lists a saved key as the active row', async () => {
    const bridge = createTestBridge(createInMemoryEngine(), { hasLlmKey: true, llmKeyHint: 'uvwx' });

    renderWithProviders(<SettingsPanel />, { bridge });

    const toggle = await screen.findByRole('button', { name: 'Turn off Anthropic sk-••••uvwx' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('turns the active key off when its toggle is clicked', async () => {
    const bridge = createTestBridge(createInMemoryEngine(), { hasLlmKey: true, llmKeyHint: 'uvwx' });

    renderWithProviders(<SettingsPanel />, { bridge });
    const toggle = await screen.findByRole('button', { name: 'Turn off Anthropic sk-••••uvwx' });
    await userEvent.click(toggle);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Turn on Anthropic sk-••••uvwx' })).toHaveAttribute('aria-pressed', 'false'));
    expect((await bridge.llmStatus()).activeId).toBeNull();
  });

  it('adds a key, makes it active, and turns the previous one off', async () => {
    const bridge = createTestBridge(createInMemoryEngine(), { hasLlmKey: true, llmKeyHint: 'uvwx' });

    renderWithProviders(<SettingsPanel />, { bridge });
    await screen.findByRole('button', { name: 'Turn off Anthropic sk-••••uvwx' });
    await userEvent.selectOptions(screen.getByLabelText('Provider'), 'openai');
    await userEvent.type(screen.getByLabelText('API key'), 'sk-test');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    const openai = await screen.findByRole('button', { name: 'Turn off OpenAI sk-••••test' });
    const anthropic = screen.getByRole('button', { name: 'Turn on Anthropic sk-••••uvwx' });
    expect(openai).toHaveAttribute('aria-pressed', 'true');
    expect(anthropic).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(anthropic);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Turn off Anthropic sk-••••uvwx' })).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.getByRole('button', { name: 'Turn on OpenAI sk-••••test' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reveals and hides a saved key', async () => {
    const bridge = createTestBridge(createInMemoryEngine(), { hasLlmKey: true, llmKeyHint: 'uvwx' });

    renderWithProviders(<SettingsPanel />, { bridge });
    await screen.findByRole('button', { name: 'Turn off Anthropic sk-••••uvwx' });
    expect(screen.getByText('sk-••••uvwx')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Show Anthropic sk-••••uvwx' }));
    expect(await screen.findByText('sk-seed')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Hide Anthropic sk-••••uvwx' }));
    expect(screen.queryByText('sk-seed')).not.toBeInTheDocument();
    expect(screen.getByText('sk-••••uvwx')).toBeInTheDocument();
  });

  it('shows and hides the API key in the add form', async () => {
    const bridge = createTestBridge(createInMemoryEngine());

    renderWithProviders(<SettingsPanel />, { bridge });
    const input = screen.getByLabelText('API key');
    expect(input).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Show API key' }));
    expect(input).toHaveAttribute('type', 'text');

    await userEvent.click(screen.getByRole('button', { name: 'Hide API key' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('asks before deleting a saved key', async () => {
    const bridge = createTestBridge(createInMemoryEngine(), { hasLlmKey: true, llmKeyHint: 'uvwx' });
    const remove = vi.spyOn(bridge, 'removeLlmKey');

    renderWithProviders(<SettingsPanel />, { bridge });
    await screen.findByRole('button', { name: 'Turn off Anthropic sk-••••uvwx' });
    await userEvent.click(screen.getByRole('button', { name: 'Remove Anthropic sk-••••uvwx' }));

    const dialog = await screen.findByRole('dialog', { name: 'Delete Anthropic sk-••••uvwx?' });
    expect(remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(dialog).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Turn off Anthropic sk-••••uvwx' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remove Anthropic sk-••••uvwx' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete key' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Turn (on|off) Anthropic/ })).not.toBeInTheDocument());
    expect(remove).toHaveBeenCalledWith('k1');
  });

  it('shows a clear error when the ping fails on a bad key', async () => {
    const bridge = createTestBridge(createInMemoryEngine(), {
      pingResult: err(new Error('openai rejected the API key (401).')),
    });

    renderWithProviders(<SettingsPanel />, { bridge });
    await userEvent.type(screen.getByLabelText('API key'), 'sk-bad');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/rejected the API key/));
  });
});
