import { useState, useCallback } from 'react';
import { COLORS, NAMES, KEYS, evCalc, fmtEv, POS, NEG, resultMeta } from '../utils/calc';
import { computeWeightedWinRate } from '../utils/weighted';
import MatchTable from './MatchTable';

export default function WeightedWinRate({ db, cr, neighbors, setNeighbors, selected, allLeagues, VALID }) {
  const [result, setResult] = useState(null);

  const canCompute = cr.allIn && parseInt(neighbors, 10) >= 2;

  const onCompute = useCallback(() => {
    if (!canCompute || !db.current) return;
    const picked = allLeagues.filter(l => selected[l]);
    const K = parseInt(neighbors, 10);
    const target = [cr.norm.h, cr.norm.d, cr.norm.a];
    const res = computeWeightedWinRate(db.current, target, K, picked, VALID);
    setResult(res);
  }, [canCompute, db, allLeagues, selected, neighbors, cr, VALID]);

  const btnStyle = canCompute
    ? { background: '#1b806a', border: '1px solid #1b806a', color: '#fff', fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: '.02em', padding: '9px 18px', borderRadius: 8, cursor: 'pointer' }
    : { background: '#f7f5f0', border: '1px solid #e7e2d8', color: '#c2bcb0', fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: '.02em', padding: '9px 18px', borderRadius: 8, cursor: 'not-allowed' };

  const rows = result && !result.error ? [
    { key: 'h', name: '主胜', color: COLORS.h, p: result.pH, n: result.cnt.H || 0, odds: cr.o.h },
    { key: 'd', name: '平局', color: COLORS.d, p: result.pD, n: result.cnt.D || 0, odds: cr.o.d },
    { key: 'a', name: '客胜', color: COLORS.a, p: result.pA, n: result.cnt.A || 0, odds: cr.o.a },
  ] : [];

  return (
    <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #ece8e0' }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: '#a8a298', textTransform: 'uppercase', marginBottom: 14 }}>
        加权综合胜率
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 12, color: '#b3ada3', whiteSpace: 'nowrap' }}>临近样本数量 K</span>
          <input
            type="number" step="50" min="2"
            value={neighbors}
            onChange={e => setNeighbors(e.target.value)}
            style={{
              width: 82, background: '#faf9f6', border: '1px solid #e3ded3', borderRadius: 8,
              color: '#211f1c', fontFamily: "'IBM Plex Mono',monospace", fontSize: 14,
              fontWeight: 600, textAlign: 'center', padding: '8px 4px', outline: 'none',
            }}
          />
        </div>
        <button onClick={onCompute} style={btnStyle}>计算加权综合胜率</button>
        <div style={{ flex: 1, minWidth: 160, fontSize: 12, color: '#b3ada3', lineHeight: 1.5 }}>
          基于<span style={{ color: '#79736a', fontWeight: 600 }}>所选联赛</span>的历史样本，按去水概率距离做三次核加权。
        </div>
      </div>

      {result?.error && (
        <div style={{ marginTop: 16, color: '#a3392c', fontSize: 13 }}>{result.error}</div>
      )}

      {result && !result.error && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 2 }}>
              <span style={{ fontSize: 11, color: '#b3ada3' }}>加权胜率 · 理论回报率</span>
            </div>
            {rows.map(wr => {
              const ev = evCalc(wr.p, wr.odds);
              const evColor = ev != null ? (ev > 0 ? POS : (ev < 0 ? NEG : '#79736a')) : '#b3ada3';
              return (
                <div key={wr.key} style={{
                  background: '#faf9f6', border: '1px solid #ece8e0', borderRadius: 12,
                  borderLeft: `3px solid ${wr.color}`, padding: '10px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#211f1c', width: 34, flex: 'none' }}>{wr.name}</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, width: 74, flex: 'none' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 25, fontWeight: 600, color: wr.color, lineHeight: 1 }}>
                        {(wr.p * 100).toFixed(1)}
                      </span>
                      <span style={{ fontSize: 13, color: '#b3ada3' }}>%</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 40, height: 6, borderRadius: 3, background: '#ece8e0', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: wr.color, width: `${wr.p * 100}%` }} />
                    </div>
                    <div style={{ textAlign: 'right', width: 96, flex: 'none' }}>
                      <div style={{ fontSize: 10, color: '#b3ada3', marginBottom: 2 }}>理论回报率</div>
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 600, color: evColor }}>
                        {fmtEv(ev)}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#b3ada3', margin: '6px 0 0 50px' }}>
                    实际场次 {wr.n} 场
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: '#79736a', lineHeight: 1.7, marginBottom: 14 }}>
            最近 {result.K.toLocaleString()} 场近邻赔率范围 · 主胜 {result.range.h[0].toFixed(2)}–{result.range.h[1].toFixed(2)}　/　平局 {result.range.d[0].toFixed(2)}–{result.range.d[1].toFixed(2)}　/　客胜 {result.range.a[0].toFixed(2)}–{result.range.a[1].toFixed(2)}
          </div>

          <div style={{
            display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'baseline',
            padding: '13px 18px', background: '#faf9f6', border: '1px solid #ece8e0', borderRadius: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 12.5, color: '#b3ada3' }}>有效样本量 N<sub>eff</sub></span>
              <span style={{
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 600,
                color: result.Neff >= 300 && result.Neff <= 500 ? POS : '#b4690e',
              }}>
                {result.Neff.toFixed(0)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 12.5, color: '#b3ada3' }}>纳入近邻</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 600, color: '#5d5750' }}>
                {result.included.toLocaleString()} / {result.K.toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 12.5, color: '#b3ada3' }}>样本池</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 600, color: '#5d5750' }}>
                {result.pool.toLocaleString()}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 200, fontSize: 12, color: '#79736a', lineHeight: 1.5 }}>
              {result.Neff < 300
                ? '有效样本偏低，建议增大近邻数量到 1000 或更多。'
                : result.Neff > 500
                  ? '有效样本偏高，可适当缩小近邻数量。'
                  : '有效样本量适中（300–500），结果较可靠。'}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: '#79736a' }}>历史近邻明细</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#b3ada3' }}>
                按赔率相似度排序 · 最近 {result.neighborRows.length} 场
              </span>
            </div>
            <MatchTable rows={result.neighborRows} maxHeight={360} />
          </div>
        </div>
      )}
    </div>
  );
}
