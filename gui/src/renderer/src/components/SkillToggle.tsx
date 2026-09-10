import { CircleNotch, ToggleLeft, ToggleRight } from '@phosphor-icons/react';
import type { MouseEvent } from 'react';
import { FOCUS_RING } from '../lib/focus-ring';
import { skillPathState } from '../lib/skill-sources';
import type { SkillRecord } from '../../../shared/ipc';

/**
 * On/off is a path, not a flag — read straight off `record.paths` via
 * `skillPathState`. Toggling is the write. Hidden for a wishlist id with
 * no catalog row yet.
 */
export default function SkillToggle({
  record,
  busy,
  onToggle,
}: {
  record: SkillRecord | undefined;
  busy: boolean;
  onToggle: () => void;
}) {
  if (!record) return null;
  const on = skillPathState(record.paths) === 'on';
  return (
    <button
      type="button"
      className={`always-on-toggle ${on ? 'on' : 'off'} ${FOCUS_RING}`}
      aria-pressed={on}
      aria-busy={busy || undefined}
      disabled={busy}
      aria-label={on ? `Turn off ${record.id}` : `Turn on ${record.id}`}
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
