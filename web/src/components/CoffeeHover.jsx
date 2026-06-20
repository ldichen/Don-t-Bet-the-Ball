import { useState } from 'react';

const qrStyle = {
  width: 132, height: 132, objectFit: 'cover', borderRadius: 10,
  border: '1px solid #ece8e0', display: 'block',
};

export default function CoffeeHover() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
      <div
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{ position: 'relative', display: 'inline-flex' }}
      >
        {/* Popup */}
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 14px)', left: '50%',
          transform: `translateX(-50%) translateY(${open ? '0px' : '10px'}) scale(${open ? 1 : 0.82})`,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'transform .34s cubic-bezier(0.34,1.56,0.64,1), opacity .22s ease',
          transformOrigin: 'bottom center',
        }}>
          <div data-r="qr" style={{
            background: '#fff', border: '1px solid #e7e3da', borderRadius: 16,
            boxShadow: '0 16px 40px rgba(40,34,20,.18)',
            padding: 16, display: 'flex', gap: 16, whiteSpace: 'nowrap',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
              <img src="/wechat-pay.jpg" alt="微信支付" style={{ ...qrStyle, objectFit: 'cover' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1b9c4a' }}>微信扫一扫</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
              <img src="/bmc_qr.png" alt="Buy Me a Coffee" style={{ ...qrStyle, objectFit: 'contain', background: '#fff' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#b78a00' }}>Buy Me a Coffee</span>
            </div>
          </div>
          {/* Arrow */}
          <div style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: 14, height: 14, background: '#fff',
            borderRight: '1px solid #e7e3da', borderBottom: '1px solid #e7e3da',
            marginTop: -7,
          }} />
        </div>

        {/* Trigger text */}
        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, cursor: 'pointer', padding: '4px 2px' }}>
          <span data-r="coffeelink" style={{
            fontFamily: "'Pinyon Script',cursive", fontSize: 25, fontWeight: 400,
            lineHeight: 1, letterSpacing: '.01em', color: '#6b6359',
            paddingBottom: 4, transition: 'color .2s ease',
            ...(open ? { color: '#1b806a' } : {}),
          }}>
            Dodged a bad bet? Buy me a coffee ☕
          </span>
        </div>
      </div>
    </div>
  );
}
