// Keep product facts, voting and AR links usable when WebGL is unavailable.
export function withViewerFallback(element, create) {
  try {
    return create();
  } catch (error) {
    console.warn("kalpi.render.unavailable", error.message);
    element.replaceChildren();
    const message = document.createElement("div");
    message.className = "empty";
    message.textContent =
      "The 3D view could not start on this browser. You can still browse products, read their dimensions, and give feedback. Try a browser with hardware acceleration for the interactive view.";
    element.append(message);
    return {
      dispose() {
        element.replaceChildren();
      },
      setLighting() {},
      dimensions() {},
      view() {},
      capture() {
        return null;
      },
      sync() {},
      rotateHeld() {},
      moveKey() {},
      enterWalk() {},
    };
  }
}
