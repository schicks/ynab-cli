import { Check, ChevronDown, ChevronRight, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type BudgetSource, type Category, GROUP_ORDER, mockBudgetSource } from "./budgetSource";
import { SummaryCell } from "./components/SummaryCell";
import { currency, signedCurrency } from "./format";
import { evalMath } from "./math";
import { styles } from "./styles";

type Drafts = Record<string, number>;

export function App({ source = mockBudgetSource }: { source?: BudgetSource }) {
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState(0);
  const [baseline, setBaseline] = useState<Category[]>([]); // last-synced state from "YNAB"
  const [drafts, setDrafts] = useState<Drafts>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState(false);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    source.fetchBudget().then(({ income, categories }) => {
      setIncome(income);
      setBaseline(categories);
      setDrafts(Object.fromEntries(categories.map((c) => [c.id, c.target])));
      setLoading(false);
    });
  }, [source]);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const allocated = useMemo(
    () => Object.values(drafts).reduce((s, v) => s + (v || 0), 0),
    [drafts],
  );
  const baselineAllocated = useMemo(() => baseline.reduce((s, c) => s + c.target, 0), [baseline]);
  const readyToAssign = income - allocated;
  const netChange = allocated - baselineAllocated;
  const changedIds = baseline.filter((c) => drafts[c.id] !== c.target).map((c) => c.id);
  const isDirty = changedIds.length > 0;

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditValue(String(drafts[cat.id]));
    setEditError(false);
  }

  function commitEdit(id: string) {
    const result = evalMath(editValue);
    if (result !== null) {
      setDrafts((d) => ({ ...d, [id]: Math.max(0, Math.round(result)) }));
    }
    // unparseable input is discarded; the cell just reverts to its prior value
    setEditingId(null);
    setEditError(false);
  }

  function resetRow(id: string) {
    const original = baseline.find((c) => c.id === id);
    if (original) setDrafts((d) => ({ ...d, [id]: original.target }));
  }

  function discardAll() {
    setDrafts(Object.fromEntries(baseline.map((c) => [c.id, c.target])));
    setEditingId(null);
  }

  async function applyChanges() {
    setApplying(true);
    const updates = changedIds.map((id) => ({ id, target: drafts[id] ?? 0 }));
    await source.applyTargets(updates);
    const { income: i, categories } = await source.fetchBudget();
    setIncome(i);
    setBaseline(categories);
    setApplying(false);
    setToast(`${updates.length} target${updates.length === 1 ? "" : "s"} synced to YNAB`);
    setTimeout(() => setToast(null), 3200);
  }

  const barPct = income > 0 ? Math.min(100, (allocated / income) * 100) : 0;
  const overPct =
    income > 0 && allocated > income ? Math.min(100, ((allocated - income) / income) * 100) : 0;

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <Loader2 className="animate-spin" size={20} color="#6B6B6B" />
        <div
          style={{ fontFamily: "Inter, sans-serif", color: "#6B6B6B", marginTop: 10, fontSize: 13 }}
        >
          Pulling in your budget…
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* STICKY TOP BAR */}
      <div style={styles.topBar}>
        <div style={styles.topBarInner} className="ht-top-inner">
          <div style={styles.brandRow}>Hypotheticals for YNAB</div>

          <div style={styles.cellRow}>
            <SummaryCell label="Income (est.)" value={currency(income)} />
            <SummaryCell label="Allocated" value={currency(allocated)} flagged={netChange !== 0} />
            <SummaryCell
              label="∆"
              value={currency(readyToAssign, { forceSign: readyToAssign < 0 })}
              tone={readyToAssign < 0 ? "danger" : "positive"}
              emphasize
            />
          </div>

          <div style={styles.beamTrack}>
            <div
              style={{
                ...styles.beamFill,
                width: `${barPct}%`,
                background: overPct > 0 ? "#B5432E" : "#1E7A5E",
              }}
            />
            {overPct > 0 && <div style={{ ...styles.beamOverflow, width: `${overPct}%` }} />}
            <div style={styles.beamIncomeMark} />
          </div>

          {netChange !== 0 && (
            <div style={styles.netChangeCaption}>
              hypothetical change: <strong>{signedCurrency(netChange)}</strong>/mo across{" "}
              {changedIds.length} categor{changedIds.length === 1 ? "y" : "ies"}
            </div>
          )}
        </div>
      </div>

      {/* MAIN GRID */}
      <div style={styles.main} className="ht-main">
        <p style={styles.introText}>
          Click a target to edit it — type an amount or a quick calculation like{" "}
          <span style={styles.mono}>600+100</span> or <span style={styles.mono}>900/2</span>.
          Nothing changes in YNAB until you apply it.
        </p>

        <div style={styles.gridWrap}>
          <div style={{ ...styles.gridRow, ...styles.colHeaderRow }}>
            <div className="ht-cell ht-col-category" style={styles.colHeaderCell}>
              Category
            </div>
            <div className="ht-cell ht-col-num" style={styles.colHeaderCell}>
              Target
            </div>
            <div className="ht-cell ht-col-delta" style={styles.colHeaderCell}>
              Δ
            </div>
            <div className="ht-cell ht-col-reset" style={styles.colHeaderCell} />
          </div>

          {GROUP_ORDER.map((group) => {
            const rows = baseline.filter((c) => c.group === group);
            if (rows.length === 0) return null;
            const isOpen = !collapsed[group];
            const groupAllocated = rows.reduce((s, c) => s + (drafts[c.id] || 0), 0);
            const groupBaseline = rows.reduce((s, c) => s + c.target, 0);
            const groupDelta = groupAllocated - groupBaseline;

            return (
              <div key={group}>
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [group]: !c[group] }))}
                  style={{ ...styles.gridRow, ...styles.groupRow }}
                >
                  <div className="ht-cell ht-col-category" style={styles.groupCell}>
                    {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    {group}
                  </div>
                  <div
                    className="ht-cell ht-col-num"
                    style={{ ...styles.groupCell, ...styles.mono }}
                  >
                    {currency(groupAllocated)}
                  </div>
                  <div
                    className="ht-cell ht-col-delta"
                    style={{
                      ...styles.groupCell,
                      ...styles.mono,
                      color: groupDelta === 0 ? "#3A3A3A" : groupDelta > 0 ? "#3A5FA0" : "#8A6D1F",
                    }}
                  >
                    {signedCurrency(groupDelta)}
                  </div>
                  <div className="ht-cell ht-col-reset" style={styles.groupCell} />
                </button>

                {isOpen &&
                  rows.map((cat) => {
                    const draft = drafts[cat.id] ?? cat.target;
                    const changed = draft !== cat.target;
                    const delta = draft - cat.target;
                    const editing = editingId === cat.id;

                    return (
                      <div key={cat.id} style={{ ...styles.gridRow, ...styles.dataRow }}>
                        <div className="ht-cell ht-col-category" style={styles.colCategory}>
                          <span style={styles.categoryName}>{cat.name}</span>
                        </div>

                        <div
                          className="ht-cell ht-col-num"
                          style={{
                            ...styles.targetCell,
                            ...(editing ? styles.targetCellEditing : {}),
                            ...(editing && editError ? styles.targetCellError : {}),
                            ...(changed && !editing ? styles.targetCellChanged : {}),
                          }}
                          onClick={() => !editing && startEdit(cat)}
                        >
                          {editing ? (
                            <input
                              ref={inputRef}
                              value={editValue}
                              onChange={(e) => {
                                setEditValue(e.target.value);
                                setEditError(evalMath(e.target.value) === null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitEdit(cat.id);
                                if (e.key === "Escape") {
                                  setEditingId(null);
                                  setEditError(false);
                                }
                              }}
                              onBlur={() => commitEdit(cat.id)}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="e.g. 600+100"
                              style={styles.editInput}
                            />
                          ) : (
                            <span style={styles.mono}>{currency(draft)}</span>
                          )}
                        </div>

                        <div
                          className="ht-cell ht-col-delta"
                          style={{
                            ...styles.mono,
                            color: delta === 0 ? "#B7B2A6" : delta > 0 ? "#3A5FA0" : "#8A6D1F",
                          }}
                        >
                          {signedCurrency(delta)}
                        </div>

                        <div className="ht-cell ht-col-reset">
                          {changed && (
                            <button
                              type="button"
                              style={styles.resetRowBtn}
                              onClick={() => resetRow(cat.id)}
                              aria-label="Revert this category"
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>

        <div style={{ height: isDirty ? 100 : 30 }} />
      </div>

      {/* STICKY BOTTOM BAR */}
      {isDirty && (
        <div style={styles.bottomBar}>
          <div style={styles.bottomBarInner} className="ht-bottom-inner">
            <div style={styles.bottomBarText}>
              <strong>
                {changedIds.length} categor{changedIds.length === 1 ? "y" : "ies"} changed
              </strong>
              <span style={{ color: "#6B6B6B", marginLeft: 8 }}>
                {signedCurrency(netChange)}/mo net
              </span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                style={styles.discardBtn}
                onClick={discardAll}
                disabled={applying}
              >
                Discard
              </button>
              <button
                type="button"
                style={styles.applyBtn}
                onClick={applyChanges}
                disabled={applying}
              >
                {applying ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Syncing…
                  </>
                ) : (
                  "Apply to YNAB"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={styles.toast}>
          <Check size={14} color="#1E7A5E" />
          {toast}
        </div>
      )}
    </div>
  );
}
