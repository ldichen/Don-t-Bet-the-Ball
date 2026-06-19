import { devig } from './calc';

export function computeWeightedWinRate(db, target, K, selectedLeagues, VALID) {
  const [tH, tD, tA] = target;
  const inList = selectedLeagues.length
    ? `(${selectedLeagues.map(l => `'${l.replace(/'/g, "''")}'`).join(',')})`
    : `('')`;

  const r = db.exec(
    `SELECT match_date, league_name_abbr, home_team, away_team, h, d, a, sections_no999, win_flag
     FROM matches WHERE ${VALID} AND league_name_abbr IN ${inList} AND h>1 AND d>1 AND a>1`
  );
  const vals = r[0] ? r[0].values : [];

  const arr = [];
  for (const v of vals) {
    const h = v[4], d = v[5], a = v[6], f = v[8];
    const [pH, pD, pA] = devig(h, d, a);
    const dist = Math.sqrt((pH - tH) ** 2 + (pD - tD) ** 2 + (pA - tA) ** 2);
    arr.push({ dist, f, h, d, a, v });
  }
  arr.sort((x, y) => x.dist - y.dist);

  const pool = arr.length;
  let k = K;
  if (k > pool) k = pool;
  if (k < 2) return { error: '样本池太小，无法计算。' };

  const cnt = { H: 0, D: 0, A: 0 };
  let hmin = Infinity, hmax = -Infinity, dmin = Infinity, dmax = -Infinity, amin = Infinity, amax = -Infinity;
  for (let i = 0; i < k; i++) {
    const t = arr[i];
    cnt[t.f] = (cnt[t.f] || 0) + 1;
    hmin = Math.min(hmin, t.h); hmax = Math.max(hmax, t.h);
    dmin = Math.min(dmin, t.d); dmax = Math.max(dmax, t.d);
    amin = Math.min(amin, t.a); amax = Math.max(amax, t.a);
  }

  const dK = arr[k - 1].dist || 1e-9;
  let sumW = 0, sumW2 = 0, wH = 0, wD = 0, wA = 0, included = 0;
  for (let i = 0; i < k; i++) {
    const di = arr[i].dist;
    if (di >= dK) continue;
    const u = di / dK;
    const w = Math.pow(1 - Math.pow(u, 3), 3);
    if (w <= 0) continue;
    sumW += w; sumW2 += w * w; included++;
    if (arr[i].f === 'H') wH += w;
    else if (arr[i].f === 'D') wD += w;
    else if (arr[i].f === 'A') wA += w;
  }

  const Neff = sumW2 ? (sumW * sumW) / sumW2 : 0;
  const neighborRows = arr.slice(0, Math.min(100, k)).map(t => t.v);

  return {
    pH: sumW ? wH / sumW : 0,
    pD: sumW ? wD / sumW : 0,
    pA: sumW ? wA / sumW : 0,
    Neff, K: k, included, pool,
    cnt,
    range: { h: [hmin, hmax], d: [dmin, dmax], a: [amin, amax] },
    neighborRows,
  };
}
