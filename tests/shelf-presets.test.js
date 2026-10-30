import test from 'node:test';import assert from 'node:assert/strict';
import {SHELF_PRESETS,shelfLayout} from '../shared/shelf-presets.js';
test('all curated shelf palettes validate and retain one placement per original',()=>{for(const p of SHELF_PRESETS){const l=shelfLayout(['a','b','a','c'],p.id);assert.equal(l.placements.length,3);assert.equal(l.wallColor,p.background);assert.equal(l.palette,p.id);assert.equal(l.presentation,'shelf');assert.equal(l.lighting,p.lighting);}});
test('shelf presets reject empty, oversized, and unknown choices',()=>{assert.throws(()=>shelfLayout([]));assert.throws(()=>shelfLayout(['a'],'unknown'));assert.throws(()=>shelfLayout(['a','b','c','d','e','f']));});
