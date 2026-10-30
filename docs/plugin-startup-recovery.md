# Native plugin startup recovery

The opening screen had an unacknowledged one-shot bootstrap request, and was displayed before the runtime message handler was registered. Panel bootstrap now retries, has visible failure/retry controls, and installs the handler before showing the UI. Panel exceptions have a visible recovery message. The loading screen has explicit contrasting colors for Figma dark mode.

Saved-session restoration now waits up to eight seconds in native Figma. A missing response reports failure instead of silently connecting anonymously and potentially replacing the saved identity. Config fetch and initial subscription loading have deadlines. No storage clearing is part of recovery.

Validation covers dropped first bootstrap message, absent runtime response, absent session response without replacement-credential writes, and delayed saved-session restoration against the live workspace in a sandboxed browser panel. Twelve plugin runtime regression tests pass. Actual Figma desktop execution remains user-verified; the test uses a simulated host.

Installed files at Downloads/kalpi-figma-plugin and the production ZIP were compared byte-for-byte against this build. Reopen the plugin to load the new code; no manifest reimport is needed for that installation path.

## Follow-up: message delivery identity

The user still saw the recovery screen after the first change. The earlier browser host always replied from `parent`; it did not cover window-relayed Figma delivery. The native UI now validates a per-plugin-launch identifier included by the runtime instead of assuming `MessageEvent.source === parent`. The runtime proactively posts its startup state after `showUI`, relying on Figma's documented queued delivery, while retaining request retries. No saved workspace or credential is removed.

The expanded browser test delivers native messages with `source: window` and checks restoration against live Maincloud. Thirteen runtime regression tests pass, including proactive startup and matching launch identifiers. This is simulated-host coverage, not a claimed Figma desktop test.

## Selection-driven opening

The panel no longer falls back to the first workspace design. Selection previews include the linked design ID; selecting an unlinked board clears the old editor and shows the board name with conversion controls. Selecting a linked design opens its matching editor. An explicit saved-design choice remains available. Browser coverage switches from an unlinked speaker board to a linked bottle and back, and asserts there is no automatic conversion request.

## Opaque-origin crypto compatibility

Conversion used `crypto.randomUUID`, which is not exposed by the user's Figma panel. Shared client IDs now use a UUID-v4 helper backed by `crypto.getRandomValues` when `randomUUID` is unavailable. There is no Math.random fallback. Artwork content hashing is optional when `crypto.subtle` is unavailable; uploads still proceed, without digest-based cache reuse.

Regression coverage disables both APIs in the sandboxed native panel, restores the saved workspace, clicks Convert using the speaker board image, and validates the outgoing request's operation ID. The generation response is intercepted, so this check does not invoke paid AI. This verifies conversion request initiation, not generated mesh quality.

## Post-conversion view handoff

A converted FORMA speaker was present in Maincloud while the panel still displayed “Adding its editable 2D views”. The panel now opens the persisted model before requesting Figma views. View creation has a separate 15-second status deadline; font loading has a 10-second deadline. Runtime errors identify the operation and saved design, and source boards retain a separate source-design link for reopening without reconstruction. Older saved designs can also be resolved through their recorded Figma node ID.

Verified with the actual seven-part saved speaker in the native runtime mock, plus regression tests for missing acknowledgement and font failure. No new generation calls were made. Actual desktop completion is not claimed by these tests.
