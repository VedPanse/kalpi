import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID as id } from "node:crypto";
import { testDatabase, until } from "./helpers/database.js";
import { defaultProduct, defaultLayout } from "../shared/product.js";
const list = (c, t) => [...c.db[t].iter()];
test(
  "real Spacetime: private drafts, pair/sync/conflicts/retry, five immutable versions, votes, 10 visitors and transactional pickup",
  { timeout: 60000 },
  async () => {
    const db = await testDatabase();
    try {
      const owner = await db.connect(),
        plugin = await db.connect(),
        guest = await db.connect(),
        admin = await db.connect(process.env.SPACETIME_SERVICE_TOKEN),
        pid = id(),
        did = id();
      await owner.reducers.createProject({
        id: pid,
        name: "Pilot acceptance test",
      });
      await owner.reducers.createDesign({
        id: did,
        projectId: pid,
        kind: "bottle",
        document: "",
      });
      assert.equal(list(guest, "myDesigns").length, 0);
      await assert.rejects(
        guest.reducers.editDesign({
          id: did,
          baseRevision: 0,
          changes: "[]",
          origin: "test",
          operationId: id(),
        }),
        /access required/,
      );
      const code = id();
      await owner.reducers.createPairing({ projectId: pid, code });
      await plugin.reducers.redeemPairing({ code });
      await until(() => list(plugin, "myDesigns").length === 1);
      await assert.rejects(
        guest.reducers.redeemPairing({ code }),
        /expired or used/,
      );
      let op = {
        id: did,
        baseRevision: 0,
        changes: JSON.stringify([
          { field: "shape.crossSection", value: "faceted" },
          { field: "material.type", value: "glass" },
          { field: "facts.price", value: 65 },
        ]),
        origin: "figma",
        operationId: id(),
      };
      await plugin.reducers.editDesign(op);
      await plugin.reducers.editDesign(op);
      await until(() => list(owner, "myDesigns")[0].revision === 1);
      assert.equal(list(owner, "myRevisions").length, 2);
      await assert.rejects(
        owner.reducers.editDesign({ ...op, operationId: id() }),
        /CONFLICT/,
      );
      await owner.reducers.undoDesign({
        id: did,
        baseRevision: 1,
        targetRevision: 0,
        operationId: id(),
      });
      assert.equal(
        JSON.parse(list(owner, "myDesigns")[0].document).material.type,
        "satin",
      );
      const pv = defaultProduct();
      pv.facts.price = 65;
      pv.facts.brand = "Test brand";
      pv.scale.confirmed = true;
      const versions = [];
      for (let i = 0; i < 5; i++) {
        const designId = id(),
          versionId = id();
        await owner.reducers.createDesign({
          id: designId,
          projectId: pid,
          kind: "bottle",
          document: JSON.stringify({
            ...pv,
            facts: { ...pv.facts, name: "Variant " + i },
          }),
        });
        await owner.reducers.saveVersion({
          id: versionId,
          designId,
          baseRevision: 0,
          name: "Direction " + i,
        });
        versions.push(versionId);
      }
      assert.equal(list(owner, "myVersions").length, 5);
      const assetId = id();
      await admin.reducers.registerAsset({
        id: assetId,
        projectId: pid,
        path: "test.png",
        mime: "image/png",
        size: 8n,
      });
      await assert.rejects(
        admin.reducers.registerAsset({
          id: assetId,
          projectId: pid,
          path: "replacement.png",
          mime: "image/png",
          size: 8n,
        }),
        /immutable/,
      );
      const other = id();
      await guest.reducers.createProject({ id: other, name: "Other merchant" });
      await assert.rejects(
        guest.reducers.createDesign({
          id: id(),
          projectId: other,
          kind: "bottle",
          document: JSON.stringify({ ...pv, label: { ...pv.label, assetId } }),
        }),
        /Artwork/,
      );
      const l = defaultLayout();
      l.fixtures = [];
      l.placements = versions
        .slice(0, 2)
        .map((v, i) => ({
          id: id(),
          versionId: v,
          x: i * 0.3,
          y: 1.2,
          z: 2,
          rotation: 0,
        }));
      await owner.reducers.saveLayout({
        projectId: pid,
        baseRevision: 0,
        document: JSON.stringify(l),
        operationId: id(),
      });
      const pub = id();
      await owner.reducers.publishStore({
        id: pub,
        projectId: pid,
        versionIds: versions.slice(0, 2),
        name: "Published test",
      });
      await until(() =>
        list(guest, "publishedStores").some((p) => p.id === pub),
      );
      const snap = list(guest, "publishedStores").find(
        (p) => p.id === pub,
      ).snapshot;
      const v = list(owner, "myVersions").find((v) => v.id === versions[0]);
      await owner.reducers.editDesign({
        id: v.designId,
        baseRevision: 0,
        changes: JSON.stringify([{ field: "facts.price", value: 95 }]),
        origin: "studio",
        operationId: id(),
      });
      assert.equal(
        list(guest, "publishedStores").find((p) => p.id === pub).snapshot,
        snap,
      );
      await guest.reducers.castVote({
        publicationId: pub,
        versionId: versions[0],
        intent: "yes",
        preferred: true,
        comment: "test-only feedback",
      });
      await until(() => list(owner, "myVotes").length === 1);
      assert.equal(list(owner, "myVotes")[0].price, 65);
      await guest.reducers.castVote({
        publicationId: pub,
        versionId: versions[0],
        intent: "unsure",
        preferred: false,
        comment: "",
      });
      assert.equal(list(guest, "myVotes").length, 1);
      const another = await db.connect();
      assert.equal(list(another, "myVotes").length, 0);
      const roomId = id(),
        visitors = [guest, another];
      for (let i = 2; i < 10; i++) visitors.push(await db.connect());
      await Promise.all(
        visitors.map((c, i) =>
          c.reducers.joinRoom({
            roomId,
            publicationId: pub,
            name: "Test visitor " + i,
          }),
        ),
      );
      await until(() => list(guest, "roomVisitors").length === 10);
      assert.equal(list(owner, "roomVisitors").length, 0);
      const overflow = await db.connect();
      await assert.rejects(
        overflow.reducers.joinRoom({
          roomId,
          publicationId: pub,
          name: "Eleventh",
        }),
        /ten visitors/,
      );
      const results = await Promise.allSettled(
        visitors
          .slice(0, 2)
          .map((c) =>
            c.reducers.pickUp({ roomId, instanceId: l.placements[0].id }),
          ),
      );
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      await until(() => list(guest, "roomHolds").length === 1);
      const ownerIndex = results.findIndex((r) => r.status === "fulfilled");
      visitors[ownerIndex].disconnect();
      const observer = visitors[1 - ownerIndex];
      await until(() => list(observer, "roomHolds").length === 0);
      // 10 independent clients, each publishing 10 updates/second, while receiving each other's state.
      await overflow.reducers.joinRoom({
        roomId,
        publicationId: pub,
        name: "Replacement visitor",
      });
      const remaining = [
          ...visitors.filter((_, i) => i !== ownerIndex),
          overflow,
        ],
        start = performance.now();
      for (let tick = 1; tick <= 20; tick++) {
        await new Promise((r) => setTimeout(r, 100));
        await Promise.all(
          remaining.map((c, i) =>
            c.reducers.moveVisitor({
              roomId,
              x: i * 0.01,
              z: 3 - tick * 0.01,
              yaw: 0.1,
              sequence: tick,
            }),
          ),
        );
      }
      await until(() =>
        list(observer, "roomVisitors").every((v) => v.sequence === 20),
      );
      console.log(
        `Room load: ${remaining.length} visitors × 20 updates in ${Math.round(performance.now() - start)} ms`,
      );
      await observer.reducers.pickUp({
        roomId,
        instanceId: l.placements[0].id,
      });
      await until(() => list(observer, "roomHolds").length === 1);
      await until(() => list(observer, "roomHolds").length === 0, 14000);
      await owner.reducers.unpublishStore({ id: pub });
      await until(
        () => !list(observer, "publishedStores").some((p) => p.id === pub),
      );
      await assert.rejects(
        observer.reducers.castVote({
          publicationId: pub,
          versionId: versions[0],
          intent: "yes",
          preferred: false,
          comment: "",
        }),
        /unavailable|disconnected/i,
      );
    } finally {
      await db.close();
    }
  },
);
