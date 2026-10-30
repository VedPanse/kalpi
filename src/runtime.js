// Native Figma UI has an opaque origin. Persist its identity in clientStorage,
// and keep browser-only caches in memory rather than depending on cookies.
const memory = new Map();
export const storage = {
  getItem(key) { try { return localStorage.getItem(key); } catch { return memory.get(key) ?? null; } },
  setItem(key,value) { try { localStorage.setItem(key,value); } catch { memory.set(key,String(value)); } },
  removeItem(key) { try { localStorage.removeItem(key); } catch { memory.delete(key); } },
};
export const appURL = path => globalThis.__KALPI_NATIVE_URL__ ? new URL(path,globalThis.__KALPI_NATIVE_URL__).href : path;
