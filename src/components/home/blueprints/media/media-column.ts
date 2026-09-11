// TRANSPORT: props-only — one layout constant. No data.
//
// THE MEDIA COLUMN: how wide a video or an image may run in a blueprint's reading column. 48rem
// (768px) is exactly the showcase detail page's reading column from 1440px, and media never
// reshapes to make room. A video fills the column. A write-up image is only capped by it: one wider
// than 768px shrinks to the same edges as the video, and a smaller one keeps its own size, as on
// GitHub and Launch YC. Before this constant, images were capped at the prose measure (65ch, about
// 600px) and ran narrower than the videos beside them.
export const BLUEPRINT_MEDIA_COLUMN_CLASS = "w-full max-w-3xl";
