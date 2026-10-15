import { AIXESS_WORDMARK } from "../brand/aixess-wordmark.js";

// Lasha's AIXESS wordmark as inline vector paths, filled with the surrounding text colour.
// The S curves touch the viewBox edges, so overflow stays visible: with the default hidden
// overflow, a logo at a fractional pixel position lost the bottom of its S letters (Klem, 15 October 2026).
export function AixessLogo({ className, title = "AiXESS" }) {
  const { width, height, paths } = AIXESS_WORDMARK;
  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} width={width} height={height} fill="currentColor" style={{ overflow: "visible" }} role="img" aria-label={title} focusable="false">
      {paths.map((d) => <path key={d.slice(0, 24)} d={d} />)}
    </svg>
  );
}
