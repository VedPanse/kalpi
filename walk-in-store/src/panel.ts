import { cartUrl, imageUrl, productUrl } from './api';
import type { Product } from './types';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;

export function openPanel(store: string, p: Product): void {
  const img = $<HTMLImageElement>('#pImg');
  img.src = imageUrl(p.image);
  img.alt = p.title;
  $('#pMeta').textContent = [p.vendor, p.type].filter(Boolean).join(' · ');
  $('#pTitle').textContent = p.title;
  $('#pPrice').textContent = p.price ? '$' + p.price : '';
  $<HTMLAnchorElement>('#pCart').href = cartUrl(store, p.variant_id);
  $<HTMLAnchorElement>('#pPage').href = productUrl(store, p.handle);
  $('#panel').hidden = false;
}

export function closePanel(): void {
  $('#panel').hidden = true;
}

let toastTimer = 0;
export function toast(message: string): void {
  const t = $('#toast');
  t.textContent = message;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (t.hidden = true), 3500);
}
