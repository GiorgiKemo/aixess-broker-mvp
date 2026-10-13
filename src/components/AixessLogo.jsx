import { AIXESS_WORDMARK } from "../brand/aixess-wordmark.js";

// Lasha's AIXESS wordmark as inline vector paths, filled with the surrounding text colour.
export function AixessLogo({ className, title = "AiXESS" }) {
  const { width, height, paths } = AIXESS_WORDMARK;
  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} width={width} height={height} fill="currentColor" role="img" aria-label={title} focusable="false">
      {paths.map((d) => <path key={d.slice(0, 24)} d={d} />)}
    </svg>
  );
}
