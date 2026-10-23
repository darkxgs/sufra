import QRCode from "qrcode";

// A QR code drawn as SVG on the server: round data dots, and the three finder
// squares kept solid and square-ish so every phone camera still locks on.

type Props = { value: string; className?: string; color?: string; label: string };

export function Qr({ value, className, color = "currentColor", label }: Props) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const quiet = 3;
  const size = n + quiet * 2;
  const inFinder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const dots: string[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!inFinder(r, c) && qr.modules.get(r, c)) dots.push(`M${c + quiet + 0.5},${r + quiet + 0.08}a.42,.42 0 1,0 .001,0`);
    }
  }
  const finder = (r: number, c: number) => {
    const x = c + quiet;
    const y = r + quiet;
    return (
      <g key={`${r}-${c}`}>
        <rect x={x + 0.5} y={y + 0.5} width={6} height={6} rx={1.6} fill="none" stroke={color} strokeWidth={1} />
        <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.8} fill={color} />
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label={label} shapeRendering="geometricPrecision">
      <rect width={size} height={size} fill="white" rx={1.5} />
      <path d={dots.join("")} fill={color} />
      {finder(0, 0)}
      {finder(0, n - 7)}
      {finder(n - 7, 0)}
    </svg>
  );
}
