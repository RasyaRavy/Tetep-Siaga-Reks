import { Card } from "@/components/ui/Card";
import type { ForecastSlot } from "@/types";

interface TempChartProps {
  slots: ForecastSlot[];
}

export function TempChart({ slots }: TempChartProps) {
  const sample = slots.slice(0, 10);
  if (sample.length < 2) return null;

  const temps = sample.map((s) => s.tempC);
  const minT = Math.min(...temps) - 2;
  const maxT = Math.max(...temps) + 2;
  const range = Math.max(1, maxT - minT);

  const width = 680;
  const height = 180;
  const padX = 36;
  const padTop = 28;
  const padBottom = 34;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;

  const points = sample.map((slot, idx) => {
    const x = padX + (idx / (sample.length - 1)) * innerW;
    const y = padTop + ((maxT - slot.tempC) / range) * innerH;
    return { x, y, slot };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <Card as="section" className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="title-section font-bold text-[var(--color-ink)]">
          Perubahan suhu hari ini hingga besok (WIB)
        </h2>
        <span className="tabular-nums text-xs font-medium text-[var(--color-ink-muted)]">
          Rentang {Math.min(...temps)}°C - {Math.max(...temps)}°C
        </span>
      </div>

      <div className="mt-3 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[460px]"
          role="img"
          aria-label="Grafik perubahan suhu per 3 jam dalam derajat Celsius"
        >
          <title>Grafik perubahan suhu per 3 jam</title>
          {/* Baseline */}
          <line
            x1={padX}
            y1={height - padBottom}
            x2={width - padX}
            y2={height - padBottom}
            stroke="var(--color-border-subtle)"
            strokeWidth="1"
          />

          {/* Temperature line */}
          <polyline
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={polylinePoints}
          />

          {/* Data nodes + labels */}
          {points.map((p) => (
            <g key={p.slot.utcDatetime}>
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="var(--color-surface)"
                stroke="var(--color-accent)"
                strokeWidth="2.5"
              />
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                fill="var(--color-ink)"
                fontSize="12"
                fontWeight="700"
              >
                {p.slot.tempC}°
              </text>
              <text
                x={p.x}
                y={height - 10}
                textAnchor="middle"
                fill="var(--color-ink-muted)"
                fontSize="11"
                fontWeight="500"
              >
                {p.slot.wibTime}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </Card>
  );
}
