import { createRoot, type Root } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import type { GrowthHomeBridge, GrowthHomeData } from "./types";

let root: Root | null = null;

export type MountGrowthHomeArgs = {
  data: GrowthHomeData;
  bridge: GrowthHomeBridge;
};

export function mountGrowthHome(container: HTMLElement, args: MountGrowthHomeArgs) {
  if (root) {
    root.unmount();
    root = null;
  }
  root = createRoot(container);
  root.render(<App data={args.data} bridge={args.bridge} />);
}

export function unmountGrowthHome() {
  root?.unmount();
  root = null;
}

/** Ensure classic script hosts always see the API on globalThis (not only Rollup's `this` IIFE foot). */
const growthHomeApi = { mountGrowthHome, unmountGrowthHome };
if (typeof globalThis !== "undefined") {
  globalThis.PostPlateGrowthHome = growthHomeApi;
}
