const linkStyle = {
  display: 'flex', alignItems: 'center', gap: 6,
  color: '#5d5750', textDecoration: 'none', fontWeight: 600, fontSize: 13,
};

export default function Footer() {
  return (
    <footer style={{
      marginTop: 40, paddingTop: 22, borderTop: '1px solid #e3ded3',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 20, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <img src="/logo-dc.png" alt="DC" style={{ height: 26, width: 'auto', display: 'block', flexShrink: 0 }} />
        <div style={{
          fontSize: 12, color: '#b3ada3', lineHeight: 1.55,
          borderLeft: '1px solid #e3ded3', paddingLeft: 11,
        }}>
          <div style={{ color: '#79736a', fontWeight: 600 }}>赌球劝退器</div>
          <div>数据为历史样本统计，仅供研究，不构成任何投注建议。</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', fontSize: 13 }}>
        <a href="https://github.com/ldichen" target="_blank" rel="noopener noreferrer" style={linkStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05a9.4 9.4 0 0 1 2.5-.34c.85 0 1.71.12 2.5.34 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2z" />
          </svg>
          ldichen
        </a>
        <a href="https://x.com/liu_dichen" target="_blank" rel="noopener noreferrer" style={linkStyle}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.22-6.82-5.97 6.82H1.66l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.83L7.01 4.13H5.04l12.04 15.64z" />
          </svg>
          liu_dichen
        </a>
        <a href="mailto:ldicccccc@gmail.com" style={linkStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3.5 6.5l8.5 6 8.5-6" />
          </svg>
          邮件
        </a>
        <span style={{ color: '#c2bcb0', fontFamily: "'IBM Plex Mono',monospace", fontSize: 12 }}>MIT License</span>
      </div>
    </footer>
  );
}
