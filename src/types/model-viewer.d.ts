/**
 * JSX typing for `<model-viewer>`, the custom element `@google/model-viewer` registers (A47).
 *
 * ATTRIBUTE PROPS ONLY, AND NO `on*` PROPS, DELIBERATELY. React 19 hands a custom element's
 * unknown props straight through: a boolean becomes a present-or-absent attribute, which is what
 * `camera-controls` and `auto-rotate` are — but an `onLoad` prop is subscribed with
 * `addEventListener("Load")`, case preserved, and that event never fires. The viewer wires `load`
 * and `error` by ref in an effect instead, and this file gives it no way to do otherwise.
 *
 * A type-only import makes this a module, so the block below AUGMENTS React's `JSX` namespace
 * rather than declaring a shadowing global one. Under `@types/react` 19 that namespace lives on
 * the `react` module, which is why `declare module "react"` is the form that works.
 */
import type { ModelViewerElement } from "@google/model-viewer";
import type { DetailedHTMLProps, HTMLAttributes } from "react";

interface ModelViewerAttributes extends HTMLAttributes<ModelViewerElement> {
  readonly src: string;
  readonly alt?: string;
  readonly poster?: string;
  readonly "camera-controls"?: boolean;
  readonly "auto-rotate"?: boolean;
  readonly "interaction-prompt"?: "auto" | "none";
  readonly "touch-action"?: "pan-y" | "pan-x" | "none";
  readonly "shadow-intensity"?: string;
  readonly exposure?: string;
  readonly "environment-image"?: string;
  readonly loading?: "auto" | "lazy" | "eager";
  readonly reveal?: "auto" | "manual";
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": DetailedHTMLProps<ModelViewerAttributes, ModelViewerElement>;
    }
  }
}
