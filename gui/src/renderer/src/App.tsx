import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowsClockwise, BookOpen, Clock, Compass, Folder, Gear, Lightning, Moon, Question, Sun, Terminal, Warning, X } from '@phosphor-icons/react';
import { useTheme } from './theme';
import { useBridge } from './bridge-context';
import { FOCUS_RING } from './lib/focus-ring';
import { formatScannedAt } from './lib/skill-sources';
import { statusLine, StatusSkeleton } from '../../../../shared/status';
import { folderLabel, folderPreview } from '../../shared/recent-folders';
import type { Collection, DriftAction, RuleRecord, SkillRecord, SyncAudit } from '../../shared/ipc';
import CollectionList from './components/CollectionList';
import CreateCollectionForm from './components/CreateCollectionForm';
import InboxPanel from './components/InboxPanel';
import MarketDiscover from './components/MarketDiscover';
import WorkspaceWarning from './components/WorkspaceWarning';
import RulesPanel from './components/RulesPanel';
import SettingsPanel from './components/SettingsPanel';
import HelpModal, { type HelpTab } from './components/HelpModal';
import SyncCleanupModal, { syncBannerText } from './components/SyncCleanupModal';
import { version as APP_VERSION } from '../../../package.json';

type WorkspaceTab = 'config' | 'search' | 'inbox' | 'collections' | 'rules' | 'settings';

const TABS: { id: WorkspaceTab; label: string; icon: typeof Folder }[] = [
  { id: 'config', label: 'Sync', icon: ArrowsClockwise },
  { id: 'search', label: 'Discover', icon: Compass },
  { id: 'inbox', label: 'Skills', icon: Lightning },
  { id: 'collections', label: 'Commands', icon: Terminal },
  { id: 'rules', label: 'Rules', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Gear },
];

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`icon-button ${FOCUS_RING}`}
    >
      {theme === 'dark' ? <Sun size={16} weight="regular" /> : <Moon size={16} weight="regular" />}
    </button>
  );
}

