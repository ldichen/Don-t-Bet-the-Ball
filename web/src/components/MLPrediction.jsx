import { useState, useCallback } from 'react';
import { COLORS, KEYS, devig, fmtEv, POS, NEG } from '../utils/calc';

const MODEL_META = {
  market: { name: '去水市场基准', ll: 0.98976, br: 0.19682 },
  lr: { name: '逻辑回归', ll: 0.99198, br: 0.19718 },
  rf: { name: '随机森林', ll: 0.99716, br: 0.19837 },
  lgb: { name: 'LightGBM', ll: 0.99992, br: 0.19899 },
  cat: { name: 'CatBoost', ll: 0.99142, br: 0.19714 },
  ensemble: { name: '集成模型', ll: 0.99114, br: 0.19709 },
};
const ML_ORDER = ['market', 'lr', 'rf', 'lgb', 'cat', 'ensemble'];
const ML_OFF = {
  lr: [0.001, 0.038, -0.040],
  rf: [0.032, -0.017, -0.014],
  lgb: [-0.134, 0.016, 0.118],
  cat: [0.098, -0.028, -0.070],
};
const OUT_NAMES = ['主胜', '平局', '客胜'];
const OUT_COLORS = [COLORS.h, COLORS.d, COLORS.a];
const OUT_BG = ['rgba(27,128,106,.12)', 'rgba(180,105,14,.12)', 'rgba(47,95,208,.12)'];

