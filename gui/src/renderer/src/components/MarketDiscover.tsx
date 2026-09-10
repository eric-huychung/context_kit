import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { ArrowRight, Check, MagnifyingGlass, Plus } from '@phosphor-icons/react';
import { useBridge } from '../bridge-context';
import { FOCUS_RING } from '../lib/focus-ring';
import { formatInstalls } from '../lib/format-installs';
import type { BrowseView, MarketSearchRow, ShelfRole } from '../../../shared/ipc';
import { StatusNotice, StatusSkeleton, type StatusKind } from '../../../../../shared/status';
import SkillPreviewDialog from './SkillPreviewDialog';
import WorkspaceWarning from './WorkspaceWarning';

type AddState = { status: 'success' } | { status: 'error' };
type Row = { id: string; name: string; installs: number; rank?: number };

/** Live skills.sh browse, same tabs as Landing Discover. */
const BROWSE_TABS: Array<{ view: BrowseView; label: string }> = [
  { view: 'all-time', label: 'Top' },
  { view: 'trending', label: 'Trending' },
];

/** Editorial role chips on the Suggested tab — mirrors `SEED_ROLES` in `market-seed.ts`. */
const SUGGEST_ROLE_TABS = [
  { slug: 'swe', label: 'SWE' },
  { slug: 'ui-ux', label: 'UI/UX' },
  { slug: 'pm', label: 'PM' },
  { slug: 'data', label: 'Data' },
  { slug: 'agent', label: 'Agent' },
  { slug: 'other', label: 'Other' },
] as const;

type SuggestGate =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; rows: Row[]; usedLlm: boolean };

/** Flattens shelves into an id -> row lookup so suggested ids (engine returns ids only) get a name/installs to display. */
function shelfRowsById(shelves: ShelfRole[]): Map<string, Row> {
  const byId = new Map<string, Row>();
  for (const role of shelves) {
    for (const field of role.fields) {
      for (const skill of field.skills) {
        if (!byId.has(skill.id)) {
          byId.set(skill.id, { id: skill.id, name: skill.name, installs: skill.installs });
        }
      }
    }
  }
  return byId;
}

/**
 * Role -> category -> ranked skills from the market index, plus live
 * Top / Trending. Empty or failed shelves keep this same nest and default
 * to Top — no second Discover UI.
 */
