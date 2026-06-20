import { useEffect, useRef } from 'react';

const STYLE_ID = 'os-style';
const STYLE_CSS =
  'html{scrollbar-width:none;-ms-overflow-style:none;}' +
  'html::-webkit-scrollbar{width:0;height:0;display:none;}' +
  '.os-host{scrollbar-width:none;-ms-overflow-style:none;}' +
  '.os-host::-webkit-scrollbar{width:0;height:0;display:none;}';

const THUMB_BASE = 'position:absolute;border-radius:7px;background:rgba(72,66,58,.4);opacity:0;transition:opacity .35s ease;pointer-events:none;z-index:60;';

function createWindowThumb() {
  const v = document.createElement('div');
  v.style.cssText = 'position:fixed;top:0;right:3px;width:7px;border-radius:7px;background:rgba(72,66,58,.42);opacity:0;transition:opacity .35s ease;pointer-events:none;z-index:2147483600;';
  document.body.appendChild(v);
  return v;
}

function updateWindowThumb(v) {
  const ch = window.innerHeight;
  const sh = document.documentElement.scrollHeight;
  if (sh > ch + 2) {
    const th = Math.max(34, ch * ch / sh);
    const top = (window.scrollY / (sh - ch)) * (ch - th);
    v.style.height = th + 'px';
    v.style.transform = 'translateY(' + top + 'px)';
    v.style.display = 'block';
  } else {
    v.style.display = 'none';
  }
}

function wireElement(el, recs) {
  if (el.__os) return;
  const cs = getComputedStyle(el);
  if (!/(auto|scroll)/.test(cs.overflowX) && !/(auto|scroll)/.test(cs.overflowY)) return;

  el.__os = true;
  el.classList.add('os-host');
  const wrap = el.parentElement;
  if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';

  const mk = (vert) => {
    const t = document.createElement('div');
    t.style.cssText = THUMB_BASE + (vert ? 'width:7px;' : 'height:7px;');
    wrap.appendChild(t);
    return t;
  };

  const rec = { el, wrap, v: mk(true), h: mk(false), t: null };

  el.addEventListener('scroll', () => {
    updateRec(rec);
    rec.v.style.opacity = rec.v.style.display === 'none' ? '0' : '1';
    rec.h.style.opacity = rec.h.style.display === 'none' ? '0' : '1';
    clearTimeout(rec.t);
    rec.t = setTimeout(() => { rec.v.style.opacity = '0'; rec.h.style.opacity = '0'; }, 1000);
  }, { passive: true });

  recs.push(rec);
  updateRec(rec);
}

function updateRec(rec) {
  const el = rec.el;
  const ox = el.offsetLeft, oy = el.offsetTop;
  const ch = el.clientHeight, sh = el.scrollHeight;
  const cw = el.clientWidth, sw = el.scrollWidth;
  if (sh > ch + 2) {
    const th = Math.max(30, ch * ch / sh);
    const top = oy + (el.scrollTop / (sh - ch)) * (ch - th);
    rec.v.style.height = th + 'px';
    rec.v.style.left = (ox + cw - 9) + 'px';
    rec.v.style.top = top + 'px';
    rec.v.style.display = 'block';
  } else { rec.v.style.display = 'none'; }
  if (sw > cw + 2) {
    const tw = Math.max(30, cw * cw / sw);
    const left = ox + (el.scrollLeft / (sw - cw)) * (cw - tw);
    rec.h.style.width = tw + 'px';
    rec.h.style.left = left + 'px';
    rec.h.style.top = (oy + ch - 9) + 'px';
    rec.h.style.display = 'block';
  } else { rec.h.style.display = 'none'; }
}

export function useOverlayScrollbars() {
  const recsRef = useRef([]);

  useEffect(() => {
    if (!document.getElementById(STYLE_ID)) {
      const st = document.createElement('style');
      st.id = STYLE_ID;
      st.textContent = STYLE_CSS;
      document.head.appendChild(st);
    }

    const winThumb = createWindowThumb();
    let winTimer;

    const onWinScroll = () => {
      updateWindowThumb(winThumb);
      winThumb.style.opacity = '1';
      clearTimeout(winTimer);
      winTimer = setTimeout(() => { winThumb.style.opacity = '0'; }, 1000);
    };
    const onResize = () => updateWindowThumb(winThumb);

    window.addEventListener('scroll', onWinScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    updateWindowThumb(winThumb);

    return () => {
      window.removeEventListener('scroll', onWinScroll);
      window.removeEventListener('resize', onResize);
      winThumb.remove();
      recsRef.current.forEach(r => { r.v.remove(); r.h.remove(); });
      recsRef.current = [];
    };
  }, []);

  const scan = () => {
    const page = document.querySelector('[data-r="page"]');
    if (!page) return;
    page.querySelectorAll('[style*="overflow"]').forEach(el => {
      wireElement(el, recsRef.current);
    });
    recsRef.current.forEach(r => { if (r.el.isConnected) updateRec(r); });
  };

  return scan;
}
