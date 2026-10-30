import { test } from "node:test";
import assert from "node:assert/strict";
import { Box3, Vector3 } from "three";
import {
  defaultProduct,
  applyChanges,
  validateProduct,
  validateLayout,
  defaultLayout,
} from "../shared/product.js";
import { productModel, disposeObject } from "../src/geometry.js";
test("structured geometry uses meters and preserves declared bounds for every bottle section and sofa", () => {
  for (const kind of ["bottle", "sofa"])
    for (const crossSection of ["circle", "faceted", "rectangle"]) {
      const p = defaultProduct(kind);
      if (kind === "bottle") p.shape.crossSection = crossSection;
      const model = productModel(p),
        size = new Box3().setFromObject(model).getSize(new Vector3());
      for (const [axis, dim] of [
        ["x", "width"],
        ["y", "height"],
        ["z", "depth"],
      ])
        assert.ok(
          Math.abs(size[axis] - p.dimensions[dim]) < 1e-6,
          `${kind} ${crossSection} ${dim}: ${size[axis]}`,
        );
      disposeObject(model);
    }
});
test("edits reject malformed geometry, prevent AI price fabrication, and invalidate scale confirmation", () => {
  const p = defaultProduct();
  p.scale.confirmed = true;
  assert.equal(
    applyChanges(p, [{ field: "dimensions.width", value: 0.08 }]).scale
      .confirmed,
    false,
  );
  assert.throws(
    () =>
      applyChanges(p, [{ field: "facts.price", value: 10 }], { agent: true }),
    /cannot change/,
  );
  assert.throws(
    () =>
      applyChanges(p, [
        {
          field: "shape.profile",
          value: [
            [0, 1],
            [0.7, 0.5],
            [0.2, 0.2],
            [1, 0.2],
          ],
        },
      ]),
    /progress/,
  );
  const sofa = defaultProduct("sofa");
  sofa.shape.legHeight = 0.29;
  sofa.shape.seatHeight = 0.3;
  assert.throws(() => validateProduct(sofa), /fit/);
  const l = defaultLayout();
  l.fixtures[0].x = 100;
  assert.throws(() => validateLayout(l), /Fixture/);
});
