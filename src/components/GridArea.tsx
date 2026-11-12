import type { AnswerGrid } from "@/lib/storage/types";

/** Size of one square, like a school notebook. */
export const GRID_CELL_MM = 5;

/**
 * Graph paper or a coordinate plane, drawn as SVG.
 *
 * The drawing is measured in millimetres (viewBox units = mm), so on paper
 * each square is exactly 5 mm. SVG is made of lines, not pixels, so it stays
 * perfectly sharp when printed or saved as PDF. If the column is narrower
 * than the grid (2-column layout), it shrinks to fit.
 */
export function GridArea({ grid, className = "" }: { grid: AnswerGrid; className?: string }) {
  const c = GRID_CELL_MM;
  const width = grid.cols * c;
  const height = grid.rows * c;
  const coordinates = grid.kind === "coordinates";
  // Where the axes cross (counted in squares from the left / top).
  const originCol = Math.floor(grid.cols / 2);
  const originRow = Math.floor(grid.rows / 2);
  const ox = originCol * c;
  const oy = originRow * c;
  // Big grids get a number on every second square, so the numbers don't crowd.
  const step = Math.max(grid.cols, grid.rows) > 24 ? 2 : 1;

  const lines = [];
  for (let i = 0; i <= grid.cols; i++) lines.push(<line key={`v${i}`} x1={i * c} y1={0} x2={i * c} y2={height} />);
  for (let j = 0; j <= grid.rows; j++) lines.push(<line key={`h${j}`} x1={0} y1={j * c} x2={width} y2={j * c} />);

  return (
    <svg
      className={className}
      width={`${width}mm`}
      height={`${height}mm`}
      viewBox={`0 0 ${width} ${height}`}
      style={{ maxWidth: "100%", height: "auto", display: "block" }}
      aria-hidden="true"
    >
      <g stroke="#a3a3a3" strokeWidth={0.15}>{lines}</g>

      {coordinates && (
        <g fontSize={2.6} fill="#000" fontFamily="inherit">
          {/* Axes */}
          <g stroke="#000" strokeWidth={0.35}>
            <line x1={0} y1={oy} x2={width} y2={oy} />
            <line x1={ox} y1={0} x2={ox} y2={height} />
          </g>
          {/* Arrow heads */}
          <polygon points={`${width},${oy} ${width - 2},${oy - 0.9} ${width - 2},${oy + 0.9}`} />
          <polygon points={`${ox},0 ${ox - 0.9},2 ${ox + 0.9},2`} />
          <text x={width - 1.2} y={oy - 1.4} textAnchor="end" fontStyle="italic">x</text>
          <text x={ox + 1.4} y={2.4} fontStyle="italic">y</text>
          <text x={ox - 0.8} y={oy + 3} textAnchor="end">0</text>

          {/* Numbers along the x axis (skipping 0 and the very edges) */}
          {Array.from({ length: grid.cols - 1 }, (_, k) => k + 1)
            .filter((i) => i !== originCol && (i - originCol) % step === 0)
            .map((i) => (
              <text key={`x${i}`} x={i * c} y={oy + 3} textAnchor="middle">
                {i - originCol}
              </text>
            ))}
          {/* Numbers along the y axis */}
          {Array.from({ length: grid.rows - 1 }, (_, k) => k + 1)
            .filter((j) => j !== originRow && (originRow - j) % step === 0)
            .map((j) => (
              <text key={`y${j}`} x={ox - 0.8} y={j * c + 0.9} textAnchor="end">
                {originRow - j}
              </text>
            ))}
        </g>
      )}
    </svg>
  );
}
