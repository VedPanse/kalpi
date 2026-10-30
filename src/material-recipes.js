// Adapted from Ioanna Gkerdouki's kalpi-og/media/examples/materials.js,
// origin/ioanna e113bece9e421bed343616e52b0d4e505884ce5e.
// Use modern MeshPhysicalMaterial fields; no r128 shader patches.
export const finishes = {
  lacquer: {roughness:.28, clearcoat:1, clearcoatRoughness:.03},
  polishedMetal: {metalness:1, roughness:.12, clearcoat:0},
  powderCoat: {roughness:.68, clearcoat:0},
  ceramic: {roughness:.3, clearcoat:1, clearcoatRoughness:.04},
};
export function applyFinish(material, finish) {
  if (finish && finishes[finish]) Object.assign(material, finishes[finish]);
  return material;
}
