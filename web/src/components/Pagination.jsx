export default function Pagination({ page, pageCount, goPage }) {
  const curPage = page + 1;

  function buildPages(cur, count) {
    const out = [];
    if (count <= 7) { for (let i = 1; i <= count; i++) out.push(i); return out; }
    out.push(1);
    let s = Math.max(2, cur - 1), e = Math.min(count - 1, cur + 1);
    if (cur <= 3) { s = 2; e = 4; }
    if (cur >= count - 2) { s = count - 3; e = count - 1; }
    if (s > 2) out.push('…');
    for (let i = s; i <= e; i++) out.push(i);
    if (e < count - 1) out.push('…');
    out.push(count);
    return out;
  }

  const pageBtnBase = {
    minWidth: 34, height: 34, padding: '0 10px', borderRadius: 8,
    fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600,
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };

  const navBase = {
    height: 34, padding: '0 14px', borderRadius: 8,
    fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600,
    display: 'inline-flex', alignItems: 'center',
  };

  const pageItems = buildPages(curPage, pageCount);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 14, padding: '14px 24px', borderTop: '1px solid #ece8e0', flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#b3ada3' }}>
        第 {curPage} / {pageCount} 页
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <button
          onClick={() => goPage(page - 1)}
          disabled={curPage <= 1}
          style={{
            ...navBase,
            ...(curPage > 1
              ? { background: '#ffffff', border: '1px solid #e3ded3', color: '#5d5750', cursor: 'pointer' }
              : { background: '#f4f2ee', border: '1px solid #ece8e0', color: '#c2bcb0', cursor: 'not-allowed' }),
          }}
        >‹ 上一页</button>

        {pageItems.map((v, i) => {
          if (v === '…') {
            return <span key={`gap${i}`} style={{ minWidth: 20, textAlign: 'center', color: '#c2bcb0', fontFamily: "'IBM Plex Mono',monospace" }}>…</span>;
          }
          return (
            <button
              key={v}
              onClick={() => goPage(v - 1)}
              style={{
                ...pageBtnBase,
                ...(v === curPage
                  ? { background: '#1b806a', border: '1px solid #1b806a', color: '#fff' }
                  : { background: '#ffffff', border: '1px solid #e3ded3', color: '#5d5750' }),
              }}
            >{v}</button>
          );
        })}

        <button
          onClick={() => goPage(page + 1)}
          disabled={curPage >= pageCount}
          style={{
            ...navBase,
            ...(curPage < pageCount
              ? { background: '#ffffff', border: '1px solid #e3ded3', color: '#5d5750', cursor: 'pointer' }
              : { background: '#f4f2ee', border: '1px solid #ece8e0', color: '#c2bcb0', cursor: 'not-allowed' }),
          }}
        >下一页 ›</button>
      </div>
    </div>
  );
}
