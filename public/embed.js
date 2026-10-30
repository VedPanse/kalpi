(() => {
  const script = document.currentScript;
  const origin = new URL(script.src).origin;
  function mount(element, id, kind) {
    if (!id || element.dataset.kalpiMounted) return;
    element.dataset.kalpiMounted = 'true';
    const frame = document.createElement('iframe');
    frame.src = origin + '/' + kind + '/' + encodeURIComponent(id) + (kind === 'store' ? '?embed=1' : '');
    frame.title = kind === 'store' ? 'Explore our store and vote on products' : 'Review our product concepts';
    frame.loading = 'lazy';
    frame.allow = 'fullscreen; xr-spatial-tracking';
    frame.allowFullscreen = true;
    frame.style.cssText = 'width:100%;height:'+ (kind==='store'?'800':'1000') +'px;border:0;display:block';
    element.append(frame);
  }
  if (script.dataset.store || script.dataset.shelf) {
    const container = document.createElement('div');
    script.after(container);
    mount(container, script.dataset.store || script.dataset.shelf, script.dataset.store ? 'store' : 'shelf');
  }
  document.querySelectorAll('[data-kalpi-shelf]').forEach(el=>mount(el,el.dataset.kalpiShelf,'shelf'));
  document.querySelectorAll('[data-kalpi-store]').forEach(el=>mount(el,el.dataset.kalpiStore,'store'));
})();
