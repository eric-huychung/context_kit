import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsDialog from './SettingsDialog';
import { createInMemoryEngine, createTestBridge, renderWithProviders } from '../test-utils';
import { err } from '../../../../../src/core/result.js';

describe('SettingsDialog', () => {
  it('shows no key saved until opened, and hides the form until then', () => {
    const bridge = createTestBridge(createInMemoryEngine());

    renderWithProviders(<SettingsDialog />, { bridge });

    expect(screen.queryByLabelText('API key')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'LLM settings' })).toBeInTheDocument();
  });

  it('shows "No key saved" for a fresh session', async () => {
    const bridge = createTestBridge(createInMemoryEngine());

    renderWithProviders(<SettingsDialog />, { bridge });
    await userEvent.click(screen.getByRole('button', { name: 'LLM settings' }));

    await waitFor(() => expect(screen.getByText('No key saved')).toBeInTheDocument());
  });

  it('shows "Key saved" when a key is already saved', async () => {
    const bridge = createTestBridge(createInMemoryEngine(), { hasLlmKey: true });

    renderWithProviders(<SettingsDialog />, { bridge });
    await userEvent.click(screen.getByRole('button', { name: 'LLM settings' }));

    await waitFor(() => expect(screen.getByText('Key saved')).toBeInTheDocument());
  });

  it('saves and pings a new key, showing success', async () => {
    const bridge = createTestBridge(createInMemoryEngine());

    renderWithProviders(<SettingsDialog />, { bridge });
    await userEvent.click(screen.getByRole('button', { name: 'LLM settings' }));
    await userEvent.type(screen.getByLabelText('API key'), 'sk-test');
    await userEvent.click(screen.getByRole('button', { name: 'Save + Test' }));

    await waitFor(() => expect(screen.getByText('Key saved and verified.')).toBeInTheDocument());
  });

  it('shows a clear error when the ping fails on a bad key', async () => {
    const bridge = createTestBridge(createInMemoryEngine(), {
      pingResult: err(new Error('openai rejected the API key (401).')),
    });

    renderWithProviders(<SettingsDialog />, { bridge });
    await userEvent.click(screen.getByRole('button', { name: 'LLM settings' }));
    await userEvent.type(screen.getByLabelText('API key'), 'sk-bad');
    await userEvent.click(screen.getByRole('button', { name: 'Save + Test' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/rejected the API key/));
  });

  it('closes and clears the key field on Close', async () => {
    const bridge = createTestBridge(createInMemoryEngine());

    renderWithProviders(<SettingsDialog />, { bridge });
    await userEvent.click(screen.getByRole('button', { name: 'LLM settings' }));
    await userEvent.type(screen.getByLabelText('API key'), 'sk-test');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByLabelText('API key')).not.toBeInTheDocument();
  });
});
