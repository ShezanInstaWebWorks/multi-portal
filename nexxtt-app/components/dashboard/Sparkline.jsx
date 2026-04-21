export function Sparkline({ heights, color = "var(--color-teal)" }) {
  return (
    <div className="flex items-end gap-[3px] h-10 ml-auto">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-1.5 rounded-t-[3px] shrink-0 transition-opacity"
          style={{
            height: `${h}%`,
            background: color,
            opacity: i === heights.length - 1 ? 1 : 0.7,
          }}
        />
      ))}
    </div>
  );
}
