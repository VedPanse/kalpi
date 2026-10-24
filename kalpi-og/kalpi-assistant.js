/* Kalpi assistant link. Include on any Kalpi page (opened from the local bridge or straight from the folder):
     <script src="kalpi-assistant.js"></script>            (from a sub-folder: src="../../kalpi-assistant.js")
   Then:  KalpiAssistant.ask('a soy candle for slow evenings', { page: 'studio' }, update => { ... })
   update is { state: 'sending' | 'waiting' | 'working' | 'done' | 'failed' | 'offline', seconds, note, message, product, file }
   Or mark up a form and it is wired for you:
     <form data-kalpi-ask data-context='{"page":"landing"}'><input name="text"><button>Ask</button><output></output></form>
   Mockup: the prompt goes to a local assistant on this computer, nowhere else.
   Since 2026-10-17 (security audit) the chat works only on a page opened from the helper, http://127.0.0.1:8765/...:
   the token is new on every helper start, kept in its memory, and given only to a page it served. Opened as a file,
   the page still shows everything but the chat answers with a note saying where to open it. */
(() => {
  const here = document.currentScript ? document.currentScript.src : location.href;
  const fileMode = location.protocol === 'file:', base = fileMode ? 'http://127.0.0.1:8765' : '';
  const FROM_HELPER = 'This page was opened as a file, so it cannot talk to Kalpi. Open it from the helper instead: http://127.0.0.1:8765/' + (location.pathname.split('/').pop() || 'kalpi.html');
  let tokenP = null;
  const token = () => tokenP || (tokenP = new Promise(res => {
    if (fileMode) return res('');                                   /* never offered to a file:// page */
    if (window.KALPI_LOCAL_TOKEN) return res(window.KALPI_LOCAL_TOKEN);
    const s = document.createElement('script'); s.src = '/kalpi-local/token.js';
    s.onload = () => res(window.KALPI_LOCAL_TOKEN || ''); s.onerror = () => res(''); document.head.append(s);
  }));
  const call = async (path, opt = {}) => {
    const t = await token();
    const r = await fetch(base + path, Object.assign({}, opt, { headers: Object.assign({ 'X-Kalpi-Token': t }, opt.headers || {}) }));
    if (!r.ok) throw new Error(r.status === 403 ? 'not allowed' : 'error ' + r.status);
    return r.json();
  };
  const ask = async (text, context, onUpdate) => {
    const say = u => { try { onUpdate && onUpdate(u); } catch (e) {} };
    const t0 = Date.now(), secs = () => Math.round((Date.now() - t0) / 1000);
    if (fileMode) { const u = { state: 'offline', seconds: 0, message: FROM_HELPER }; say(u); return u; }
    say({ state: 'sending', seconds: 0 });
    let id;
    try { id = (await call('/api/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, context: Object.assign({ url: location.pathname.split('/').pop() }, context || {}) }) })).id; }
    catch (e) { const u = { state: 'offline', seconds: 0, message: 'The assistant is not reachable. It answers only while the local bridge and a local assistant are running on this computer.' }; say(u); return u; }
    for (;;) {
      await new Promise(r => setTimeout(r, 1000));
      let a; try { a = await call('/api/reply?id=' + id); } catch (e) { a = { state: 'waiting' }; }
      const u = Object.assign({ id, seconds: secs() }, a); say(u);
      if (a.state === 'done' || a.state === 'failed') return u;
    }
  };
  const products = () => call('/api/products').then(j => j.products).catch(() => []);
  const online = () => fetch(base + '/api/health').then(r => r.ok).catch(() => false);
  window.KalpiAssistant = { ask, products, online, fileMode, fromHelper: FROM_HELPER };
  document.addEventListener('submit', e => {
    const f = e.target; if (!f.matches || !f.matches('form[data-kalpi-ask]')) return; e.preventDefault();
    const inp = f.querySelector('[name=text]'), out = f.querySelector('output'), text = (inp && inp.value || '').trim(); if (!text) return;
    let ctx = {}; try { ctx = JSON.parse(f.dataset.context || '{}'); } catch (err) {}
    inp.value = ''; f.dispatchEvent(new CustomEvent('kalpi-asked', { bubbles: true, detail: { text } }));
    ask(text, ctx, u => { if (out) out.textContent = u.state === 'done' || u.state === 'failed' || u.state === 'offline' ? (u.message || '') : u.state === 'working' ? 'Kalpi is working: ' + (u.note || '') + ' · ' + u.seconds + ' s' : 'Kalpi is reading it… ' + u.seconds + ' s';
      f.dispatchEvent(new CustomEvent('kalpi-update', { bubbles: true, detail: u })); });
  });
})();
