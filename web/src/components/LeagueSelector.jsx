import { useState, useCallback } from 'react';

export default function LeagueSelector({ catGroups, allLeagues, leagueCount, selected, updateSelection }) {
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState({ '五大联赛': true });

  const selectedCount = allLeagues.filter(l => selected[l]).length;

  const selectAll = useCallback(() => {
    const next = {};
    allLeagues.forEach(l => { next[l] = true; });
    updateSelection(next);
  }, [allLeagues, updateSelection]);

  const clearAll = useCallback(() => {
    updateSelection({});
  }, [updateSelection]);

  const toggleLeague = useCallback((l) => {
    updateSelection({ ...selected, [l]: !selected[l] });
  }, [selected, updateSelection]);

  const setCatLeagues = useCallback((leagues, on) => {
    const next = { ...selected };
    leagues.forEach(l => { next[l] = on; });
    updateSelection(next);
  }, [selected, updateSelection]);

  const btnBase = {
    background: '#f4f2ee', border: '1px solid #e3ded3', color: '#5d5750',
    fontFamily: "'Manrope',sans-serif", fontSize: 12, fontWeight: 600,
    padding: '6px 13px', borderRadius: 8, cursor: 'pointer',
  };

  return (
    <section style={{
      background: '#ffffff', border: '1px solid #e7e3da', borderRadius: 16,
      padding: '14px 22px', marginBottom: 16, boxShadow: '0 1px 2px rgba(40,34,20,.03)',
    }}>
      <div data-r="lghead" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: '#34312d', textTransform: 'uppercase' }}>联赛 / 赛事</div>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#b3ada3' }}>
            已选 {selectedCount} / {allLeagues.length}
          </span>
        </div>
        <div data-r="lgbtns" style={{ display: 'flex', gap: 8 }}>
          <button onClick={selectAll} style={btnBase}>全选</button>
          <button onClick={clearAll} style={btnBase}>清空</button>
          <button onClick={() => setOpen(!open)} style={{ ...btnBase, background: '#1b806a', borderColor: '#1b806a', color: '#fff' }}>
            {open ? '收起 ▾' : '展开 ▸'}
          </button>
        </div>
      </div>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 12 }}>
          {catGroups.map(g => {
            const sel = g.leagues.filter(l => selected[l]).length;
            const isOpen = !!catOpen[g.name];
            return (
              <div key={g.name}>
                <button
                  onClick={() => setCatOpen(prev => ({ ...prev, [g.name]: !prev[g.name] }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '9px 12px', background: isOpen ? '#faf9f6' : '#ffffff',
                    border: '1px solid #ece8e0', borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 11, color: '#b3ada3', width: 12 }}>{isOpen ? '▾' : '▸'}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#211f1c' }}>{g.name}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: sel > 0 ? '#1b806a' : '#c2bcb0' }}>
                    {sel} / {g.leagues.length}
                  </span>
                  <span style={{ flex: 1 }} />
                  <span onClick={(e) => { e.stopPropagation(); setCatLeagues(g.leagues, true); }}
                    style={{ fontSize: 11, fontWeight: 600, color: '#79736a', padding: '3px 8px', borderRadius: 6, cursor: 'pointer' }}>
                    全选
                  </span>
                  <span onClick={(e) => { e.stopPropagation(); setCatLeagues(g.leagues, false); }}
                    style={{ fontSize: 11, fontWeight: 600, color: '#79736a', padding: '3px 8px', borderRadius: 6, cursor: 'pointer' }}>
                    清空
                  </span>
                </button>
                {isOpen && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 4px 4px' }}>
                    {g.leagues.map(l => {
                      const isOn = !!selected[l];
                      const chipBase = 'display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;padding:5px 11px;border-radius:8px;cursor:pointer;';
                      return (
                        <button key={l} onClick={() => toggleLeague(l)} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 600,
                          padding: '5px 11px', borderRadius: 8, cursor: 'pointer',
                          background: isOn ? 'rgba(27,128,106,.10)' : '#faf9f6',
                          border: isOn ? '1px solid #1b806a' : '1px solid #e3ded3',
                          color: isOn ? '#15604f' : '#a8a298',
                        }}>
                          <span>{l}</span>
                          <span style={{
                            fontFamily: "'IBM Plex Mono',monospace", fontSize: 10.5,
                            color: isOn ? '#1b806a' : '#c2bcb0',
                          }}>
                            {(leagueCount[l] || 0).toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