function ConfigPanel({
  root,
  lastScannedAt,
  audit,
  onAuditChange,
  onPick,
  onSwitch,
  onDisconnect,
}: {
  root: string | null;
  lastScannedAt: Date | null;
  audit: SyncAudit | null;
  onAuditChange: (audit: SyncAudit | null) => void;
  onPick: () => void;
  onSwitch: (path: string) => void;
  onDisconnect: () => void;
}) {
  const bridge = useBridge();
  const connected = Boolean(root);
  const [skills, setSkills] = useState<SkillRecord[] | null>(null);
  const [commands, setCommands] = useState<Collection[] | null>(null);
  const [rules, setRules] = useState<RuleRecord[] | null>(null);
  const [recents, setRecents] = useState<string[] | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [cleanupError, setCleanupError] = useState<string | null>(null);

  async function refreshAudit(): Promise<SyncAudit | null> {
    if (!root) {
      onAuditChange(null);
      return null;
    }
    const result = await bridge.auditSync();
    if (!result.ok) {
      return null;
    }
    onAuditChange(result.value);
    return result.value;
  }

  async function handleImport(ids: string[]): Promise<void> {
    setCleanupBusy(true);
    setCleanupError(null);
    const result = await bridge.importToCanonical(ids);
    setCleanupBusy(false);
    if (!result.ok) {
      setCleanupError(statusLine('import'));
      return;
    }
    const next = await refreshAudit();
    if (next && next.rows.length === 0) setCleanupOpen(false);
  }

  async function handleRemoveLeftovers(paths: string[]): Promise<void> {
    setCleanupBusy(true);
    setCleanupError(null);
    const result = await bridge.removeLeftovers(paths);
    setCleanupBusy(false);
    if (!result.ok) {
      setCleanupError(statusLine('leftover-remove'));
      return;
    }
    const next = await refreshAudit();
    if (next && next.rows.length === 0) setCleanupOpen(false);
  }

  async function handleResolveDrift(id: string, action: DriftAction, path: string): Promise<void> {
    setCleanupBusy(true);
    setCleanupError(null);
    const result = await bridge.resolveDrift(id, action, path);
    setCleanupBusy(false);
    if (!result.ok) {
      setCleanupError(statusLine('drift'));
      return;
    }
    const next = await refreshAudit();
    if (next && next.rows.length === 0) setCleanupOpen(false);
  }

  useEffect(() => {
    if (!root) {
      setSkills([]);
      setCommands([]);
      setRules([]);
      return;
    }
    let cancelled = false;
    setSkills(null);
    setCommands(null);
    setRules(null);
    void Promise.all([bridge.listSkills(), bridge.listCollections(), bridge.listRules()]).then(
      ([nextSkills, nextCommands, nextRules]) => {
        if (!cancelled) {
          setSkills(nextSkills);
          setCommands(nextCommands);
          setRules(nextRules);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [bridge, root, lastScannedAt]);

  useEffect(() => {
    let cancelled = false;
    void bridge.listRecentFolders().then((next) => {
      if (!cancelled) setRecents(next);
    });
    return () => {
      cancelled = true;
    };
  }, [bridge, root]);

  useEffect(() => {
    if (!audit || audit.rows.length === 0) setCleanupOpen(false);
  }, [audit]);

  const loadedSkills = skills ?? [];
  const loadedCommands = commands ?? [];
  const loadedRules = rules ?? [];
  const syncLoading =
    recents === null || (connected && (skills === null || commands === null || rules === null));
  const metrics = [
    { label: 'Skills', count: loadedSkills.length, Icon: Lightning },
    { label: 'Commands', count: loadedCommands.length, Icon: Terminal },
    { label: 'Rules', count: loadedRules.length, Icon: BookOpen },
  ] as const;

  return (
    <section className="config-panel panel-section">
      <div className="section-heading">
        <div>
          <h1>Sync</h1>
          <p className="workspace-lede">Last scan of this folder. Re-scan if nothing on disk changed.</p>
        </div>
        {connected && audit && audit.rows.length > 0 && (
          <WorkspaceWarning
            text={syncBannerText(audit)}
            onAction={() => {
              setCleanupError(null);
              setCleanupOpen(true);
            }}
          />
        )}
      </div>

      {syncLoading && <StatusSkeleton label="Loading sync" />}

      {!syncLoading && recents && recents.length > 0 && (
        <section className="recent-folders" aria-labelledby="recent-folders-title">
          <h2 id="recent-folders-title">Recent folders</h2>
          <p className="muted-copy">Last five project folders. Click to switch, or remove from this list.</p>
          <div className="recent-list">
            {recents.map((path) => {
              const current = path === root;
              const name = folderLabel(path);
              const preview = folderPreview(path);
              return (
                <div className="recent-card-wrap" key={path}>
                  {current ? (
                    <div className="recent-card glass-panel" aria-current="true">
                      <span className="connect-icon" aria-hidden="true">
                        <Folder size={16} weight="regular" />
                      </span>
                      <div className="recent-card-body">
                        <p className="recent-card-name">
                          <span className="recent-card-label">{name}</span>
                          <span className="current-pill">Current</span>
                        </p>
                        <p className="recent-card-path" title={path}>
                          {preview}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`recent-card glass-panel ${FOCUS_RING}`}
                      aria-label={`Switch to ${path}`}
                      title={path}
                      onClick={() => setPendingSwitch(path)}
                    >
                      <span className="connect-icon" aria-hidden="true">
                        <Folder size={16} weight="regular" />
                      </span>
                      <div className="recent-card-body">
                        <p className="recent-card-name">
                          <span className="recent-card-label">{name}</span>
                        </p>
                        <p className="recent-card-path">{preview}</p>
                      </div>
                    </button>
                  )}
                  <button
                    type="button"
                    className={`recent-remove ${FOCUS_RING}`}
                    aria-label={`Remove ${path} from recents`}
                    title="Remove"
                    onClick={() => setPendingRemove(path)}
                  >
                    <X size={14} weight="regular" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="config-card-wrap">
        <button
          type="button"
          className={`config-card ${FOCUS_RING}`}
          aria-label={root ? 'Change folder' : 'Pick folder'}
          title={root ? 'Change folder' : 'Pick folder'}
          onClick={onPick}
        >
          <span className="connect-icon" aria-hidden="true">
            <Folder size={20} weight="regular" />
          </span>
          <div className="config-card-body">
            <div className="config-card-head">
              <div>
                <h2>Project folder</h2>
                <p className="sync-status">
                  <span className={`sync-status-dot ${connected ? 'connected' : 'disconnected'}`} />
                  {connected ? 'Connected' : 'No project connected'}
                </p>
              </div>
            </div>
            {root ? (
              <p className="project-folder-name" title={root}>
                {root}
              </p>
            ) : (
              <p className="muted-copy">
                Point Skil at a project folder to read its .cursor, .claude, .codex, .github, .agents, and
                .windsurf files. No login needed.
              </p>
            )}
            <p className="last-scanned">
              <Clock size={14} weight="regular" aria-hidden="true" />
              Last scanned {formatScannedAt(lastScannedAt)}
            </p>
          </div>
        </button>
      </div>

      {!syncLoading && (
        <div className="sync-metrics">
          {metrics.map(({ label, count, Icon }) => (
            <div className="sync-metric-card glass-panel" key={label}>
              <Icon size={16} weight="regular" className="found-icon" aria-hidden="true" />
              <p className="found-value">{count}</p>
              <p className="found-label">{label}</p>
            </div>
          ))}
        </div>
      )}

      {cleanupOpen && audit &&
        createPortal(
          <SyncCleanupModal
            audit={audit}
            busy={cleanupBusy}
            error={cleanupError}
            onClose={() => setCleanupOpen(false)}
            onImport={(ids) => void handleImport(ids)}
            onRemove={(paths) => void handleRemoveLeftovers(paths)}
            onResolveDrift={(id, action, path) => void handleResolveDrift(id, action, path)}
          />,
          document.body
        )}

      {pendingSwitch && (
        <div className="modal-backdrop" role="presentation" onClick={() => setPendingSwitch(null)}>
          <div
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="switch-folder-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">Workspace</p>
            <h2 id="switch-folder-title">Switch folder?</h2>
            <p className="muted-copy">
              Open {folderLabel(pendingSwitch)} instead. Sync, Skills, Commands, and Rules will reload from that
              project.
            </p>
            <p className="recent-card-path">{pendingSwitch}</p>
            <div className="modal-actions">
              <button type="button" className={`outline-button ${FOCUS_RING}`} onClick={() => setPendingSwitch(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`primary-button ${FOCUS_RING}`}
                onClick={() => {
                  const next = pendingSwitch;
                  setPendingSwitch(null);
                  onSwitch(next);
                }}
              >
                Switch folder
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingRemove && (
        <div className="modal-backdrop" role="presentation" onClick={() => setPendingRemove(null)}>
          <div
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-folder-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">Workspace</p>
            <h2 id="remove-folder-title">Remove folder?</h2>
            <p className="muted-copy">
              {pendingRemove === root
                ? `Forget ${folderLabel(pendingRemove)} and disconnect it. Files on disk stay.`
                : `Forget ${folderLabel(pendingRemove)} from this list. Files on disk stay.`}
            </p>
            <p className="recent-card-path">{pendingRemove}</p>
            <div className="modal-actions">
              <button type="button" className={`outline-button ${FOCUS_RING}`} onClick={() => setPendingRemove(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`primary-button ${FOCUS_RING}`}
                onClick={() => {
                  const path = pendingRemove;
                  setPendingRemove(null);
                  void bridge.removeRecentFolder(path).then((next) => {
                    setRecents(next);
                    if (path === root) onDisconnect();
                  });
                }}
              >
                Remove folder
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}

export default function App() {
  const { theme } = useTheme();
  const bridge = useBridge();
  const [tab, setTab] = useState<WorkspaceTab>('collections');
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTab, setHelpTab] = useState<HelpTab>('instructions');
  const [updateOut, setUpdateOut] = useState<string | null>(null);
  const [projectRoot, setProjectRoot] = useState<string | null | undefined>(undefined);
  const [lastScannedAt, setLastScannedAt] = useState<Date | null>(null);
  const [scanning, setScanning] = useState(false);
  const [syncAudit, setSyncAudit] = useState<SyncAudit | null>(null);
  const rootLoadId = useRef(0);
  // Remounting CollectionList via key refreshes it after a watcher scan
  // or after the engine is rebuilt against a newly picked folder.
  const [collectionsVersion, setCollectionsVersion] = useState(0);

  useEffect(() => {
    const id = ++rootLoadId.current;
    void bridge.getProjectRoot().then(async (root) => {
      if (id !== rootLoadId.current) return;
      setProjectRoot(root);
      if (!root) return;
      setScanning(true);
      await bridge.scan();
      if (id !== rootLoadId.current) return;
      setScanning(false);
      setLastScannedAt(new Date());
    });
  }, [bridge]);

  useEffect(() => {
    return bridge.onScan(() => {
      setLastScannedAt(new Date());
    });
  }, [bridge]);

  useEffect(() => {
    let cancelled = false;
    void bridge.checkAppUpdate().then((result) => {
      if (!cancelled && result.ok && result.value.newer) setUpdateOut(result.value.latest);
    });
    return () => {
      cancelled = true;
    };
  }, [bridge]);

  const boundRoot = typeof projectRoot === 'string' ? projectRoot : null;

  useEffect(() => {
    if (!boundRoot) {
      setSyncAudit(null);
      return;
    }
    let cancelled = false;
    void bridge.auditSync().then((result) => {
      if (!cancelled && result.ok) setSyncAudit(result.value);
    });
    return () => {
      cancelled = true;
    };
  }, [bridge, boundRoot, lastScannedAt]);

  function handleProjectBound(root: string) {
    setProjectRoot(root);
  }

  async function handleBindFolder(path: string) {
    const bound = await bridge.bindProjectFolder(path);
    rootLoadId.current += 1;
    if (!bound) return;
    setScanning(true);
    await bridge.scan();
    setScanning(false);
    setLastScannedAt(new Date());
    setProjectRoot(bound);
    setCollectionsVersion((version) => version + 1);
  }

  async function handlePickFolder() {
    const picked = await bridge.pickProjectFolder();
    rootLoadId.current += 1;
    if (picked === null) return;
    setScanning(true);
    await bridge.scan();
    setScanning(false);
    setLastScannedAt(new Date());
    setProjectRoot(picked);
    setCollectionsVersion((version) => version + 1);
  }

  async function handleRescan() {
    if (!boundRoot) return;
    setScanning(true);
    await bridge.scan();
    setScanning(false);
  }

  return (
    <div className={`app-shell ${theme === 'dark' ? 'dark-shell' : 'light-shell'}`}>
      <header className="topbar glass-nav">
        <div className="brand-mark">
          <span className="wordmark">Skil</span>
          <span className="beta-pill">BETA</span>
        </div>
        {boundRoot && (
          <div className="path-cluster">
            <span className="path-pill glass-panel" title={boundRoot}>
              {boundRoot}
            </span>
            <button
              type="button"
              className={`icon-button ${FOCUS_RING}`}
              aria-label="Re-scan"
              title="Re-scan"
              disabled={scanning}
              onClick={() => void handleRescan()}
            >
              <ArrowsClockwise
                size={16}
                weight="regular"
                className={scanning ? 'spin' : undefined}
                aria-hidden="true"
              />
            </button>
          </div>
        )}
        <div className="top-actions">
          <ThemeToggle />
        </div>
      </header>

      <div className={`workspace workspace-${tab}`}>
        <nav className="rail" aria-label="Workspace">
          <div role="tablist" aria-label="Workspace">
            {TABS.map((item) => {
              const Icon = item.icon;
              const selected = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-label={item.label}
                  aria-selected={selected}
                  className={`rail-item ${selected ? 'active' : ''} ${FOCUS_RING}`}
                  onClick={() => setTab(item.id)}
                >
                  <span className="rail-icon">
                    <Icon size={16} weight="regular" aria-hidden="true" />
                    {item.id === 'config' &&
                      (syncAudit && syncAudit.rows.length > 0 ? (
                        <span className="sync-warning" title="Leftovers to clean up" aria-hidden="true">
                          <Warning size={10} weight="fill" />
                        </span>
                      ) : (
                        <span
                          className={`sync-dot ${boundRoot ? 'connected' : 'disconnected'}`}
                          title={boundRoot ? 'Folder connected' : 'No folder connected'}
                          aria-hidden="true"
                        />
                      ))}
                  </span>
                  <span className="rail-label" aria-hidden="true">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={`rail-item help-item ${FOCUS_RING}`}
            aria-label="Help"
            onClick={() => {
              setHelpTab('instructions');
              setHelpOpen(true);
            }}
          >
            <Question size={16} weight="regular" aria-hidden="true" />
            <span className="rail-label" aria-hidden="true">
              Help
            </span>
          </button>
        </nav>

        {tab === 'config' && (
          <ConfigPanel
            root={boundRoot}
            lastScannedAt={lastScannedAt}
            audit={syncAudit}
            onAuditChange={setSyncAudit}
            onPick={() => void handlePickFolder()}
            onSwitch={(path) => void handleBindFolder(path)}
            onDisconnect={() => {
              setProjectRoot(null);
              setLastScannedAt(null);
              setCollectionsVersion((version) => version + 1);
            }}
          />
        )}

        {tab === 'search' && <MarketDiscover onOpenSettings={() => setTab('settings')} />}

        {tab === 'inbox' && <InboxPanel key={boundRoot ?? 'session'} />}

        <div {...(tab === 'collections' ? { className: 'tab-panel-contents' } : { hidden: true })}>
          <CollectionList key={collectionsVersion} onProjectBound={handleProjectBound}>
            <CreateCollectionForm />
          </CollectionList>
        </div>

        {tab === 'rules' && <RulesPanel key={collectionsVersion} onProjectBound={handleProjectBound} />}

        {tab === 'settings' && <SettingsPanel />}
      </div>

      <footer className="footer-bar">
        <span>
          Free and open source
          {updateOut ? (
            <button
              type="button"
              className={`footer-update ${FOCUS_RING}`}
              onClick={() => {
                setHelpTab('about');
                setHelpOpen(true);
              }}
            >
              {updateOut} is out
            </button>
          ) : null}
        </span>
        <span>skil {APP_VERSION}</span>
      </footer>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} initialTab={helpTab} />}
    </div>
  );
}
