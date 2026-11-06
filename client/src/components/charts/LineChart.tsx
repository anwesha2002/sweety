import { niceYScale, scaleLinear } from '../../utils/chart';

export interface ChartPoint {
  /** Position along the x axis (any number; see `xDomain`). */
  x: number;
  y: number;
  /** Text shown when hovering the dot and read out by screen readers. */
  title: string;
}

export interface ChartTick {
  x: number;
  label: string;
}

interface LineChartProps {
  points: ChartPoint[];
  /** Labels under the x axis. */
  xTicks: ChartTick[];
  /** The x values at the left and right edges of the chart. */
  xDomain: [number, number];
  /** Shown above the y axis, e.g. "mg/dl". */
  yUnit: string;
  /** One-sentence description of the chart for screen readers. */
  ariaLabel: string;
}

const WIDTH = 640;
const HEIGHT = 300;
const MARGIN = { top: 20, right: 24, bottom: 44, left: 52 };

/**
 * A simple line chart drawn as SVG: a line through the points, a dot on each, grid lines and
 * axis labels. No charting library is needed for this. Hover a dot to see its value. On narrow
 * screens the chart keeps a readable size and scrolls sideways.
 */
export function LineChart({ points, xTicks, xDomain, yUnit, ariaLabel }: LineChartProps) {
  if (points.length === 0) return null;

  const sorted = [...points].sort((a, b) => a.x - b.x);
  const yAxis = niceYScale(sorted.map((point) => point.y));
  const toX = scaleLinear(xDomain[0], xDomain[1], MARGIN.left, WIDTH - MARGIN.right);
  const toY = scaleLinear(yAxis.min, yAxis.max, HEIGHT - MARGIN.bottom, MARGIN.top);

  const linePath = sorted
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${toX(point.x).toFixed(1)} ${toY(point.y).toFixed(1)}`,
    )
    .join(' ');

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={ariaLabel}
          className="h-auto w-full min-w-[520px]"
        >
          <text x={MARGIN.left} y={10} className="fill-slate-500 text-[11px]">
            {yUnit}
          </text>

          {yAxis.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={toY(tick)}
                y2={toY(tick)}
                className="stroke-slate-200"
              />
              <text
                x={MARGIN.left - 8}
                y={toY(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-slate-500 text-[11px]"
              >
                {tick}
              </text>
            </g>
          ))}

          {xTicks.map((tick) => (
            <text
              key={tick.x}
              x={toX(tick.x)}
              y={HEIGHT - MARGIN.bottom + 20}
              textAnchor="middle"
              className="fill-slate-500 text-[11px]"
            >
              {tick.label}
            </text>
          ))}

          <path
            d={linePath}
            fill="none"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            className="stroke-emerald-700"
          />

          {sorted.map((point) => (
            <circle
              key={point.x}
              cx={toX(point.x)}
              cy={toY(point.y)}
              r={4}
              strokeWidth={2}
              className="fill-emerald-700 stroke-white"
            >
              <title>{point.title}</title>
            </circle>
          ))}
        </svg>
      </div>

      {/* The chart is a picture to a screen reader; this list gives it the actual values. */}
      <ul className="sr-only">
        {sorted.map((point) => (
          <li key={point.x}>{point.title}</li>
        ))}
      </ul>
    </div>
  );
}
