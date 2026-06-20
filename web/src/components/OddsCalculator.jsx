import { useState, useCallback } from 'react';
import { COLORS, NAMES, KEYS, calcFromOdds, fmtPct } from '../utils/calc';
import WeightedWinRate from './WeightedWinRate';
import MLPrediction from './MLPrediction';

export default function OddsCalculator({ db, selected, allLeagues, VALID }) {
  const [odds, setOdds] = useState({ h: '1.86', d: '3.00', a: '3.87' });
  const [neighbors, setNeighbors] = useState('800');

  const setOdd = useCallback((k, val) => {
    setOdds(prev => ({ ...prev, [k]: val }));
  }, []);

  const clearCalc = useCallback(() => {
    setOdds({ h: '', d: '', a: '' });
  }, []);

  const cr = calcFromOdds(odds.h, odds.d, odds.a);

  const cells = KEYS.map(k => ({
    k, name: NAMES[k], color: COLORS[k],
    inputVal: odds[k],
    be: fmtPct(cr.raw[k]),
    mk: fmtPct(cr.norm[k]),
    w: cr.norm[k] != null ? cr.norm[k] * 100 : 0,
  }));

  return (
    <section style={{
      background: '#ffffff', border: '1px solid #e7e3da', borderRadius: 16,
      padding: '18px 24px 20px', marginBottom: 16, boxShadow: '0 1px 2px rgba(40,34,20,.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: '#34312D', textTransform: 'uppercase' }}>
          输得明白吗？
        </div>
        <button onClick={clearCalc} style={{
          background: '#f4f2ee', border: '1px solid #e3ded3', color: '#5d5750',
          fontFamily: "'Manrope',sans-serif", fontSize: 12, fontWeight: 600,
          padding: '6px 13px', borderRadius: 8, cursor: 'pointer',
        }}>清空</button>
      </div>
      <p style={{ margin: '0 0 14px', color: '#b3ada3', fontSize: 13, lineHeight: 1.5 }}>
        输入一场比赛的胜/平/负赔率，计算各项的
        <span style={{ color: '#79736a', fontWeight: 600 }}>盈亏平衡概率</span>
        （1 ÷ 赔率）与
        <span style={{ color: '#79736a', fontWeight: 600 }}>去水后市场概率</span>
        （三者归一化到 100%）。
      </p>

      <div data-r="grid3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {cells.map(c => (
          <div key={c.k} style={{
            background: '#faf9f6', border: '1px solid #ece8e0', borderRadius: 14,
            padding: '14px 16px 13px', borderTop: `3px solid ${c.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#211f1c' }}>{c.name}</span>
            </div>
            <input
              type="number" step="0.01" placeholder="赔率"
              value={c.inputVal}
              onChange={e => setOdd(c.k, e.target.value)}
              style={{
                width: '100%', background: '#ffffff', border: '1px solid #e3ded3', borderRadius: 9,
                color: c.color, fontFamily: "'IBM Plex Mono',monospace", fontSize: 19, fontWeight: 600,
                textAlign: 'center', padding: '9px 4px', marginBottom: 11, outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11.5, color: '#b3ada3' }}>盈亏平衡</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 600, color: '#5d5750' }}>{c.be}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11.5, color: '#b3ada3' }}>去水市场</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 600, color: c.color }}>{c.mk}</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: '#ece8e0', marginTop: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: c.color, width: `${c.w}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px solid #ece8e0', fontSize: 13 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ color: '#b3ada3' }}>隐含概率合计</span>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 600, color: '#211f1c' }}>
            {cr.sum > 0 ? (cr.sum * 100).toFixed(1) + '%' : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ color: '#b3ada3' }}>水位 / 庄家利润</span>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 600, color: '#b4690e' }}>
            {cr.margin != null ? cr.margin.toFixed(1) + '%' : '—'}
          </span>
        </div>
      </div>

      <WeightedWinRate
        db={db} cr={cr} neighbors={neighbors} setNeighbors={setNeighbors}
        selected={selected} allLeagues={allLeagues} VALID={VALID}
      />

      <MLPrediction cr={cr} odds={odds} />
    </section>
  );
}
