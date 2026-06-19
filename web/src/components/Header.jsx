export default function Header({ dateNote, totalValid }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      gap: 24, paddingBottom: 16, borderBottom: '1px solid #e3ded3', marginBottom: 18,
    }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', color: '#a8a298', fontWeight: 700, marginBottom: 7 }}>
          竞彩 · 赌球劝退器
        </div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.05 }}>
          收手吧，阿祖！
        </h1>
        <p style={{ margin: '9px 0 0', color: '#79736a', fontSize: 14, maxWidth: 620, lineHeight: 1.5 }}>
          收手吧阿祖，你不记得你"3000 万，德国赢"了吗？干不赢大老庄的！
        </p>
      </div>
      <div style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono',monospace", color: '#a8a298', fontSize: 12, lineHeight: 1.8, whiteSpace: 'nowrap' }}>
        <div>{dateNote}</div>
        <div>有效样本 <span style={{ color: '#211f1c', fontWeight: 600 }}>{totalValid}</span> 场</div>
      </div>
    </header>
  );
}
