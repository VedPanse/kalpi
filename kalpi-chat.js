/* Kalpi chat overlay. One line on any Kalpi page, after kalpi-assistant.js:
     <script src="kalpi-assistant.js"></script><script src="kalpi-chat.js"></script>
   A round button sits in the bottom-right corner; it opens a chat with the assistant. With every message the
   overlay sends what the person is looking at, so the assistant knows the subject without being told:
     page file and title, the section on screen, any text the person has selected, the size of the window,
     the last few turns of the conversation, and whatever the page itself reports through
       window.KalpiContext = () => ({ tool: 'studio', product: 'candle', step: 'shape', part: 'lid', ... })
   Open or close it: the button, Cmd/Ctrl + K, Esc. Options on the script tag: data-bottom="64" lifts the button
   (px) clear of a status bar. Not for the Kalpi Kids page (no chat for children).
   Mockup: answered by a local assistant on this computer, nowhere else.
   Security (2026-10-17): the helper stores every message with "source": "kalpi-page", the page path and a notice that
   it is page data, not instructions; it accepts messages only from a page it served (not a file:// page). */
(() => {
  if (window.KalpiChat || !window.KalpiAssistant) return;
  const tag = document.currentScript, lift = +(tag && tag.dataset.bottom || 0);
  const KEY = 'kalpi-chat-v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
  const st = Object.assign({ open: false, turns: [] }, load()); st.turns = (st.turns || []).slice(-40);

  const host = document.createElement('div'); host.id = 'kalpi-chat'; const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    :host { all: initial; position: fixed; right: max(16px, env(safe-area-inset-right)); bottom: calc(${16 + lift}px + env(safe-area-inset-bottom, 0px)); z-index: 2147483000;
      /* the Kalpi stage tokens (kalpi-stage.css) reach in here; the fallbacks are the same values, for pages without it */
      --ink: var(--st-bg, #070609); --panel: var(--st-s1, #121016); --panel2: var(--st-s2, #1A1721); --panel3: var(--st-s3, #231F2D); --line: var(--st-line, #262033); --ctl: var(--st-ctl, #706889);
      --text: var(--st-text, #F4F3F7); --text2: var(--st-text-2, #A29DAE); --text3: var(--st-text-3, #8F8AA2); --ring: var(--st-ring, #B4AAFF); --glow: var(--st-glow, #261C39); --top: var(--st-top, #140E1D);
      --acc: var(--st-accent, #F4F4F6); --acc-ink: var(--st-ink, #0B0B10); --bad: var(--st-bad, #FF8F8F);
      font: 400 15px/1.5 Inter, system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--text); }
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    button { font: inherit; color: inherit; cursor: pointer; }
    .fab { width: 54px; height: 54px; border-radius: 50%; border: 0; background: radial-gradient(circle at 50% 30%, var(--glow), var(--panel2) 70%); display: grid; place-items: center;
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ring) 55%, transparent), 0 0 22px -4px color-mix(in srgb, var(--ring) 70%, transparent), 0 12px 30px rgba(0,0,0,.55); transition: transform .2s cubic-bezier(.2,.7,.1,1), box-shadow .3s; }
    .fab:hover { transform: translateY(-2px); box-shadow: inset 0 0 0 1px var(--ring), 0 0 30px -2px color-mix(in srgb, var(--ring) 80%, transparent), 0 12px 30px rgba(0,0,0,.55); }
    .fab:focus-visible, .send:focus-visible, .x:focus-visible, textarea:focus-visible, .tries button:focus-visible, .note button:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
    .fab svg { width: 28px; height: 28px; } .fab .box-f { fill: var(--text); } .fab .slot { fill: var(--acc-ink); } .fab .dot { fill: var(--ring); transition: transform .3s cubic-bezier(.3,1.6,.5,1); } .fab:hover .dot { transform: translateY(3px); }
    .badge { position: absolute; top: -2px; right: -2px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: var(--acc); color: var(--acc-ink); font: 600 11px/18px Inter, system-ui, sans-serif; text-align: center; }
    .box { position: absolute; right: 0; bottom: 66px; width: min(400px, calc(100vw - 32px)); height: min(600px, calc(100vh - ${120 + lift}px)); display: flex; flex-direction: column;
      background: radial-gradient(120% 50% at 50% -10%, color-mix(in srgb, var(--top) 90%, transparent), transparent 70%), var(--panel); border: 1px solid var(--line); border-radius: 20px; overflow: hidden; box-shadow: 0 24px 70px rgba(0,0,0,.7); transform-origin: 100% 100%; animation: in .2s cubic-bezier(.2,.9,.3,1); }
    @keyframes in { from { opacity: 0; transform: translateY(10px) scale(.97); } }
    @media (prefers-reduced-motion: reduce) { .box { animation: none; } .fab, .fab .dot { transition: none; } }
    @media (max-width: 520px) { .box { position: fixed; inset: 8px 8px ${84 + lift}px 8px; width: auto; height: auto; } }
    header { display: flex; align-items: center; gap: 10px; padding: 14px 12px 12px 16px; border-bottom: 1px solid var(--line); }
    header b { font: 600 16px/1 "Inter Tight", Inter, system-ui, sans-serif; letter-spacing: -.01em; } header .where { margin-left: auto; max-width: 52%; padding: 5px 10px; border-radius: 999px; background: var(--panel2); color: var(--text2); font: 500 12px/1.2 Inter, system-ui, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .x { width: 32px; height: 32px; border: 0; border-radius: 999px; background: transparent; color: var(--text2); display: grid; place-items: center; } .x:hover { background: var(--panel2); color: var(--text); }
    .log { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; scrollbar-width: thin; }
    .m { max-width: 86%; padding: 10px 13px; border-radius: 16px; white-space: pre-wrap; overflow-wrap: anywhere; }
    .m.me { align-self: flex-end; background: var(--panel3); color: var(--text); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ring) 40%, transparent); border-bottom-right-radius: 6px; }
    .m.k { align-self: flex-start; background: var(--panel2); border-bottom-left-radius: 6px; }
    .m.k.wait { color: var(--text2); } .m.k.bad { box-shadow: inset 0 0 0 1px var(--bad); }
    .m .f { display: block; margin-top: 6px; color: var(--text2); font: 500 12px/1.3 Inter, system-ui, sans-serif; }
    .dots i { display: inline-block; width: 5px; height: 5px; margin-right: 3px; border-radius: 50%; background: var(--ring); animation: b 1s infinite; } .dots i:nth-child(2) { animation-delay: .15s; } .dots i:nth-child(3) { animation-delay: .3s; }
    @keyframes b { 0%, 60%, 100% { transform: none; opacity: .5; } 30% { transform: translateY(-4px); opacity: 1; } }
    .empty { margin: auto 0; color: var(--text2); } .empty h4 { margin: 0 0 6px; color: var(--text); font: 600 18px/1.2 "Inter Tight", Inter, system-ui, sans-serif; letter-spacing: -.01em; } .tries { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
    .tries button { padding: 8px 12px; border-radius: 999px; border: 0; box-shadow: inset 0 0 0 1px var(--line); background: rgba(255,255,255,.04); color: var(--text2); font-size: 13.5px; } .tries button:hover { color: var(--text); box-shadow: inset 0 0 0 1px var(--ctl); }
    form { display: flex; gap: 8px; align-items: flex-end; margin: 12px; padding: 5px; border-radius: 22px; background: var(--ink); box-shadow: inset 0 0 0 1px var(--line); }
    form:focus-within { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ring) 55%, var(--line)), 0 0 0 4px color-mix(in srgb, var(--ring) 18%, transparent); }
    textarea { flex: 1; min-height: 40px; max-height: 140px; resize: none; padding: 10px 10px 8px; border: 0; background: transparent; color: var(--text); font: inherit; outline: none; }
    textarea:focus-visible { outline: none; }
    textarea::placeholder { color: var(--text3); }
    .send { width: 40px; height: 40px; flex: none; border: 0; border-radius: 50%; background: var(--acc); color: var(--acc-ink); display: grid; place-items: center; transition: transform .2s; } .send:hover:not(:disabled) { transform: scale(1.05); }
    .send:disabled { background: var(--panel3); color: var(--text2); cursor: default; }
    .note { margin: 0; padding: 0 16px 12px; color: var(--text3); font: 400 12px/1.4 Inter, system-ui, sans-serif; } .note button { border: 0; background: none; padding: 0; color: var(--text2); font: inherit; text-decoration: underline; }
  </style>
  <div class="box" role="dialog" aria-label="Chat with Kalpi" hidden>
    <header><b>Ask Kalpi</b><span class="where" title=""></span><button class="x" type="button" aria-label="Close chat"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg></button></header>
    <div class="log" aria-live="polite"></div>
    <form><textarea rows="1" placeholder="Ask, or say what to make or change" aria-label="Message"></textarea><button class="send" aria-label="Send"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 15V3M4 8l5-5 5 5"/></svg></button></form>
    <p class="note">Mockup · answered by a local assistant on this computer. It can see which page and section you are on. <button type="button" class="clear">Clear chat</button></p>
  </div>
  <button class="fab" type="button" aria-label="Open chat with Kalpi" aria-expanded="false" title="Ask Kalpi (Cmd/Ctrl + K)"><svg viewBox="0 0 48 48" aria-hidden="true"><g transform="rotate(-6 24 24)"><rect class="box-f" x="6" y="19" width="36" height="24" rx="8.5"/><rect class="slot" x="14.5" y="21.5" width="19" height="4.5" rx="2.25"/><circle class="dot" cx="30" cy="12" r="5.5"/></g></svg><span class="badge" hidden></span></button>`;
  const $ = s => root.querySelector(s), box = $('.box'), fab = $('.fab'), log = $('.log'), ta = $('textarea'), form = $('form'), where = $('.where'), badge = $('.badge');
  let busy = false, unread = 0;

  /* ---- what the person is looking at ---- */
  const sectionInView = () => {
    const mid = innerHeight * .4; let best = null, bd = 1e9;
    document.querySelectorAll('main section, section[id], [data-kalpi-section]').forEach(s => { const r = s.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || r.height < 40) return; const d = Math.abs((r.top < mid && r.bottom > mid) ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid))); if (d < bd) { bd = d; best = s; } });
    if (!best) return null; const h = best.querySelector('h1, h2, h3');
    return { id: best.dataset.kalpiSection || best.id || null, heading: h ? h.textContent.trim().replace(/\s+/g, ' ').slice(0, 120) : null };
  };
  const context = () => {
    let page = {}; try { page = (typeof window.KalpiContext === 'function' ? window.KalpiContext() : window.KalpiContext) || {}; } catch (e) {}
    try { if (JSON.stringify(page).length > 2000) page = { note: 'the page reported more than 2,000 characters; left out' }; } catch (e) { page = {}; }   /* the helper caps and marks it too */
    const sel = String(getSelection ? getSelection() : '').trim().slice(0, 400);
    return Object.assign({ source: 'chat', page: location.pathname.split('/').pop() || 'index', title: document.title, section: sectionInView(), selectedText: sel || undefined, window: innerWidth + 'x' + innerHeight,
      theme: document.documentElement.dataset.theme || undefined, history: st.turns.filter(t => t.text && !t.wait).slice(-6).map(t => ({ who: t.who, text: t.text.slice(0, 600) })) }, { app: page });
  };
  const whereText = () => { const c = context(), a = c.app || {}; const bits = [a.tool || c.page.replace(/\.html$/, ''), a.product, a.step, a.part].filter(Boolean); if (bits.length < 2 && c.section && (c.section.heading || c.section.id)) bits.push(c.section.heading || c.section.id); return bits.join(' · '); };
  const showWhere = () => { const t = whereText(); where.textContent = t; where.title = 'Kalpi can see you are here: ' + t; };

  /* ---- drawing ---- */
  const TRIES = ['What can I make here?', 'Make me a candle for slow evenings', 'Explain this step'];
  const draw = () => {
    log.textContent = '';
    if (!st.turns.length) { const e = document.createElement('div'); e.className = 'empty'; e.innerHTML = '<h4>What do you want to make?</h4>Ask a question, describe a product, or say what to change on the page you are on.<div class="tries"></div>'; TRIES.forEach(t => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.onclick = () => send(t); e.lastChild.append(b); }); log.append(e); return; }
    st.turns.forEach(t => { const d = document.createElement('div'); d.className = 'm ' + (t.who === 'me' ? 'me' : 'k') + (t.wait ? ' wait' : '') + (t.bad ? ' bad' : '');
      if (t.wait) { d.innerHTML = '<span class="dots"><i></i><i></i><i></i></span> '; d.append(t.text || 'Reading it'); } else d.textContent = t.text;
      if (t.file) { const f = document.createElement('span'); f.className = 'f'; f.textContent = t.file; d.append(f); } log.append(d); });
    log.scrollTop = log.scrollHeight;
  };
  const setOpen = on => { st.open = on; box.hidden = !on; fab.setAttribute('aria-expanded', on); fab.setAttribute('aria-label', on ? 'Close chat with Kalpi' : 'Open chat with Kalpi'); if (on) { unread = 0; badge.hidden = true; showWhere(); draw(); setTimeout(() => ta.focus(), 30); } save(st); };
  const send = async text => {
    text = (text || '').trim(); if (!text || busy) return; busy = true; $('.send').disabled = true;
    const ctx = context(); st.turns.push({ who: 'me', text }); const mine = { who: 'kalpi', text: 'Reading it', wait: true }; st.turns.push(mine); draw(); save(st);
    const u = await KalpiAssistant.ask(text, ctx, v => { if (v.state === 'working' || v.state === 'waiting' || v.state === 'sending') { mine.text = (v.state === 'working' && v.note ? v.note : 'Reading it') + (v.seconds > 3 ? ' · ' + v.seconds + ' s' : ''); if (st.open) draw(); } });
    mine.wait = false; mine.text = u.message || (u.state === 'done' ? 'Done.' : 'Something went wrong.'); mine.bad = u.state !== 'done'; if (u.file) mine.file = u.file;
    busy = false; $('.send').disabled = false; save(st); if (st.open) draw(); else { unread++; badge.textContent = unread; badge.hidden = false; }
    window.dispatchEvent(new CustomEvent('kalpi-chat-reply', { detail: u }));   // a page can act on it, e.g. load u.product
  };
  form.addEventListener('submit', e => { e.preventDefault(); const t = ta.value; ta.value = ''; ta.style.height = ''; send(t); });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } e.stopPropagation(); });
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight + 2) + 'px'; });
  ['keyup', 'keypress'].forEach(n => ta.addEventListener(n, e => e.stopPropagation()));   // the page's own shortcuts must not fire while typing here
  fab.onclick = () => setOpen(!st.open); $('.x').onclick = () => { setOpen(false); fab.focus(); };
  $('.clear').onclick = () => { if (busy) return; st.turns = []; save(st); draw(); };
  document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(!st.open); } else if (e.key === 'Escape' && st.open && root.activeElement) { setOpen(false); fab.focus(); } });
  addEventListener('scroll', () => { if (st.open) showWhere(); }, { passive: true }); document.addEventListener('click', () => { if (st.open) setTimeout(showWhere, 60); });
  (document.body || document.documentElement).append(host);
  window.KalpiChat = { open: () => setOpen(true), close: () => setOpen(false), send, context };
  if (st.turns.length && st.turns[st.turns.length - 1].wait) { const l = st.turns[st.turns.length - 1]; l.wait = false; l.bad = true; l.text = 'The page was reloaded before the answer arrived. Ask again.'; save(st); }
  if (st.open) setOpen(true);
})();
