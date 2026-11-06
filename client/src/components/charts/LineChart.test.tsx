import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LineChart } from './LineChart';

const points = [
  { x: 0, y: 100, title: '1 Nov: 100 mg/dl' },
  { x: 2, y: 140, title: '3 Nov: 140 mg/dl' },
  { x: 1, y: 120, title: '2 Nov: 120 mg/dl' }, // out of order on purpose
];
const xTicks = [
  { x: 0, label: '1 Nov' },
  { x: 2, label: '3 Nov' },
];

function renderChart(overrides: Partial<Parameters<typeof LineChart>[0]> = {}) {
  return render(
    <LineChart
      points={points}
      xTicks={xTicks}
      xDomain={[0, 2]}
      yUnit="mg/dl"
      ariaLabel="Average glucose from 1 Nov to 3 Nov"
      {...overrides}
    />,
  );
}

describe('LineChart', () => {
  it('is described to screen readers', () => {
    renderChart();

    expect(
      screen.getByRole('img', { name: 'Average glucose from 1 Nov to 3 Nov' }),
    ).toBeInTheDocument();
  });

  it('draws one dot per point with the value as its tooltip', () => {
    const { container } = renderChart();

    expect(container.querySelectorAll('circle')).toHaveLength(3);
    expect(container.querySelectorAll('circle title')).toHaveLength(3);
    expect([...container.querySelectorAll('circle title')].map((t) => t.textContent)).toEqual([
      '1 Nov: 100 mg/dl',
      '2 Nov: 120 mg/dl',
      '3 Nov: 140 mg/dl',
    ]);
  });

  it('joins the points with one line, left to right', () => {
    const { container } = renderChart();

    const path = container.querySelector('path')?.getAttribute('d') ?? '';
    expect(path.startsWith('M')).toBe(true);
    expect(path.match(/L/g)).toHaveLength(2);
    expect(path).not.toContain('NaN');

    // Rising values: each point is higher on screen (smaller y) than the one before it.
    const ys = [...path.matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((match) => Number(match[1]));
    expect(ys[0]).toBeGreaterThan(ys[1]!);
    expect(ys[1]).toBeGreaterThan(ys[2]!);
  });

  it('labels both axes', () => {
    const { container } = renderChart();

    const labels = [...container.querySelectorAll('text')].map((text) => text.textContent);
    expect(labels).toContain('mg/dl');
    expect(labels).toContain('1 Nov');
    expect(labels).toContain('3 Nov');
    expect(labels).toContain('100'); // a y-axis grid value
  });

  it('lists the values for screen readers', () => {
    renderChart();

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '1 Nov: 100 mg/dl',
      '2 Nov: 120 mg/dl',
      '3 Nov: 140 mg/dl',
    ]);
  });

  it('draws a single point without broken numbers', () => {
    const { container } = renderChart({
      points: [{ x: 0, y: 130, title: '4 Nov: 130 mg/dl' }],
      xDomain: [0, 0],
    });

    expect(container.querySelectorAll('circle')).toHaveLength(1);
    expect(container.innerHTML).not.toContain('NaN');
  });

  it('renders nothing when there are no points', () => {
    const { container } = renderChart({ points: [] });

    expect(container).toBeEmptyDOMElement();
  });
});
