export function NexxttLogo({ width = 160, height, className = "" }) {
  return (
    <svg
      viewBox="0 0 220 44"
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <text
        x="0"
        y="34"
        fontFamily="'Bricolage Grotesque',sans-serif"
        fontSize="34"
        fontWeight="800"
        fill="white"
        letterSpacing="-1.5"
      >
        nexx
      </text>
      <text
        x="89"
        y="34"
        fontFamily="'Bricolage Grotesque',sans-serif"
        fontSize="34"
        fontWeight="800"
        fill="white"
        letterSpacing="-1.5"
      >
        tt
      </text>
      <circle cx="136" cy="30" r="4.5" fill="#00B8A9" />
      <text
        x="143"
        y="34"
        fontFamily="'Bricolage Grotesque',sans-serif"
        fontSize="34"
        fontWeight="800"
        fill="white"
        letterSpacing="-1.5"
      >
        io
      </text>
    </svg>
  );
}
