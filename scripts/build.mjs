import { build } from "esbuild";
import { zipSync } from "three/addons/libs/fflate.module.js";
import {
  mkdirSync,
  copyFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
mkdirSync("public/dist", { recursive: true });
await build({
  entryPoints: ["public/app.js"],
  outfile: "public/dist/legacy.js",
  bundle: true,
  format: "esm",
  minify: true,
  target: "es2022",
});
const entries = ["studio", "plugin-panel", "ar", "shop-concepts", "shelf-preview"];
await build({
  entryPoints: entries
    .filter((n) => existsSync(`src/${n}.js`))
    .map((n) => `src/${n}.js`),
  outdir: "public/dist",
  bundle: true,
  format: "esm",
  splitting: true,
  minify: true,
  sourcemap: false,
  target: "es2022",
});
await build({
  entryPoints: ["src/module_bindings/index.ts"],
  outfile: ".local/bindings.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
});
const nativePanel = await build({entryPoints:["src/plugin-panel.js"],bundle:true,write:false,format:"iife",minify:true,target:"es2022"});
const nativeCSS = readFileSync("public/studio.css","utf8").replace(/@import[^;]+;/g, "");
writeFileSync("figma-plugin/ui.html", `<!doctype html><html><head><meta charset="utf-8"><style>${nativeCSS}</style></head><body style="background:#f7f7f3;color:#242723"><main id="plugin" style="padding:20px"><h2>Opening Kalpi…</h2><p>Restoring your saved workspace.</p></main><div id="toast"></div><script>
window.__KALPI_BRIDGE_ID__='__KALPI_LAUNCH_NONCE__';
function startPanel(){${nativePanel.outputFiles[0].text.replace(/<\/script/gi,"<\\/script")}}
let started=false, attempts=0, retryTimer;
const opening=document.querySelector('#plugin');
function startupError(message){
 opening.innerHTML='<h2>Kalpi could not open yet</h2><p id="startup-error" role="alert"></p><button id="startup-retry">Try again</button><p>Your saved workspace connection has been kept.</p>';
 document.querySelector('#startup-error').textContent=message;
 document.querySelector('#startup-retry').onclick=()=>location.reload();
}
window.addEventListener('error',()=>startupError('The plugin could not finish starting. Try again; if this repeats, the installed plugin files may be out of date.'));
window.addEventListener('message',event=>{
 const m=event.data?.pluginMessage;
 if(!m || m.bridgeId!==window.__KALPI_BRIDGE_ID__)return;
 if(m.type==='runtime-ready')opening.querySelector('p')&&(opening.querySelector('p').textContent='Reading your saved workspace from Figma…');
 if(m?.type==='saved-panel'&&!started){
  started=true;clearTimeout(retryTimer);window.__KALPI_NATIVE_URL__=m.url;
  try{startPanel();}catch(error){startupError('The plugin could not finish starting. Your saved connection has not been changed.');}
 }
 if(m?.type==='sync-error'&&!started){clearTimeout(retryTimer);startupError(m.message||'Figma could not read your saved workspace.');}
});
function requestWorkspace(){
 if(started)return;
 if(++attempts>8){startupError('Figma did not answer the startup request. Try again to restore your saved workspace.');return;}
 parent.postMessage({pluginMessage:{type:'bootstrap-ready'},pluginId:'__KALPI_PLUGIN_ID__'},'*');
 retryTimer=setTimeout(requestWorkspace,1000);
}
requestWorkspace();
</script></body></html>`);
if (existsSync("figma-plugin/source.js"))
  await build({
    entryPoints: ["figma-plugin/source.js"],
    outfile: "figma-plugin/code.js",
    bundle: true,
    format: "iife",
    target: "es2018",
    minify: false,
  });
copyFileSync(
  "node_modules/@google/model-viewer/dist/model-viewer.min.js",
  "public/dist/model-viewer.js",
);
writeFileSync(
  "public/kalpi-figma-plugin.zip",
  zipSync(
    Object.fromEntries(
      ["code.js", "ui.html", "manifest.json"].map((n) => [
        n,
        new Uint8Array(readFileSync("figma-plugin/" + n)),
      ]),
    ),
  ),
);
console.log("Built Kalpi browser, service bindings and plugin bundles.");