export default function MLPrediction({ cr, odds }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiResult, setApiResult] = useState(null);
  const [apiError, setApiError] = useState(null);

  const mlAllIn = cr.allIn;

  const onRun = useCallback(async () => {
    if (!mlAllIn) return;
    setLoading(true);
    setApiError(null);
    try {
      const resp = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          h: parseFloat(odds.h),
          d: parseFloat(odds.d),
          a: parseFloat(odds.a),
          league: '',
        }),
      });
      if (!resp.ok) throw new Error(`API 返回 ${resp.status}`);
      const data = await resp.json();
      setApiResult(data);
      setShow(true);
    } catch (e) {
      setApiError('ML 预测服务未启动或请求失败：' + e.message);
      useFallback();
    }
    setLoading(false);
  }, [mlAllIn, odds]);

  function useFallback() {
    if (!cr.allIn) return;
    const market = [cr.norm.h, cr.norm.d, cr.norm.a];
    const oddsArr = [parseFloat(odds.h), parseFloat(odds.d), parseFloat(odds.a)];
    const probsByKey = {};
    ML_ORDER.forEach(k => {
      if (k === 'market') { probsByKey[k] = market; return; }
      if (k === 'ensemble') return;
      const off = ML_OFF[k];
      let pp = [market[0] + off[0], market[1] + off[1], market[2] + off[2]].map(x => Math.max(0.003, x));
      const s2 = pp[0] + pp[1] + pp[2];
      probsByKey[k] = pp.map(x => x / s2);
    });
    const ens = [0, 0, 0];
    ['market', 'lr', 'cat', 'rf'].forEach(k => { for (let i = 0; i < 3; i++) ens[i] += probsByKey[k][i] / 4; });
    probsByKey['ensemble'] = ens;

    const fallbackData = { models: {} };
    ML_ORDER.forEach(k => {
      const p = probsByKey[k];
      const ev = p.map((pi, i) => pi * oddsArr[i] - 1);
      fallbackData.models[k] = {
        name: MODEL_META[k].name,
        probs: { H: p[0], D: p[1], A: p[2] },
        ev: { H: ev[0], D: ev[1], A: ev[2] },
        log_loss: MODEL_META[k].ll,
        brier: MODEL_META[k].br,
      };
    });
    setApiResult(fallbackData);
    setShow(true);
  }

  const btnStyle = mlAllIn
    ? { background: '#1b806a', border: '1px solid #1b806a', color: '#fff', fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: '.02em', padding: '9px 18px', borderRadius: 8, cursor: 'pointer' }
    : { background: '#f7f5f0', border: '1px solid #e7e2d8', color: '#c2bcb0', fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: '.02em', padding: '9px 18px', borderRadius: 8, cursor: 'not-allowed' };

  let modelRows = [];
  if (show && apiResult) {
    const oddsArr = [parseFloat(odds.h), parseFloat(odds.d), parseFloat(odds.a)];
    const PREFERRED_ORDER = ['market', 'lr', 'rf', 'lgb', 'cat', 'knn', 'ensemble'];
    const keys = Object.keys(apiResult.models).sort((a, b) => {
      const ai = PREFERRED_ORDER.indexOf(a), bi = PREFERRED_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    const recs = keys.map(k => {
      const m = apiResult.models[k];
      const p = [m.probs.H, m.probs.D, m.probs.A];
      const ev = [m.ev.H, m.ev.D, m.ev.A];
      return { k, name: m.name, p, ev, ll: m.log_loss, br: m.brier };
    });

    const argmax = (f) => { let bi = 0, bv = -Infinity; recs.forEach((r, i) => { const v = f(r); if (v > bv) { bv = v; bi = i; } }); return bi; };
    const argmin = (f) => { let bi = 0, bv = Infinity; recs.forEach((r, i) => { const v = f(r); if (v < bv) { bv = v; bi = i; } }); return bi; };
    const best = {
      ph: argmax(r => r.p[0]), pd: argmax(r => r.p[1]), pa: argmax(r => r.p[2]),
      evh: argmax(r => r.ev[0]), evd: argmax(r => r.ev[1]), eva: argmax(r => r.ev[2]),
      ll: argmin(r => r.ll), br: argmin(r => r.br),
    };

    const cell = (txt, isBest) => ({ txt, color: isBest ? '#1b806a' : '#5d5750', weight: isBest ? 700 : 500 });
    const evTxt = (e) => (e >= 0 ? '+' : '') + (e * 100).toFixed(1) + '%';

    modelRows = recs.map((r, i) => {
      let bestI = 0, bestEv = -Infinity;
      r.ev.forEach((e, j) => { if (e > bestEv) { bestEv = e; bestI = j; } });
      const bet = bestEv > 0;
      return {
        key: r.k, name: r.name,
        rowStyle: r.k === 'ensemble' ? { borderTop: '1px solid #e3ded3', background: '#faf7f2' } : { borderTop: '1px solid #f1ede4' },
        ll: cell(r.ll.toFixed(5), i === best.ll),
        br: cell(r.br.toFixed(5), i === best.br),
        ph: cell((r.p[0] * 100).toFixed(1) + '%', i === best.ph),
        pd: cell((r.p[1] * 100).toFixed(1) + '%', i === best.pd),
        pa: cell((r.p[2] * 100).toFixed(1) + '%', i === best.pa),
        evh: cell(evTxt(r.ev[0]), i === best.evh),
        evd: cell(evTxt(r.ev[1]), i === best.evd),
        eva: cell(evTxt(r.ev[2]), i === best.eva),
        sug: bet ? OUT_NAMES[bestI] : '不下注',
        sugColor: bet ? OUT_COLORS[bestI] : '#a8a298',
        sugBg: bet ? OUT_BG[bestI] : 'rgba(168,162,152,.14)',
      };
    });
  }

  return (
    <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #ece8e0' }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: '#a8a298', textTransform: 'uppercase', marginBottom: 14 }}>
        机器学习预测
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, flexWrap: 'wrap' }}>
        <button onClick={onRun} style={btnStyle} disabled={loading}>
          {loading ? '预测中…' : '运行模型预测'}
        </button>
        <div style={{ flex: 1, minWidth: 200, fontSize: 12, color: '#b3ada3', lineHeight: 1.5 }}>
          沿用上方输入的胜/平/负赔率，多个<span style={{ color: '#79736a', fontWeight: 600 }}>示意模型</span>给出概率预测、期望回报 EV 与下注建议；
          每列<span style={{ color: '#1b806a', fontWeight: 600 }}>最优值以绿色高亮</span>（概率/EV 取最高，LogLoss/Brier 取最低）。
        </div>
      </div>

      {apiError && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef3cd', border: '1px solid #ffc107', borderRadius: 8, fontSize: 12, color: '#856404' }}>
          {apiError}（已使用本地近似结果）
        </div>
      )}

      {show && modelRows.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: '#79736a', margin: '18px 0 12px' }}>各模型预测结果</div>
          <div style={{ overflowX: 'auto', border: '1px solid #ece8e0', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap', minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#faf9f6' }}>
                  <th style={{ textAlign: 'center', padding: '11px 16px', color: '#a8a298', fontWeight: 600 }}>模型名称</th>
                  <th style={{ textAlign: 'center', padding: '11px 13px', color: '#a8a298', fontWeight: 600 }}>LogLoss</th>
                  <th style={{ textAlign: 'center', padding: '11px 13px', color: '#a8a298', fontWeight: 600, borderRight: '1px solid #ece8e0' }}>Brier</th>
                  <th style={{ textAlign: 'center', padding: '11px 13px', color: COLORS.h, fontWeight: 600 }}>主胜概率</th>
                  <th style={{ textAlign: 'center', padding: '11px 13px', color: COLORS.d, fontWeight: 600 }}>平局概率</th>
                  <th style={{ textAlign: 'center', padding: '11px 13px', color: COLORS.a, fontWeight: 600, borderRight: '1px solid #ece8e0' }}>客胜概率</th>
                  <th style={{ textAlign: 'center', padding: '11px 13px', color: '#a8a298', fontWeight: 600 }}>EV 主胜</th>
                  <th style={{ textAlign: 'center', padding: '11px 13px', color: '#a8a298', fontWeight: 600 }}>EV 平局</th>
                  <th style={{ textAlign: 'center', padding: '11px 13px', color: '#a8a298', fontWeight: 600 }}>EV 客胜</th>
                  <th style={{ textAlign: 'center', padding: '11px 16px', color: '#a8a298', fontWeight: 600 }}>建议</th>
                </tr>
              </thead>
              <tbody>
                {modelRows.map(m => (
                  <tr key={m.key} style={m.rowStyle}>
                    <td style={{ padding: '11px 16px', textAlign: 'center', fontWeight: 600, color: '#211f1c' }}>{m.name}</td>
                    {[m.ll, m.br].map((c, i) => (
                      <td key={i} style={{
                        padding: '11px 13px', textAlign: 'center',
                        fontFamily: "'IBM Plex Mono',monospace", color: c.color, fontWeight: c.weight,
                        ...(i === 1 ? { borderRight: '1px solid #ece8e0' } : {}),
                      }}>{c.txt}</td>
                    ))}
                    {[m.ph, m.pd, m.pa].map((c, i) => (
                      <td key={`p${i}`} style={{
                        padding: '11px 13px', textAlign: 'center',
                        fontFamily: "'IBM Plex Mono',monospace", color: c.color, fontWeight: c.weight,
                        ...(i === 2 ? { borderRight: '1px solid #ece8e0' } : {}),
                      }}>{c.txt}</td>
                    ))}
                    {[m.evh, m.evd, m.eva].map((c, i) => (
                      <td key={`ev${i}`} style={{
                        padding: '11px 13px', textAlign: 'center',
                        fontFamily: "'IBM Plex Mono',monospace", color: c.color, fontWeight: c.weight,
                      }}>{c.txt}</td>
                    ))}
                    <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 12px', borderRadius: 20,
                        fontSize: 12, fontWeight: 700, color: m.sugColor, background: m.sugBg,
                      }}>{m.sug}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 11.5, color: '#b3ada3', lineHeight: 1.5 }}>
            LogLoss / Brier 基于 8,886 场测试集（2024-07 ~ 2026-06）评估，固定不变；两项均越低越好。
          </p>
        </>
      )}
    </div>
  );
}
