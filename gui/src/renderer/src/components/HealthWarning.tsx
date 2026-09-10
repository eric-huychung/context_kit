import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Warning } from '@phosphor-icons/react';
import { FOCUS_RING } from '../lib/focus-ring';
import {
  FINDING_LABEL,
  activeFindings,
  findingIgnoreKey,
  formatTokenCount,
  isLlmFinding,
  type SkillFindingView,
} from '../lib/skill-health';
import {
  getIgnoredFindings,
  ignoreFinding,
  restoreFinding,
  subscribeIgnoredFindings,
} from '../lib/ignored-findings';
import type { Finding } from '../../../shared/ipc';
import WorkspaceWarning from './WorkspaceWarning';

export type HealthFindingRow = Finding & { commandName?: string };

export function rowsForSkill(skillId: string, views: SkillFindingView[]): HealthFindingRow[] {
  return views.map((view) => ({
    type: view.type,
    skillId,
    message: view.message,
    commandName: view.commandName,
  }));
}

export function warningCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'warning' : 'warnings'}`;
}

function useIgnoredFindingKeys(): Set<string> {
  return useSyncExternalStore(subscribeIgnoredFindings, getIgnoredFindings);
}

/** Card corner mark only — not a control. Open doctor from the banner. Hidden when there are no active warnings. */
export function HealthMark({
  name,
  findings,
}: {
  name: string;
  findings: Array<Pick<HealthFindingRow, 'skillId' | 'type'>>;
}) {
  const ignored = useIgnoredFindingKeys();
  if (activeFindings(findings, ignored).length === 0) return null;

  return (
    <span className="health-mark" title="Health warning" aria-label={`${name} has a health warning`}>
      <Warning size={10} weight="fill" aria-hidden="true" />
    </span>
  );
}

/** Sync-style banner. Click opens the doctor modal. Green when there are no active warnings. */
export function HealthBanner({
  name,
  findings,
  tokenEstimate,
}: {
  name: string;
  findings: HealthFindingRow[];
  tokenEstimate?: number;
}) {
  const [open, setOpen] = useState(false);
  const ignored = useIgnoredFindingKeys();
  const activeCount = activeFindings(findings, ignored).length;

  return (
    <>
      <WorkspaceWarning
        text={warningCountLabel(activeCount)}
        tone={activeCount === 0 ? 'ok' : 'warn'}
        onAction={() => setOpen(true)}
      />
      {open && (
        <HealthDialog
          name={name}
          findings={findings}
          tokenEstimate={tokenEstimate}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function HealthDialog({
  name,
  findings,
  tokenEstimate,
  onClose,
}: {
  name: string;
  findings: HealthFindingRow[];
  tokenEstimate?: number;
  onClose: () => void;
}) {
  const ignored = useIgnoredFindingKeys();
  const active = activeFindings(findings, ignored);
  const ignoredRows = findings.filter((finding) => !active.includes(finding));
  const rows = [...active, ...ignoredRows];

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const filedOn = [...new Set(findings.flatMap((finding) => (finding.commandName ? [finding.commandName] : [])))];
  const meta = [
    filedOn.length > 0 ? `on ${filedOn.map((item) => `/${item}`).join(', ')}` : null,
    tokenEstimate !== undefined ? formatTokenCount(tokenEstimate) : undefined,
    warningCountLabel(active.length),
  ]
    .filter(Boolean)
    .join(' · ');

  return createPortal(
    <div className="skill-details-backdrop" role="presentation" onClick={onClose}>
      <div
        className="skill-details-modal health-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="health-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className={`modal-close ${FOCUS_RING}`} aria-label="Close health" onClick={onClose}>
          <span aria-hidden="true">×</span>
        </button>
        <div className="skill-preview-head">
          <div>
            <p className="eyebrow">Doctor</p>
            <h2 id="health-title">Health</h2>
            <p className="muted-copy">
              {name}
              {meta ? ` · ${meta}` : ''}
            </p>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="muted-copy">No warnings</p>
        ) : (
          <ul className="skill-health-findings">
            {rows.map((finding, index) => {
              const isIgnored = ignored.has(findingIgnoreKey(finding));
              return (
                <li
                  key={`${finding.type}-${finding.skillId}-${index}`}
                  className={
                    [isLlmFinding(finding.type) ? 'is-llm' : undefined, isIgnored ? 'is-ignored' : undefined]
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                >
                  <div className="health-finding-copy">
                    <span className="health-finding-label">{isIgnored ? 'Ignored' : FINDING_LABEL[finding.type]}</span>
                    {finding.skillId !== name ? <span className="muted-copy">{finding.skillId}</span> : null}
                    <span className="muted-copy">{finding.message}</span>
                  </div>
                  <span className="finding-actions">
                    {isIgnored ? (
                      <button
                        type="button"
                        className={`outline-button ${FOCUS_RING}`}
                        onClick={() => restoreFinding(finding)}
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`outline-button ${FOCUS_RING}`}
                        onClick={() => ignoreFinding(finding)}
                      >
                        Ignore
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>,
    document.body
  );
}
