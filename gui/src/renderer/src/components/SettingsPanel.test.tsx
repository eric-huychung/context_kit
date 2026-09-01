import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPanel from './SettingsPanel';
import { createInMemoryEngine, createTestBridge, renderWithProviders } from '../test-utils';
import { err } from '../../../../../src/core/result.js';

describe('SettingsPanel', () => {
  it('shows "No key saved" for a fresh session', async () => {
    const bridge = createTestBridge(createInMemoryEngine());

    renderWithProviders(<SettingsPanel />, { bridge });

    await waitFor(() => expect(screen.getByText('No key saved')).toBeInTheDocument());
  });

  it('shows "Key saved" when a key is already saved', async () => {
    const bridge = createTestBridge(createInMemoryEngine(), { hasLlmKey: true });

    renderWithProviders(<SettingsPanel />, { bridge });

    await waitFor(() => expect(screen.getByText('Key saved')).toBeInTheDocument());
  });

  it('saves and pings a new key, showing success', async () => {
    const bridge = createTestBridge(createInMemoryEngine());

    renderWithProviders(<SettingsPanel />, { bridge });
    await userEvent.type(screen.getByLabelText('API key'), 'sk-test');
    await userEvent.click(screen.getByRole('button', { name: 'Save + Test' }));

    await waitFor(() => expect(screen.getByText('Key saved and verified.')).toBeInTheDocument());
  });

  it('shows a clear error when the ping fails on a bad key', async () => {
    const bridge = createTestBridge(createInMemoryEngine(), {
      pingResult: err(new Error('openai rejected the API key (401).')),
    });

    renderWithProviders(<SettingsPanel />, { bridge });
    await userEvent.type(screen.getByLabelText('API key'), 'sk-bad');
    await userEvent.click(screen.getByRole('button', { name: 'Save + Test' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/rejected the API key/));
  });
});
