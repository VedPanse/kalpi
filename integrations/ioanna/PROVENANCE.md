# Ioanna integration

Source: VedPanse/kalpi branch `ioanna`, commit `e113bece9e421bed343616e52b0d4e505884ce5e`, authored by Ioanna Gkerdouki.

- `src/material-recipes.js` ports lacquer, polished metal, powder coat and ceramic coefficients from `kalpi-og/media/examples/materials.js`. It uses current Three.js physical materials without legacy shader injection. Assembly parts can select a finish; old product records retain their original rendering.
- `tripo3d.py` preserves her `walk-in-store/tools/tripo3d.py` reference integration unchanged. It is an optional offline utility, not an active hosted backend. A Tripo credential is required, and the API contract has not been verified live here.
- Her `walk-in-store/src/model3d.ts` / `tools/make3d.py` establish the outline-driven geometry approach. The new closed loft implementation extends that approach to non-rotational bodies; it is new Kalpi code, not a claim that her bottle lathe reconstructs cars.

The existing project, auth, Spacetime state, publications and Figma pairing flow remain on this branch. No separate website or sample customer activity was imported.
