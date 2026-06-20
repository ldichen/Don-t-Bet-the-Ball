import { resultMeta, COLORS } from '../utils/calc';

export default function MatchTable({ rows, maxHeight = 560 }) {
  return (
    <div style={{ border: '1px solid #ece8e0', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto', maxHeight, overflowY: 'auto', background: '#faf9f6' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, background: '#faf9f6', zIndex: 1 }}>
              {['日期', '联赛', '主队', '客队'].map(h => (
                <th key={h} style={{ textAlign: 'center', padding: '10px 14px', color: '#a8a298', fontWeight: 600, borderBottom: '1px solid #ece8e0' }}>{h}</th>
              ))}
              <th style={{ textAlign: 'center', padding: '10px 14px', color: COLORS.h, fontWeight: 600, borderBottom: '1px solid #ece8e0' }}>主胜</th>
              <th style={{ textAlign: 'center', padding: '10px 14px', color: COLORS.d, fontWeight: 600, borderBottom: '1px solid #ece8e0' }}>平</th>
              <th style={{ textAlign: 'center', padding: '10px 14px', color: COLORS.a, fontWeight: 600, borderBottom: '1px solid #ece8e0' }}>客胜</th>
              <th style={{ textAlign: 'center', padding: '10px 14px', color: '#a8a298', fontWeight: 600, borderBottom: '1px solid #ece8e0' }}>比分</th>
              <th style={{ textAlign: 'center', padding: '10px 14px', color: '#a8a298', fontWeight: 600, borderBottom: '1px solid #ece8e0' }}>结果</th>
            </tr>
          </thead>
          <tbody style={{ background: '#fff' }}>
            {rows.map((v, i) => {
              const row = Array.isArray(v) ? v : null;
              if (!row) return null;
              const flag = row[8];
              const rm = resultMeta(flag);
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f1ede4' }}>
                  <td style={{ padding: '9px 14px', textAlign: 'center', fontFamily: "'IBM Plex Mono',monospace", color: '#a8a298' }}>{row[0]}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'center', color: '#5d5750' }}>{row[1] || '—'}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'center', color: '#211f1c', fontWeight: 500 }}>{row[2]}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'center', color: '#211f1c', fontWeight: 500 }}>{row[3]}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'center', fontFamily: "'IBM Plex Mono',monospace", color: '#5d5750' }}>{row[4] != null ? row[4].toFixed(2) : '—'}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'center', fontFamily: "'IBM Plex Mono',monospace", color: '#5d5750' }}>{row[5] != null ? row[5].toFixed(2) : '—'}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'center', fontFamily: "'IBM Plex Mono',monospace", color: '#5d5750' }}>{row[6] != null ? row[6].toFixed(2) : '—'}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'center', fontFamily: "'IBM Plex Mono',monospace", color: '#a8a298' }}>{row[7]}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 11px', borderRadius: 20,
                      fontSize: 12, fontWeight: 700, color: rm.color, background: rm.bg,
                    }}>{rm.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
