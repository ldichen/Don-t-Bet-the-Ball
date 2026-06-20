import { useDatabase } from './hooks/useDatabase';
import Header from './components/Header';
import LeagueSelector from './components/LeagueSelector';
import OddsCalculator from './components/OddsCalculator';
import OddsExplorer from './components/OddsExplorer';
import CoffeeHover from './components/CoffeeHover';
import Footer from './components/Footer';

export default function App() {
  const {
    db, status, meta, allLeagues, leagueCount, selected, bounds, ranges,
    histograms, totalLeague, queryResult, cover, page, catGroups,
    updateSelection, updateRanges, goPage, resetRanges, VALID,
  } = useDatabase();

  return (
    <div style={{
      minHeight: '100vh', background: '#f4f2ee', color: '#211f1c',
      fontFamily: "'Manrope',system-ui,sans-serif", padding: '26px 28px 44px',
    }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {status.loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '120px 0', color: '#a8a298' }}>
            <div style={{
              width: 34, height: 34, border: '3px solid #e3ded3', borderTopColor: '#1b806a',
              borderRadius: '50%', animation: 'spin .8s linear infinite',
            }} />
            <div style={{ fontSize: 14 }}>正在加载并解析数据库…</div>
          </div>
        )}

        {status.error && (
          <div style={{
            padding: 24, border: '1px solid #e6b3ac', borderRadius: 12,
            background: '#fbf0ee', color: '#a3392c',
            fontFamily: "'IBM Plex Mono',monospace", fontSize: 13,
          }}>
            {status.error}
          </div>
        )}

        {status.loaded && (
          <>
            <Header dateNote={meta.dateNote} totalValid={meta.totalValid} />

            <LeagueSelector
              catGroups={catGroups} allLeagues={allLeagues}
              leagueCount={leagueCount} selected={selected}
              updateSelection={updateSelection}
            />

            <OddsCalculator
              db={db} selected={selected} allLeagues={allLeagues} VALID={VALID}
            />

            <OddsExplorer
              bounds={bounds} ranges={ranges} histograms={histograms}
              cover={cover} queryResult={queryResult} page={page}
              updateRanges={updateRanges} resetRanges={resetRanges} goPage={goPage}
            />

            <CoffeeHover />
            <Footer />
          </>
        )}
      </div>
    </div>
  );
}
