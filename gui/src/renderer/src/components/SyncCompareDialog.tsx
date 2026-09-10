import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBridge } from '../bridge-context';
import { FOCUS_RING } from '../lib/focus-ring';
import { lineDiff, type AlignRow } from '../lib/sync-compare-diff';
import type { SyncPreview } from '../../../shared/ipc';
import { StatusNotice, StatusSkeleton } from '../../../../../shared/status';

export default function SyncCompareDialog({ path, onClose }: { path: string; onClose: () => void }) {
  const bridge = useBridge();
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPreview(null);
    setFailed(false);
    void bridge.previewSync(path).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setFailed(true);
        return;
      }
      setPreview(result.value);
    });
    return () => {
      cancelled = true;
    };
  }, [bridge, path, reloadKey]);

  const rows = useMemo(
    () => (preview ? lineDiff(preview.canonicalBody, preview.leftoverBody) : null),
    [preview]
  );

  const title = preview?.id ?? 'Compare';
  const loading = !failed && preview === null;

  return createPortal(
    <div className="modal-backdrop sync-compare-backdrop" role="presentation" onClick={onClose}>
      <div
        className="help-modal sync-compare-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-compare-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className={`modal-close ${FOCUS_RING}`} aria-label="Close compare" onClick={onClose}>
          <span aria-hidden="true">×</span>
        </button>
        <h2 id="sync-compare-title">{title}</h2>
        {failed && <StatusNotice kind="preview" onRetry={() => setReloadKey((key) => key + 1)} />}
        {loading && <StatusSkeleton variant="preview" />}
        {preview && rows && (
          <div className="sync-compare-board">
            <div className="sync-compare-head">
              <CompareHead label="Live" path={preview.canonicalPath} />
              <CompareHead label="Leftover" path={preview.leftoverPath} />
            </div>
            <div className="sync-compare-source">
              {rows.map((row, index) => (
                <CompareRow key={index} row={row} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function CompareHead({ label, path }: { label: string; path: string }) {
  return (
    <div className="sync-compare-pane">
      <p className="sync-compare-label">{label}</p>
      <p className="sync-cleanup-path">{path}</p>
    </div>
  );
}

function CompareRow({ row }: { row: AlignRow }) {
  return (
    <div className="sync-compare-row">
      <CompareCell text={row.left} changed={row.leftChanged} />
      <CompareCell text={row.right} changed={row.rightChanged} />
    </div>
  );
}

function CompareCell({ text, changed }: { text: string | null; changed: boolean }) {
  const gap = text === null;
  const className = [
    'sync-compare-line',
    gap ? 'sync-compare-line-gap' : '',
    changed ? 'sync-compare-line-changed' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return <span className={className}>{text || '\u00a0'}</span>;
}
