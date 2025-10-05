// Dev preamble for React Fast Refresh must execute before any React modules
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - virtual module provided by Vite in dev
import '/@react-refresh'
if (import.meta.hot) {
  ;(window as any).__vite_plugin_react_preamble_installed__ = true
  ;(window as any).$RefreshReg$ = () => {}
  ;(window as any).$RefreshSig$ = () => (type: unknown) => type
}

import { StartClient } from "@tanstack/react-start/client";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

// Ensure React Fast Refresh preamble is installed for Vite when using TanStack Start
// The React plugin expects this to run before any transformed React modules
// Note: injectIntoGlobalHook is handled internally by the preamble module

hydrateRoot(
    document,
    <StrictMode>
        <StartClient />
    </StrictMode>
);
