# Integration capability verification

Official documentation checked during this build on October 23, 2026 (America/Los_Angeles). Documentation capability does not establish credential access or a successful live integration.

## Figma

- [Plugin API overview](https://developers.figma.com/docs/plugins/): plugins can read/write editor content.
- [Plugin typings maintained by Figma](https://github.com/figma/plugin-typings/blob/master/plugin-api.d.ts): `currentPage.selection`, `selectionchange`, `exportAsync`, frame/text APIs and document-change constraints.
- [Async tasks](https://developers.figma.com/docs/plugins/async-tasks/): artwork export through `exportAsync` as PNG.
- [DocumentChange](https://developers.figma.com/docs/plugins/api/DocumentChange/): relevant change events exist; dynamic-page/documentchange subscriptions require care. This implementation deliberately uses explicit refresh instead of high-frequency exports or document-wide listeners.
- [Plugin UI messaging](https://developers.figma.com/docs/plugins/api/figma-ui/): UI and main-context communication.
- [Manifest](https://developers.figma.com/docs/plugins/manifest/): development network domains and plugin entrypoints.

Implemented source exports one selected FRAME, shows it in a Three.js iframe panel and sends a saved label version to Kalpi. Results insertion writes text in a new frame with actual data and timestamp. Source/origin checks scope the localhost bridge. No live Figma file was accessed, and no native 3D canvas layer is claimed. No proprietary Figma 3D format or Weave generation API is assumed.

## 3D generation

[Meshy image-to-3D API](https://docs.meshy.ai/en/api/image-to-3d) documents authenticated asynchronous tasks and textured model exports including GLB. [Meshy overview](https://docs.meshy.ai/en) lists export formats. No Meshy credentials were found among relevant environment variable names. No task or charge was created. GLB import is the implemented source interface. Other providers were not live-tested.

## Shopify

- [productCreate](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate): `write_products` scope; creation starts with one variant. Additional sellable variants require the dedicated bulk variant mutation.
- [Product status](https://shopify.dev/docs/api/admin-graphql/latest/objects/product): ACTIVE versus DRAFT matters for storefront availability.
- [stagedUploadsCreate](https://shopify.dev/docs/api/admin-graphql/2026-07/mutations/stagedUploadsCreate): staged uploads include MODEL_3D; file size is required for that resource.
- [Manage media](https://shopify.dev/docs/apps/build/product-merchandising/products-and-collections/manage-media): Shopify-hosted files process asynchronously; handle status and errors before claiming readiness.

There was no Shopify integration in the empty repository and no store credentials in relevant environment variable names. The integration is unavailable; no draft, uploaded media, remote Shopify IDs, sandbox checkout, retry test, or storefront preview is claimed. Preparing confirmed facts and a local concept export works. A live development store is the concrete blocker for implementing and verifying the final draft step. A draft admin view does not imply public publication. Visa eligibility is separately unconfirmed.

## Claude

[Claude Sonnet 4.6](https://platform.claude.com/docs/id/models/sonnet-4-6/overview) confirms the model family. The adapter uses the server-side Messages endpoint and can be configured with ANTHROPIC_MODEL. No key was present and no paid call was made. Provider output is untested; the disabled UI is intentional.