export default function MarketDiscover({ onOpenSettings }: { onOpenSettings?: () => void } = {}) {
  const bridge = useBridge();
  const [shelves, setShelves] = useState<ShelfRole[] | null>(null);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [browseView, setBrowseView] = useState<BrowseView | null>(null);
  const [browseRows, setBrowseRows] = useState<Row[] | null>(null);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [browseError, setBrowseError] = useState<StatusKind | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MarketSearchRow[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<StatusKind | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addStates, setAddStates] = useState<Record<string, AddState>>({});
  const browseCache = useRef<Partial<Record<BrowseView, Row[]>>>({});
  const [suggestedActive, setSuggestedActive] = useState(false);
  const [suggestRole, setSuggestRole] = useState<string>(SUGGEST_ROLE_TABS[0].slug);
  const [suggestGate, setSuggestGate] = useState<SuggestGate>({ status: 'idle' });
  const [hasLlmKey, setHasLlmKey] = useState(true);
  const suggestCheckedFor = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void bridge.marketShelves().then((result) => {
      if (cancelled) return;
      const roles = result.ok ? result.value : [];
      setShelves(roles);
      setActiveRole(roles[0]?.slug ?? null);
      setActiveField(roles[0]?.fields[0]?.slug ?? null);
      if (roles.length === 0) {
        void loadBrowse('all-time');
      }
    });
    return () => {
      cancelled = true;
    };
    // loadBrowse reads cache + bridge; fetch once per bridge identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge]);

  useEffect(() => {
    void bridge.hasLlmKey().then(setHasLlmKey);
  }, [bridge]);

  useEffect(() => {
    void bridge.listSkills().then((catalog) => {
      setAddStates((current) => {
        const next = { ...current };
        for (const skill of catalog) next[skill.id] = { status: 'success' };
        return next;
      });
    });
  }, [bridge]);

  const role = useMemo(() => shelves?.find((r) => r.slug === activeRole) ?? null, [shelves, activeRole]);
  const field = useMemo(
    () => role?.fields.find((f) => f.slug === activeField) ?? role?.fields[0] ?? null,
    [role, activeField]
  );
  const rows: Row[] = searchResults ?? (browseView ? browseRows ?? [] : field?.skills ?? []);

  async function loadBrowse(view: BrowseView) {
    setBrowseView(view);
    setBrowseError(null);
    const cached = browseCache.current[view];
    if (cached) {
      setBrowseRows(cached);
      return;
    }

    setIsBrowsing(true);
    try {
      const result = await bridge.browseSkills(view);
      if (!result.ok) {
        setBrowseError('load');
        setBrowseRows(null);
        return;
      }
      const rows = result.value.map((skill) => ({
        id: skill.id,
        name: skill.name ?? skill.id,
        installs: skill.installs ?? 0,
      }));
      browseCache.current[view] = rows;
      setBrowseRows(rows);
    } catch {
      setBrowseError('load');
      setBrowseRows(null);
    } finally {
      setIsBrowsing(false);
    }
  }

  function handleRoleSelect(r: ShelfRole) {
    setSuggestedActive(false);
    setBrowseView(null);
    setBrowseError(null);
    setActiveRole(r.slug);
    setActiveField(r.fields[0]?.slug ?? null);
  }

  /**
   * Editorial picks by default; LLM rerank when a key is saved. Caches by
   * role + key so tab switches do not refetch until one of those changes.
   */
  const runSuggestCheck = useCallback(
    async (role: string) => {
      const key = await bridge.hasLlmKey();
      setHasLlmKey(key);
      const cacheKey = `${role}::${key}`;
      if (suggestCheckedFor.current === cacheKey) {
        return;
      }
      setSuggestGate({ status: 'loading' });
      const shelvesResult = await bridge.marketShelves();
      const shelves = shelvesResult.ok ? shelvesResult.value : [];
      let result;
      try {
        result = await bridge.suggest(shelves, role);
      } catch {
        setSuggestGate({ status: 'error' });
        return;
      }
      if (!result.ok) {
        setSuggestGate({ status: 'error' });
        return;
      }
      const byId = shelfRowsById(shelves);
      const rows = result.value.ids.map((id, index) => {
        const known = byId.get(id);
        const slug = id.split('/').pop() ?? id;
        return known ?? { id, name: slug, installs: 0, rank: index + 1 };
      });
      suggestCheckedFor.current = cacheKey;
      setSuggestGate({ status: 'ready', rows, usedLlm: result.value.usedLlm });
    },
    [bridge]
  );

  function handleSelectSuggested() {
    setBrowseView(null);
    setBrowseError(null);
    setSuggestedActive(true);
    void runSuggestCheck(suggestRole);
  }

  function handleSuggestRoleSelect(slug: string) {
    setSuggestRole(slug);
    suggestCheckedFor.current = null;
    void runSuggestCheck(slug);
  }

  async function runMarketSearch(trimmed: string) {
    setSearchError(null);
    if (trimmed.length === 0) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const result = await bridge.marketSearch(trimmed);
      if (!result.ok) {
        setSearchError('search');
        setSearchResults(null);
        return;
      }
      setSearchResults(result.value);
    } catch {
      setSearchError('search');
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuggestedActive(false);
    await runMarketSearch(query.trim());
  }

  function retryFailedCatalog() {
    if (searchError) {
      void runMarketSearch(query.trim());
      return;
    }
    if (browseView) void loadBrowse(browseView);
  }

  async function handleAdd(skillId: string) {
    setAddingId(skillId);
    const result = await bridge.install(skillId);
    setAddingId(null);
    setAddStates((current) => ({
      ...current,
      [skillId]: result.ok ? { status: 'success' } : { status: 'error' },
    }));
  }

  const catalogError = searchError ?? (browseView ? browseError : null);
  const showSkeleton = shelves === null || isSearching || isBrowsing;

  function renderSkillRow(skill: Row, index: number) {
    const addState = addStates[skill.id];
    const isAdding = addingId === skill.id;
    const added = !isAdding && addState?.status === 'success';
    return (
      <li className="library-skill library-skill-interactive" key={skill.id} onClick={() => setSelectedId(skill.id)}>
        <button
          type="button"
          className={`library-skill-hit ${FOCUS_RING}`}
          onClick={() => setSelectedId(skill.id)}
          aria-haspopup="dialog"
          aria-label={`Details for ${skill.name}`}
        />
        <span className="skill-rank">{skill.rank ?? index + 1}</span>
        <div className="skill-info">
          <div className="skill-name">{skill.name}</div>
        </div>
        <div className="skill-actions">
          {!isAdding && addState?.status === 'error' && <StatusNotice kind="add" layout="inline" />}
          <span className="skill-installs">{formatInstalls(skill.installs)}</span>
          <button
            type="button"
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              void handleAdd(skill.id);
            }}
            disabled={isAdding}
            aria-label={isAdding ? `Adding ${skill.id}` : added ? `Added ${skill.id}` : `Add ${skill.id}`}
            aria-pressed={added}
            aria-busy={isAdding || undefined}
            className={`add-icon-button ${FOCUS_RING}`}
          >
            {added ? (
              <Check size={16} weight="regular" aria-hidden="true" />
            ) : (
              <Plus size={16} weight="regular" aria-hidden="true" />
            )}
          </button>
        </div>
      </li>
    );
  }

  return (
    <section className="library-panel panel-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Discover</h1>
          <p className="workspace-lede">
            Browse the market index by role, then category. `+` writes a skill into both live trees right away —
            it shows up under Skills as Market.
          </p>
        </div>
        {suggestedActive && !hasLlmKey && (
          <WorkspaceWarning
            text="Editorial picks only — no LLM key"
            actionLabel="Settings"
            actionAriaLabel="Open LLM settings"
            onAction={() => onOpenSettings?.()}
          />
        )}
      </div>

      <form onSubmit={(event) => void handleSearch(event)}>
        <label className="search-box" htmlFor="market-search-query">
          <MagnifyingGlass size={16} weight="regular" aria-hidden="true" />
          <span className="sr-only">Search skills</span>
          <input
            id="market-search-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search skills"
          />
          <button type="submit" className="search-submit" aria-label="Search">
            <ArrowRight size={16} weight="regular" aria-hidden="true" />
          </button>
        </label>
      </form>

      {shelves && searchResults === null && (
        <>
          <div role="tablist" aria-label="Role" className="filter-row role-tabs">
            <button
              type="button"
              role="tab"
              aria-selected={suggestedActive}
              onClick={handleSelectSuggested}
              className={`filter ${suggestedActive ? 'active-filter' : ''} ${FOCUS_RING}`}
            >
              Suggested
            </button>
            {BROWSE_TABS.map((tab) => (
              <button
                key={tab.view}
                type="button"
                role="tab"
                aria-selected={!suggestedActive && browseView === tab.view}
                onClick={() => {
                  setSuggestedActive(false);
                  void loadBrowse(tab.view);
                }}
                className={`filter ${!suggestedActive && browseView === tab.view ? 'active-filter' : ''} ${FOCUS_RING}`}
              >
                {tab.label}
              </button>
            ))}
            {shelves.map((r) => (
              <button
                key={r.slug}
                type="button"
                role="tab"
                aria-selected={!suggestedActive && browseView === null && r.slug === activeRole}
                onClick={() => handleRoleSelect(r)}
                className={`filter ${!suggestedActive && browseView === null && r.slug === activeRole ? 'active-filter' : ''} ${FOCUS_RING}`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {role && browseView === null && !suggestedActive && (
            <div role="tablist" aria-label="Category" className="filter-row">
              {role.fields.map((f) => (
                <button
                  key={f.slug}
                  type="button"
                  role="tab"
                  aria-selected={f.slug === activeField}
                  onClick={() => setActiveField(f.slug)}
                  className={`filter ${f.slug === activeField ? 'active-filter' : ''} ${FOCUS_RING}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {suggestedActive ? (
        <>
          <div className="suggest-role-picker">
            <label className="suggest-role-label" htmlFor="suggest-role">
              Role
            </label>
            <select
              id="suggest-role"
              value={suggestRole}
              onChange={(event) => handleSuggestRoleSelect(event.target.value)}
              className={`suggest-role-select ${FOCUS_RING}`}
              aria-label="Suggested role"
            >
              {SUGGEST_ROLE_TABS.map((tab) => (
                <option key={tab.slug} value={tab.slug}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>
          {suggestGate.status === 'loading' && <StatusSkeleton />}
          {suggestGate.status === 'error' && (
            <StatusNotice kind="load" onRetry={() => void runSuggestCheck(suggestRole)} />
          )}
          {suggestGate.status === 'ready' && suggestGate.rows.length === 0 && (
            <p className="muted-copy">No suggestions right now — every pick for this role is already in your catalog.</p>
          )}
          {suggestGate.status === 'ready' && suggestGate.rows.length > 0 && (
            <ul className="skill-list">{suggestGate.rows.map(renderSkillRow)}</ul>
          )}
        </>
      ) : (
        <>
          {showSkeleton && <StatusSkeleton />}
          {catalogError && !showSkeleton && <StatusNotice kind={catalogError} onRetry={retryFailedCatalog} />}
          {shelves && !showSkeleton && !catalogError && <ul className="skill-list">{rows.map(renderSkillRow)}</ul>}
        </>
      )}

      {selectedId && <SkillPreviewDialog id={selectedId} source="market" onClose={() => setSelectedId(null)} />}
    </section>
  );
}
