export type VideoPlayerChapter = {
  title: string;
  time: string;
};

export type VideoPlayerProps = {
  src: string;
  label: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  className?: string;
  /** Chapter markers rendered on the seek bar (times as "mm:ss" or "hh:mm:ss"). */
  chapters?: VideoPlayerChapter[];
  /** WebVTT storyboard file for seek-bar hover previews. */
  thumbnailsSrc?: string;
  /** Initial playback position, e.g. from a `?t=` deep link. */
  startTimeSeconds?: number;
};

/**
 * Engine-agnostic video player. Consumers pass a `src` and presentation
 * props; the underlying playback engine (currently the native HTML5
 * `<video>` element) is an implementation detail. Swapping engines later
 * means editing only this file — callers keep the same prop contract.
 */
export default function VideoPlayer({
  src,
  label,
  poster,
  autoPlay = false,
  muted = false,
  controls = true,
  loop = false,
  playsInline = true,
  className = "w-full aspect-video rounded-xl overflow-hidden bg-black",
  // chapters — NOT implemented with the native HTML5 player. Browsers parse
  // <track kind="chapters"> but no major browser renders chapter markers or
  // titles on the native seek bar, and the native <track> element requires a
  // `src` URL (our chapters arrive as inline data, not a hosted VTT file).
  // Showing chapters needs a custom controls UI on top of <video>.
  // chapters,
  //
  // thumbnailsSrc — NOT implemented with the native HTML5 player. HTML5 has
  // no API for storyboard/hover thumbnail previews over the native controls;
  // it requires a custom seek bar that reads the storyboard VTT and positions
  // preview images on hover.
  // thumbnailsSrc,
  startTimeSeconds,
}: VideoPlayerProps) {
  // Media fragment (#t=) makes the native player start at the given offset
  // without any JS seeking.
  const srcWithStartTime =
    startTimeSeconds !== undefined && startTimeSeconds > 0 ? `${src}#t=${startTimeSeconds}` : src;

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption -- caption tracks arrive with real uploads; mock clips have none
    <video
      src={srcWithStartTime}
      aria-label={label}
      poster={poster}
      autoPlay={autoPlay}
      muted={muted}
      controls={controls}
      loop={loop}
      playsInline={playsInline}
      className={className}
    />
  );
}
