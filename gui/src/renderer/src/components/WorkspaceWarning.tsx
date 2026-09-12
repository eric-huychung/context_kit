import { CheckCircle, Warning } from '@phosphor-icons/react';
import { FOCUS_RING } from '../lib/focus-ring';

/** Compact callout for section headings — Sync leftovers, doctor warnings, Discover no-key. */
export default function WorkspaceWarning({
  text,
  actionLabel,
  onAction,
  actionAriaLabel,
  title,
  tone = 'warn',
}: {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  actionAriaLabel?: string;
  title?: string;
  tone?: 'warn' | 'ok';
}) {
  const Icon = tone === 'ok' ? CheckCircle : Warning;
  const icon = <Icon size={14} weight="fill" className="workspace-warning-icon" aria-hidden="true" />;
  const toneClass = tone === 'ok' ? ' workspace-warning-ok' : '';

  if (onAction && !actionLabel) {
    return (
      <button
        type="button"
        className={`workspace-warning${toneClass} workspace-warning-clickable ${FOCUS_RING}`}
        title={title}
        onClick={onAction}
      >
        {icon}
        <span className="workspace-warning-text">{text}</span>
      </button>
    );
  }

  return (
    <div className={`workspace-warning${toneClass}`} role="status" title={title}>
      {icon}
      <p className="workspace-warning-text">{text}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          className={`outline-button workspace-warning-action ${FOCUS_RING}`}
          aria-label={actionAriaLabel ?? actionLabel}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
