import vm from "node:vm";
import {readFile} from "node:fs/promises";
import {defaultProduct} from "../../shared/product.js";
export async function plugin() {
  const handlers = {},
    messages = [],
    uiLaunches = [],
    timers = new Map(),
    storage = new Map();
  let next = 0;
  class Node {
    constructor(type) {
      this.type = type;
      this.id = "test:" + ++next;
      this.name = "";
      this.width = 100;
      this.height = 100;
      this.x = this.y = this.rotation = 0;
      this.fills = [];
      this.data = {};
      if (["FRAME", "PAGE"].includes(type)) this.children = [];
    }
    findAll(predicate) {
      return (this.children || []).flatMap(n => [...(predicate(n) ? [n] : []), ...n.findAll(predicate)]);
    }
    appendChild(n) {
      n.parent?.children?.splice(n.parent.children.indexOf(n), 1);
      this.children.push(n);
      n.parent = this;
    }
    resize(w, h) {
      this.width = Math.fround(w);
      this.height = Math.fround(h);
    }
    setPluginData(k, v) {
      this.data[k] = v;
    }
    getPluginData(k) {
      return this.data[k] || "";
    }
    setRelaunchData() {}
    remove() {
      this.parent.children.splice(this.parent.children.indexOf(this), 1);
      this.removed = true;
    }
    getStyledTextSegments() {
      return [{ fontName: { family: "Inter", style: "Regular" } }];
    }
    async exportAsync(options) {
      if (options?.format === "SVG_STRING") return '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L100 0L80 100Z"/></svg>';
      return new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64'));
    }
    set vectorPaths(v) {
      this.paths = v.map((p) => {
        const pairs =
          p.data.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) || [];
        const pts = [];
        for (let i = 0; i < pairs.length; i += 2)
          pts.push([Math.fround(pairs[i]), Math.fround(pairs[i + 1])]);
        if (!/[CQ]/.test(p.data) && pts.length)
          return {
            ...p,
            data:
              "M " +
              pts
                .concat([pts[0]])
                .map((p) => p.join(" "))
                .join(" L ") +
              " Z",
          };
        return p;
      });
    }
    get vectorPaths() {
      return this.paths;
    }
  }
  const page = new Node("PAGE");
  page.selection = [];
  page.on = (n, f) => (handlers[n] = f);
  page.off = (n) => delete handlers[n];
  const figma = {
    currentPage: page,
    getNodeByIdAsync: async id => page.findAll(n => n.id === id)[0],
    createFrame: () => new Node("FRAME"),
    createText: () => new Node("TEXT"),
    createVector: () => new Node("VECTOR"),
    createRectangle: () => new Node("RECTANGLE"),
    createEllipse: () => new Node("ELLIPSE"),
    loadFontAsync: async () => {},
    viewport: { center: { x: 500, y: 500 }, scrollAndZoomIntoView() {} },
    showUI(html) { uiLaunches.push({html,handlerReady:typeof figma.ui.onmessage === "function"}); },
    ui: { postMessage: (m) => messages.push(m) },
    on: (n, f) => (handlers[n] = f),
    clientStorage: {
      getAsync: async (k) => storage.get(k),
      setAsync: async (k, v) => storage.set(k, v),
    },
  };
  const sandbox = {
    figma,
    __html__: "<script>window.__KALPI_BRIDGE_ID__='__KALPI_LAUNCH_NONCE__';</script>",
    setTimeout: (fn) => {
      timers.set(++next, fn);
      return next;
    },
    clearTimeout: (id) => timers.delete(id),
    Date,
    Uint8Array,
  };
  vm.runInNewContext(await readFile("figma-plugin/code.js", "utf8"), sandbox);
  await new Promise(resolve => setImmediate(resolve));
  return {
    figma,
    page,
    messages,
    uiLaunches,
    handlers,
    timers,
    async flush() {
      const jobs = [...timers.values()];
      timers.clear();
      for (const f of jobs) await f();
    },
    async insert(kind) {
      const row = {
        id: "test-design-" + kind,
        projectId: "test-project",
        revision: 0,
        document: JSON.stringify(defaultProduct(kind)),
      };
      await figma.ui.onmessage({ type: "create-template", design: row });
      await figma.ui.onmessage({ type: "ready" });
      return { row, frame: page.selection[0] };
    },
  };
}
