export const COLORS = { h: '#1b806a', d: '#b4690e', a: '#2f5fd0' };
export const POS = '#1b806a';
export const NEG = '#c0392b';
export const NAMES = { h: '主胜', d: '平局', a: '客胜' };
export const KEYS = ['h', 'd', 'a'];
export const FLAGS = ['H', 'D', 'A'];

export function parseOdds(s) {
  const v = parseFloat(s);
  return isFinite(v) && v > 1 ? v : null;
}

export function devig(h, d, a) {
  const rH = 1 / h, rD = 1 / d, rA = 1 / a, s = rH + rD + rA;
  return [rH / s, rD / s, rA / s];
}

export function calcFromOdds(hStr, dStr, aStr) {
  const o = { h: parseOdds(hStr), d: parseOdds(dStr), a: parseOdds(aStr) };
  const raw = { h: o.h ? 1 / o.h : null, d: o.d ? 1 / o.d : null, a: o.a ? 1 / o.a : null };
  const sum = KEYS.reduce((s, k) => s + (raw[k] || 0), 0);
  const allIn = !!(o.h && o.d && o.a);
  const norm = {};
  KEYS.forEach(k => { norm[k] = allIn && sum ? raw[k] / sum : null; });
  return { o, raw, sum, allIn, norm, margin: allIn ? (sum - 1) * 100 : null };
}

export function evCalc(prob, odds) {
  if (prob == null || !odds) return null;
  return prob * odds - 1;
}

export function fmtPct(x) {
  return x == null ? '—' : (x * 100).toFixed(1) + '%';
}

export function fmtEv(ev) {
  if (ev == null) return '—';
  return (ev >= 0 ? '+' : '') + (ev * 100).toFixed(1) + '%';
}

export function resultMeta(flag) {
  const map = {
    H: { label: '主胜', color: COLORS.h, bg: 'rgba(27,128,106,.12)' },
    D: { label: '平局', color: COLORS.d, bg: 'rgba(180,105,14,.12)' },
    A: { label: '客胜', color: COLORS.a, bg: 'rgba(47,95,208,.12)' },
  };
  return map[flag] || { label: '—', color: '#a8a298', bg: 'rgba(168,162,152,.14)' };
}
