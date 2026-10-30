// Physical units must come from annotations or user confirmation, never pixels alone.
export function selectionDimensions(width, height, text = "") {
  const clamp = n => Math.max(.005, Math.min(10, n));
  const match = text.match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)\b/i);
  if (match) {
    const unit = { mm: .001, cm: .01, m: 1 }[match[4].toLowerCase()];
    const [w, d, h] = match.slice(1, 4).map(n => Number(n) * unit);
    if ([w, d, h].every(n => n >= .005 && n <= 10))
      return { dimensions: { width: w, depth: d, height: h }, source: 'From selected design annotation (W × D × H); review before confirming' };
  }
  const ratio = width / Math.max(height, 1);
  return { dimensions: { width: clamp(.2 * Math.min(1, ratio)), height: clamp(.2 / Math.max(1, ratio)), depth: .02 }, source: 'Estimated: longest side 20 cm, depth 2 cm; 2D proportions preserved. Confirm actual size.' };
}
