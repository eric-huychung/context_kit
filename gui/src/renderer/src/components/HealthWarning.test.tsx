import { afterEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createInMemoryEngine, createTestBridge, renderWithProviders } from '../test-utils';
import { HealthBanner, HealthMark, type HealthFindingRow } from './HealthWarning';

const UNUSED: HealthFindingRow = {
  type: 'unused',
  skillId: 'tdd',
  message: 'No recorded reads',
};

function manyFindings(count: number): HealthFindingRow[] {
  return Array.from({ length: count }, (_, index) => ({
    type: 'unused' as const,
    skillId: `skill-${index}`,
    message: `No recorded reads for ${index}`,
  }));
}

function renderHealth(findings: HealthFindingRow[], extra?: { mark?: boolean }) {
  const bridge = createTestBridge(createInMemoryEngine());
  return renderWithProviders(
    <>
      {extra?.mark && <HealthMark name="tdd" findings={findings} />}
      <HealthBanner name="build" findings={findings} tokenEstimate={12} />
    </>,
    { bridge }
  );
}

describe('HealthBanner', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('opens a preview-width dialog that keeps a long finding list in the scrollable surface', async () => {
    renderHealth(manyFindings(20));
    await userEvent.click(screen.getByRole('button', { name: '20 warnings' }));

    const dialog = await screen.findByRole('dialog', { name: 'Health' });
    expect(dialog).toHaveClass('skill-details-modal');
    expect(dialog).not.toHaveClass('help-modal');
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(20);
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disable' })).not.toBeInTheDocument();
  });

  it('keeps a green 0 warnings banner when clean, and the modal still opens', async () => {
    renderHealth([]);
    expect(screen.queryByLabelText('build has a health warning')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '0 warnings' }));
    const dialog = await screen.findByRole('dialog', { name: 'Health' });
    expect(within(dialog).getByText('No warnings')).toBeInTheDocument();
  });

  it('ignores a finding so it no longer counts as a warning, and restore brings it back', async () => {
    renderHealth([UNUSED], { mark: true });
    expect(screen.getByLabelText('tdd has a health warning')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '1 warning' }));
    const dialog = await screen.findByRole('dialog', { name: 'Health' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ignore' }));

    expect(screen.getByRole('button', { name: '0 warnings' })).toBeInTheDocument();
    expect(screen.queryByLabelText('tdd has a health warning')).not.toBeInTheDocument();
    expect(within(dialog).getByText('No recorded reads')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Restore' })).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Restore' }));
    expect(screen.getByRole('button', { name: '1 warning' })).toBeInTheDocument();
    expect(screen.getByLabelText('tdd has a health warning')).toBeInTheDocument();
  });
});
