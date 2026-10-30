import * as T from "three";
// Adapted material recipes: Igkerdouki/kalpi-OG @ 00d51cc5, media/examples/materials.js.
// Three r183 has native transmission/IOR/attenuation. No r128 shader patches are carried forward.
export function mapImportedParts(root) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    const name = node.name.toLowerCase();
    for (const old of Array.isArray(node.material)
      ? node.material
      : [node.material]) {
      const label = (name + " " + old.name).toLowerCase();
      const part = /body|glass|vessel/.test(label)
        ? "Body"
        : /cap|collar|lid|rim|handle/.test(label)
          ? "Cap"
          : /label/.test(label)
            ? "Label"
            : "Body";
      if (!part) continue;
      let material = old;
      if (name === "glass") {
        material = new T.MeshPhysicalMaterial({
          name: "Body",
          map: old.map,
          color: 0xffffff,
          transmission: 0.92,
          ior: 1.55,
          thickness: 0.02,
          attenuationDistance: 1,
          roughness: 0.06,
          clearcoat: 1,
          dispersion: 0.018,
        });
      } else if (/cap|collar/.test(name)) {
        material = new T.MeshPhysicalMaterial({
          name: "Cap",
          map: old.map,
          color: 0xffffff,
          metalness: 1,
          roughness: name === "collar" ? 0.14 : 0.2,
        });
      }
      material.name = part;
      if (Array.isArray(node.material))
        node.material = node.material.map((m) => (m === old ? material : m));
      else node.material = material;
      if (material !== old) old.dispose();
    }
  });
  return root;
}
