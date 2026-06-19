import { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_LEAGUES, categorizeLeagues } from '../utils/leagues';
import { KEYS } from '../utils/calc';
import { computeHistogram } from '../utils/histogram';

const VALID = `h IS NOT NULL AND win_flag IN ('H','D','A') AND sections_no999 IS NOT NULL AND sections_no999 != '无效场次'`;
const DB_FILE = '/lottery.db';
const PAGE_SIZE = 50;

export { VALID, PAGE_SIZE };

export function useDatabase() {
  const dbRef = useRef(null);
  const [status, setStatus] = useState({ loading: true, error: null, loaded: false });
  const [meta, setMeta] = useState({ totalValid: 0, dateNote: '' });
  const [allLeagues, setAllLeagues] = useState([]);
  const [leagueCount, setLeagueCount] = useState({});
  const [selected, setSelected] = useState({});
  const [bounds, setBounds] = useState({ h: [1, 50], d: [1, 50], a: [1, 50] });
  const [ranges, setRanges] = useState({ h: [1, 50], d: [1, 50], a: [1, 50] });
  const [histograms, setHistograms] = useState({});
  const [totalLeague, setTotalLeague] = useState(0);
  const [queryResult, setQueryResult] = useState({ counts: { H: 0, D: 0, A: 0 }, total: 0, rows: [], pageCount: 1 });
  const [cover, setCover] = useState({ h: { pct: 0, n: 0 }, d: { pct: 0, n: 0 }, a: { pct: 0, n: 0 } });
  const [page, setPage] = useState(0);
  const whereRef = useRef('');

  useEffect(() => {
    loadDb();
  }, []);

  async function loadDb() {
    try {
      const SQL = await window.initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}` });
      const buf = await (await fetch(DB_FILE)).arrayBuffer();
      const db = new SQL.Database(new Uint8Array(buf));
      dbRef.current = db;

      const one = (sql) => { const r = db.exec(sql); return r[0] ? r[0].values[0] : []; };

      const mm = one(`SELECT MIN(h),MAX(h),MIN(d),MAX(d),MIN(a),MAX(a) FROM matches WHERE ${VALID}`);
      const b = { h: [mm[0], mm[1]], d: [mm[2], mm[3]], a: [mm[4], mm[5]] };
      setBounds(b);
      setRanges({ h: [...b.h], d: [...b.d], a: [...b.a] });

      const tv = one(`SELECT COUNT(*) FROM matches WHERE ${VALID}`)[0];
      const dr = one(`SELECT MIN(match_date), MAX(match_date) FROM matches WHERE ${VALID}`);
      setMeta({ totalValid: tv.toLocaleString(), dateNote: `${dr[0]} ~ ${dr[1]}` });

      const lr = db.exec(`SELECT league_name_abbr, COUNT(*) c FROM matches WHERE ${VALID} GROUP BY league_name_abbr ORDER BY c DESC`);
      const leagues = [];
      const lc = {};
      if (lr[0]) lr[0].values.forEach(([name, c]) => {
        if (name == null || name === '') return;
        leagues.push(name);
        lc[name] = c;
      });
      setAllLeagues(leagues);
      setLeagueCount(lc);

      const sel = {};
      DEFAULT_LEAGUES.forEach(l => { if (lc[l] != null) sel[l] = true; });
      setSelected(sel);

      computeHist(db, leagues, sel, b);
      runQueryInternal(db, b, { h: [...b.h], d: [...b.d], a: [...b.a] }, leagues, sel, 0);
      setStatus({ loading: false, error: null, loaded: true });
    } catch (e) {
      setStatus({ loading: false, error: '读取数据库出错：' + e.message, loaded: false });
    }
  }

  function computeHist(db, leagues, sel, bds) {
    if (!db) return;
    const picked = leagues.filter(l => sel[l]);
    const inList = picked.length ? `(${picked.map(l => `'${l.replace(/'/g, "''")}'`).join(',')})` : `('')`;
    const r = db.exec(`SELECT h,d,a FROM matches WHERE ${VALID} AND league_name_abbr IN ${inList}`);
    const vals = r[0] ? r[0].values : [];
    setTotalLeague(vals.length);

    const hists = {};
    KEYS.forEach((key, ci) => {
      const col = vals.map(row => row[ci]);
      hists[key] = computeHistogram(col, bds[key]);
    });
    setHistograms(hists);
  }

  function runQueryInternal(db, bds, rngs, leagues, sel, pg) {
    if (!db) return;
    const picked = leagues.filter(l => sel[l]);
    const inList = picked.length ? `(${picked.map(l => `'${l.replace(/'/g, "''")}'`).join(',')})` : `('')`;
    const where = `${VALID} AND league_name_abbr IN ${inList}`
      + ` AND h BETWEEN ${rngs.h[0]} AND ${rngs.h[1]}`
      + ` AND d BETWEEN ${rngs.d[0]} AND ${rngs.d[1]}`
      + ` AND a BETWEEN ${rngs.a[0]} AND ${rngs.a[1]}`;
    whereRef.current = where;

    const counts = { H: 0, D: 0, A: 0 };
    const cr = db.exec(`SELECT win_flag, COUNT(*) FROM matches WHERE ${where} GROUP BY win_flag`);
    if (cr[0]) cr[0].values.forEach(([f, n]) => { counts[f] = n; });
    const total = counts.H + counts.D + counts.A;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const off = pg * PAGE_SIZE;
    const tr = db.exec(`SELECT match_date, league_name_abbr, home_team, away_team, h, d, a, sections_no999, win_flag FROM matches WHERE ${where} ORDER BY match_date DESC LIMIT ${PAGE_SIZE} OFFSET ${off}`);
    const rows = tr[0] ? tr[0].values : [];

    // coverage
    const cv = {};
    const tl = db.exec(`SELECT COUNT(*) FROM matches WHERE ${VALID} AND league_name_abbr IN ${inList}`);
    const totalL = tl[0] ? tl[0].values[0][0] : 0;
    KEYS.forEach(k => {
      const [mn, mx] = rngs[k];
      const c = db.exec(`SELECT COUNT(*) FROM matches WHERE ${VALID} AND league_name_abbr IN ${inList} AND ${k} BETWEEN ${mn} AND ${mx}`);
      const n = c[0] ? c[0].values[0][0] : 0;
      cv[k] = { pct: totalL ? (n / totalL * 100) : 0, n };
    });
    setCover(cv);

    setQueryResult({ counts, total, rows, pageCount });
    setPage(pg);
  }

  const runQuery = useCallback((newRanges, newSelected, newPage) => {
    const db = dbRef.current;
    if (!db) return;
    const rngs = newRanges || ranges;
    const sel = newSelected !== undefined ? newSelected : selected;
    const pg = newPage !== undefined ? newPage : 0;
    runQueryInternal(db, bounds, rngs, allLeagues, sel, pg);
  }, [bounds, allLeagues, ranges, selected]);

  const updateSelection = useCallback((newSel) => {
    setSelected(newSel);
    const db = dbRef.current;
    if (!db) return;
    computeHist(db, allLeagues, newSel, bounds);
    runQueryInternal(db, bounds, ranges, allLeagues, newSel, 0);
  }, [allLeagues, bounds, ranges]);

  const updateRanges = useCallback((newRanges) => {
    setRanges(newRanges);
    const db = dbRef.current;
    if (!db) return;
    runQueryInternal(db, bounds, newRanges, allLeagues, selected, 0);
  }, [allLeagues, bounds, selected]);

  const goPage = useCallback((pg) => {
    const db = dbRef.current;
    if (!db) return;
    const clamped = Math.max(0, Math.min(pg, queryResult.pageCount - 1));
    runQueryInternal(db, bounds, ranges, allLeagues, selected, clamped);
  }, [bounds, ranges, allLeagues, selected, queryResult.pageCount]);

  const resetRanges = useCallback(() => {
    const newRanges = { h: [...bounds.h], d: [...bounds.d], a: [...bounds.a] };
    setRanges(newRanges);
    const db = dbRef.current;
    if (!db) return;
    runQueryInternal(db, bounds, newRanges, allLeagues, selected, 0);
  }, [bounds, allLeagues, selected]);

  const catGroups = categorizeLeagues(allLeagues);

  return {
    db: dbRef,
    status, meta, allLeagues, leagueCount, selected, bounds, ranges,
    histograms, totalLeague, queryResult, cover, page, catGroups,
    updateSelection, updateRanges, goPage, resetRanges, VALID,
  };
}
