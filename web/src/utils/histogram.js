const BINS = 40;
const GAUSS_R = 2;

export function computeHistogram(values, bounds) {
  const [lo, hi] = bounds;
  const binW = (hi - lo) / BINS || 1;
  const counts = new Array(BINS).fill(0);
  for (const v of values) {
    if (v == null) continue;
    let idx = Math.floor((v - lo) / binW);
    if (idx < 0) idx = 0;
    if (idx >= BINS) idx = BINS - 1;
    counts[idx]++;
  }

  const gw = [];
  for (let j = -GAUSS_R; j <= GAUSS_R; j++) gw.push(Math.exp(-(j * j) / 2));
  const sm = counts.map((_, i) => {
    let s = 0, w = 0;
    for (let j = -GAUSS_R; j <= GAUSS_R; j++) {
      const k = i + j;
      if (k < 0 || k >= BINS) continue;
      s += counts[k] * gw[j + GAUSS_R];
      w += gw[j + GAUSS_R];
    }
    return w ? s / w : 0;
  });
  const mx = Math.max(1, ...sm);

  const H = 46, TOP = 2.5, N = 110;
  const pts = [];
  for (let p = 0; p < N; p++) {
    const x = (p / (N - 1)) * 100;
    const fb = (p / (N - 1)) * (BINS - 1);
    const i0 = Math.floor(fb), i1 = Math.min(BINS - 1, i0 + 1), t = fb - i0;
    const val = sm[i0] * (1 - t) + sm[i1] * t;
    const y = H - (val / mx) * (H - TOP);
    pts.push({ x: +x.toFixed(2), y: +y.toFixed(2) });
  }
  return { pts, H };
}

export function buildPaths(hist, minPct, maxPct) {
  if (!hist) return { grayPath: '', colorPath: '' };
  const { pts, H } = hist;

  const area = (ps) => ps.length
    ? `M${ps[0].x},${H} ` + ps.map(p => `L${p.x},${p.y}`).join(' ') + ` L${ps[ps.length - 1].x},${H} Z`
    : '';

  const yAt = (xq) => {
    if (xq <= pts[0].x) return pts[0].y;
    if (xq >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].x >= xq) {
        const a = pts[i - 1], b = pts[i], t = (xq - a.x) / (b.x - a.x);
        return +(a.y + (b.y - a.y) * t).toFixed(2);
      }
    }
    return pts[pts.length - 1].y;
  };

  const grayPath = area(pts);
  const inside = pts.filter(p => p.x > minPct && p.x < maxPct);
  const sel = [
    { x: +minPct.toFixed(2), y: yAt(minPct) },
    ...inside,
    { x: +maxPct.toFixed(2), y: yAt(maxPct) },
  ];
  const colorPath = area(sel);

  return { grayPath, colorPath };
}
