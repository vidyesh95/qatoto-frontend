// TRANSPORT: props-only — pure data. No I/O, no three.js, no React.
//
// The canonical viewing angles a CAD-style viewer offers, as spherical coordinates the camera rig
// hands straight to `camera-controls.rotateTo`. They live outside the engine chunk so the menu that
// lists them does not drag the renderer into the route's initial JavaScript.
//
// "FOUR VIEWS" IS DELIBERATELY ABSENT. A quad viewport needs four scissored `setViewport` passes
// per frame and its own camera per pane — a different renderer shape, for a convenience nobody
// browsing a teardown has asked for. Every preset here is one `rotateTo` and costs nothing.

/** Azimuth and polar angles in degrees; polar is measured from +Y down. */
export interface TeardownCameraAngle {
  readonly azimuthDegrees: number;
  readonly polarDegrees: number;
}

export const TEARDOWN_CAMERA_PRESETS = [
  "perspective",
  "front",
  "back",
  "left",
  "right",
  "top",
  "bottom",
] as const;
export type TeardownCameraPreset = (typeof TEARDOWN_CAMERA_PRESETS)[number];

export const TEARDOWN_CAMERA_PRESET_LABELS: Record<TeardownCameraPreset, string> = {
  perspective: "Perspective",
  front: "Front view",
  back: "Back view",
  left: "Left view",
  right: "Right view",
  top: "Top view",
  bottom: "Bottom view",
};

/**
 * Polar is clamped just inside the poles for top and bottom: `camera-controls` gimbal-locks at
 * exactly 0 or 180 and the azimuth becomes meaningless, which shows up as the model spinning on
 * its own axis when the next drag starts.
 */
export const TEARDOWN_CAMERA_PRESET_ANGLES: Record<TeardownCameraPreset, TeardownCameraAngle> = {
  perspective: { azimuthDegrees: 35, polarDegrees: 62 },
  front: { azimuthDegrees: 0, polarDegrees: 90 },
  back: { azimuthDegrees: 180, polarDegrees: 90 },
  left: { azimuthDegrees: -90, polarDegrees: 90 },
  right: { azimuthDegrees: 90, polarDegrees: 90 },
  top: { azimuthDegrees: 0, polarDegrees: 0.5 },
  bottom: { azimuthDegrees: 0, polarDegrees: 179.5 },
};

export const DEFAULT_TEARDOWN_CAMERA_PRESET: TeardownCameraPreset = "perspective";
