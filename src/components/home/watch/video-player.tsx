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
};

/**
 * Engine-agnostic video player. Consumers pass a `src` and presentation
 * props; the underlying playback engine (currently the native HTML5 `<video>`
 * element) is an implementation detail. Swapping in HLS/Mux/etc. later means
 * editing only this file — callers keep the same prop contract.
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
}: VideoPlayerProps) {
  return (
    <div className={className}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src={src}
        aria-label={label}
        poster={poster}
        controls={controls}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline={playsInline}
        className="h-full w-full"
      />
    </div>
  );
}
