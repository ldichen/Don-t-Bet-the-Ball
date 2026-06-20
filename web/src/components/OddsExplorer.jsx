import { useState, useRef, useCallback, useEffect } from 'react';
import { COLORS, NAMES, KEYS, resultMeta } from '../utils/calc';
import { buildPaths } from '../utils/histogram';
import MatchTable from './MatchTable';
import Pagination from './Pagination';

const STEP = 0.01;
const GAP = 0.05;

export default function OddsExplorer({ bounds, ranges, histograms, cover, queryResult, page, updateRanges, resetRanges, goPage }) {
  const [open, setOpen] = useState(true);
  const tracksRef = useRef({});
  const dragRef = useRef(null);
  const rangesRef = useRef(ranges);
  rangesRef.current = ranges;

  useEffect(() => {
    const onMove = (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      const el = tracksRef.current[drag.key];
      if (!el) return;
      applyMove(e.clientX, el.getBoundingClientRect(), drag);
    };
    const onUp = () => {
      dragRef.current = null;
      document.body.style.userSelect = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [bounds, updateRanges]);

  function posToVal(clientX, rect, key) {
    const [lo, hi] = bounds[key];
    let ratio = (clientX - rect.left) / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    let val = lo + ratio * (hi - lo);
    return Math.round(val / STEP) * STEP;
  }

  function applyMove(clientX, rect, drag) {
    const { key, end } = drag;
    let val = posToVal(clientX, rect, key);
    const [mn, mx] = rangesRef.current[key];
    if (end === 'min') val = Math.min(val, mx - GAP);
    else val = Math.max(val, mn + GAP);
    const [lo, hi] = bounds[key];
    val = Math.max(lo, Math.min(hi, val));
    val = Math.round(val / STEP) * STEP;
    const next = end === 'min' ? [val, mx] : [mn, val];
    const newRanges = { ...rangesRef.current, [key]: next };
    updateRanges(newRanges);
  }

  function startDrag(e, key, end) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { key, end };
    document.body.style.userSelect = 'none';
  }

  function trackDown(e, key) {
    const el = tracksRef.current[key];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const val = posToVal(e.clientX, rect, key);
    const [mn, mx] = ranges[key];
    const end = Math.abs(val - mn) <= Math.abs(val - mx) ? 'min' : 'max';
    dragRef.current = { key, end };
    document.body.style.userSelect = 'none';
    applyMove(e.clientX, rect, { key, end });
  }

  function applyInput(key, end, raw) {
    const v = parseFloat(raw);
    if (!isFinite(v)) return;
    const [lo, hi] = bounds[key];
    const [mn, mx] = ranges[key];
    let val = Math.max(lo, Math.min(hi, v));
    val = Math.round(val / STEP) * STEP;
    if (end === 'min') val = Math.min(val, mx - GAP);
    else val = Math.max(val, mn + GAP);
    const next = end === 'min' ? [val, mx] : [mn, val];
    updateRanges({ ...ranges, [key]: next });
  }

  function pct(key, val) {
    const [lo, hi] = bounds[key];
    return ((val - lo) / (hi - lo)) * 100;
  }

  const { counts, total, rows, pageCount } = queryResult;
  const p = (n) => total ? ((n / total) * 100) : 0;

  const stats = [
    { name: '主胜 (H)', color: COLORS.h, count: counts.H, pct: p(counts.H).toFixed(1) },
    { name: '平局 (D)', color: COLORS.d, count: counts.D, pct: p(counts.D).toFixed(1) },
    { name: '客胜 (A)', color: COLORS.a, count: counts.A, pct: p(counts.A).toFixed(1) },
  ];

  const from = total ? page * 50 + 1 : 0;
  const to = Math.min(total, (page + 1) * 50);
  const tableNote = total ? `${from}–${to} / 共 ${total.toLocaleString()} 场` : '共 0 场';

  return (
    <section style={{
      background: '#ffffff', border: '1px solid #e7e3da', borderRadius: 16,
      padding: '18px 24px 20px', marginBottom: 16, boxShadow: '0 1px 2px rgba(40,34,20,.03)',
    }}>
      <div data-r="exhead" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: '#34312D', textTransform: 'uppercase' }}>输球赔率探索</div>
          <span style={{ fontSize: 11, color: '#b3ada3' }}>赔率区间 · 结果分布 · 比赛明细，实时联动</span>
        </div>
        <button onClick={() => setOpen(!open)} style={{
          background: '#1b806a', border: '1px solid #1b806a', color: '#fff',
          fontFamily: "'Manrope',sans-serif", fontSize: 12, fontWeight: 600,
          padding: '6px 13px', borderRadius: 8, cursor: 'pointer',
        }}>
          {open ? '收起 ▾' : '展开 ▸'}
        </button>
      </div>

      {open && (
        <>
          {/* Sliders */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #ece8e0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: '#79736a' }}>赔率区间</div>
              <button onClick={resetRanges} style={{
                background: '#f4f2ee', border: '1px solid #e3ded3', color: '#5d5750',
                fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600,
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
              }}>重置全部</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {KEYS.map(key => {
                const [mn, mx] = ranges[key];
                const [lo, hi] = bounds[key];
                const minPct = pct(key, mn);
                const maxPct = pct(key, mx);
                const { grayPath, colorPath } = buildPaths(histograms[key], minPct, maxPct);
                const cv = cover[key] || { pct: 0, n: 0 };

                return (
                  <div key={key}>
                    <div data-r="slabel" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: COLORS[key], display: 'inline-block' }} />
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{NAMES[key]}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                        <input
                          data-r="snum"
                          type="number" step="0.01" min={lo} max={hi}
                          key={`${key}-min-${mn}`}
                          defaultValue={mn.toFixed(2)}
                          onBlur={e => applyInput(key, 'min', e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                          style={{
                            width: 74, background: '#faf9f6', border: '1px solid #e3ded3', borderRadius: 8,
                            color: COLORS[key], fontFamily: "'IBM Plex Mono',monospace", fontSize: 14,
                            fontWeight: 600, textAlign: 'center', padding: '7px 4px', outline: 'none',
                          }}
                        />
                        <span style={{ color: '#b3ada3' }}>—</span>
                        <input
                          data-r="snum"
                          type="number" step="0.01" min={lo} max={hi}
                          key={`${key}-max-${mx}`}
                          defaultValue={mx.toFixed(2)}
                          onBlur={e => applyInput(key, 'max', e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                          style={{
                            width: 74, background: '#faf9f6', border: '1px solid #e3ded3', borderRadius: 8,
                            color: COLORS[key], fontFamily: "'IBM Plex Mono',monospace", fontSize: 14,
                            fontWeight: 600, textAlign: 'center', padding: '7px 4px', outline: 'none',
                          }}
                        />
                        <div style={{ marginLeft: 6, paddingLeft: 14, borderLeft: '1px solid #e3ded3', textAlign: 'right', minWidth: 64 }}>
                          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 16, fontWeight: 600, color: COLORS[key], lineHeight: 1 }}>
                            {cv.pct.toFixed(1)}%
                          </div>
                          <div style={{ fontSize: 11, color: '#b3ada3', marginTop: 3 }}>占 {cv.n.toLocaleString()} 场</div>
                        </div>
                      </div>
                    </div>

                    <svg viewBox="0 0 100 46" preserveAspectRatio="none" style={{ width: '100%', height: 25, display: 'block', marginBottom: 0 }}>
                      <path d={grayPath} fill="#e6e0d4" />
                      <path d={colorPath} fill={COLORS[key]} />
                    </svg>

                    <div
                      ref={el => { if (el) tracksRef.current[key] = el; }}
                      onPointerDown={e => trackDown(e, key)}
                      style={{ position: 'relative', height: 16, cursor: 'pointer', touchAction: 'none' }}
                    >
                      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 4, background: '#ece8e0', borderRadius: 2 }} />
                      <div style={{
                        position: 'absolute', top: 0, height: 4, borderRadius: 2,
                        background: COLORS[key], opacity: 0.9,
                        left: `${minPct}%`, width: `${maxPct - minPct}%`,
                      }} />
                      <div
                        onPointerDown={e => startDrag(e, key, 'min')}
                        style={{
                          position: 'absolute', top: -5, width: 14, height: 14, borderRadius: '50%',
                          background: '#ffffff', border: `2px solid ${COLORS[key]}`,
                          boxShadow: '0 2px 5px rgba(40,34,20,.18)',
                          transform: 'translateX(-50%)', cursor: 'grab', touchAction: 'none',
                          left: `${minPct}%`,
                        }}
                      />
                      <div
                        onPointerDown={e => startDrag(e, key, 'max')}
                        style={{
                          position: 'absolute', top: -5, width: 14, height: 14, borderRadius: '50%',
                          background: '#ffffff', border: `2px solid ${COLORS[key]}`,
                          boxShadow: '0 2px 5px rgba(40,34,20,.18)',
                          transform: 'translateX(-50%)', cursor: 'grab', touchAction: 'none',
                          left: `${maxPct}%`,
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#b3ada3', marginTop: 4 }}>
                      <span>{lo.toFixed(2)}</span>
                      <span>{hi.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #ece8e0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: '#79736a' }}>范围内结果分布</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: '#79736a' }}>
                匹配 <span style={{ color: '#211f1c', fontWeight: 600, fontSize: 16 }}>{total.toLocaleString()}</span> 场
              </div>
            </div>

            <div data-r="grid3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 14 }}>
              {stats.map(st => (
                <div key={st.name} style={{
                  background: '#faf9f6', border: '1px solid #ece8e0', borderRadius: 12,
                  padding: '15px 20px', borderTop: `3px solid ${st.color}`,
                }}>
                  <div style={{ fontSize: 13, color: '#79736a', fontWeight: 600, marginBottom: 6 }}>{st.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span data-r="statnum" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 30, fontWeight: 600, color: st.color, lineHeight: 1 }}>{st.pct}</span>
                    <span style={{ fontSize: 16, color: '#b3ada3' }}>%</span>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#b3ada3', marginTop: 6 }}>{st.count.toLocaleString()} 场</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: '#ece8e0' }}>
              <div style={{ background: COLORS.h, width: `${p(counts.H)}%` }} />
              <div style={{ background: COLORS.d, width: `${p(counts.D)}%` }} />
              <div style={{ background: COLORS.a, width: `${p(counts.A)}%` }} />
            </div>
          </div>

          {/* Table */}
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #ece8e0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: '#79736a' }}>满足条件的比赛</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#b3ada3' }}>{tableNote}</div>
            </div>
            <MatchTable rows={rows} />
            {pageCount > 1 && <Pagination page={page} pageCount={pageCount} goPage={goPage} />}
          </div>
        </>
      )}
    </section>
  );
}
