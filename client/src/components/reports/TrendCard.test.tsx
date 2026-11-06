import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDailyReport, getTrendReport } from '../../services/reports.service';
import {
  formatDisplayDate,
  formatMonthLabel,
  lastDayOfMonth,
  shiftDate,
  toLocalDateString,
} from '../../utils/date';
import { TrendCard } from './TrendCard';

vi.mock('../../services/reports.service', () => ({
  getDailyReport: vi.fn(),
  getTrendReport: vi.fn(),
  getMonthToDateReport: vi.fn(),
  getMonthlyReport: vi.fn(),
}));

const trendMock = vi.mocked(getTrendReport);
const dailyMock = vi.mocked(getDailyReport);

const today = toLocalDateString(new Date());
const thisMonth = today.slice(0, 7);
const EMPTY_SUMMARY = { highest: null, lowest: null, average: null, count: 0 };

/** Two days with readings, inside whatever range is asked for. */
function mockTrendWithData() {
  trendMock.mockImplementation(async (from, to) => ({
    from,
    to,
    points: [
      { date: from, average: 100.5, count: 2 },
      { date: shiftDate(from, 1), average: 120, count: 1 },
    ],
  }));
}

/** The tooltip text of each dot in the chart. */
function dotTitles(): string[] {
  return [...document.querySelectorAll('circle title')].map((title) => title.textContent ?? '');
}

describe('TrendCard', () => {
  beforeEach(() => {
    trendMock.mockReset();
    dailyMock.mockReset();
  });

  it('starts on the current month and draws the daily averages', async () => {
    mockTrendWithData();

    render(<TrendCard />);

    const chart = await screen.findByRole('img', {
      name: /Average glucose for each day from/,
    });
    expect(chart).toBeInTheDocument();
    expect(trendMock).toHaveBeenCalledWith(`${thisMonth}-01`, lastDayOfMonth(thisMonth));
    expect(dotTitles()).toEqual([
      `${formatDisplayDate(`${thisMonth}-01`)}: 100.5 mg/dl (2 readings)`,
      `${formatDisplayDate(`${thisMonth}-02`)}: 120 mg/dl (1 reading)`,
    ]);
    expect(
      screen.getByText(`Daily averages for ${formatMonthLabel(thisMonth)} · 2 days with readings`),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Day' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows a friendly message, and no chart, when the period has no readings', async () => {
    trendMock.mockImplementation(async (from, to) => ({ from, to, points: [] }));

    render(<TrendCard />);

    expect(await screen.findByText('No readings in this period.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('draws another month when a different month is chosen', async () => {
    mockTrendWithData();
    render(<TrendCard />);
    await screen.findByRole('img');

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-02' } });

    await waitFor(() => expect(trendMock).toHaveBeenCalledWith('2026-02-01', '2026-02-28'));
    expect(await screen.findByText(/Daily averages for February 2026/)).toBeInTheDocument();
  });

  it('shows each reading of the day, by time of day, in the Day view', async () => {
    mockTrendWithData();
    dailyMock.mockImplementation(async (date) => ({
      date,
      summary: { highest: 142, lowest: 96, average: 119, count: 2 },
      readings: [
        { slot: 'MORNING', label: 'Morning (fasting)', value: 96 },
        { slot: 'AFTER_LUNCH', label: 'After lunch', value: 142 },
      ],
    }));
    render(<TrendCard />);
    await screen.findByRole('img');

    await userEvent.click(screen.getByRole('button', { name: 'Day' }));

    expect(
      await screen.findByRole('img', {
        name: `Glucose readings on ${formatDisplayDate(today)}, by time of day`,
      }),
    ).toBeInTheDocument();
    expect(dailyMock).toHaveBeenCalledWith(today);
    expect(dotTitles()).toEqual(['Morning (fasting): 96 mg/dl', 'After lunch: 142 mg/dl']);
    // All four times of day are on the axis, even those without a reading.
    const axisLabels = [...document.querySelectorAll('svg text')].map((text) => text.textContent);
    for (const label of ['Morning', 'Breakfast', 'Lunch', 'Dinner']) {
      expect(axisLabels).toContain(label);
    }
    expect(screen.getByText(`Each reading on ${formatDisplayDate(today)}`)).toBeInTheDocument();
  });

  it('says so when the chosen day has no readings', async () => {
    mockTrendWithData();
    dailyMock.mockImplementation(async (date) => ({ date, summary: EMPTY_SUMMARY, readings: [] }));
    render(<TrendCard />);
    await screen.findByRole('img');

    await userEvent.click(screen.getByRole('button', { name: 'Day' }));

    expect(await screen.findByText('No readings in this period.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('draws the last 30 days by default in the Date range view, and a new range on change', async () => {
    mockTrendWithData();
    render(<TrendCard />);
    await screen.findByRole('img');

    await userEvent.click(screen.getByRole('button', { name: 'Date range' }));

    await waitFor(() => expect(trendMock).toHaveBeenCalledWith(shiftDate(today, -29), today));
    expect(screen.getByLabelText('From')).toHaveValue(shiftDate(today, -29));
    expect(screen.getByLabelText('To')).toHaveValue(today);

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-10' } });

    await waitFor(() => expect(trendMock).toHaveBeenCalledWith('2026-01-10', today));
  });

  it('explains an invalid range and does not ask the server', async () => {
    mockTrendWithData();
    render(<TrendCard />);
    await screen.findByRole('img');
    await userEvent.click(screen.getByRole('button', { name: 'Date range' }));
    await waitFor(() => expect(trendMock).toHaveBeenCalledWith(shiftDate(today, -29), today));
    trendMock.mockClear();

    fireEvent.change(screen.getByLabelText('From'), { target: { value: shiftDate(today, 1) } });
    expect(
      await screen.findByText('End date must be on or after the start date.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2020-01-01' } });
    expect(await screen.findByText('Choose a range of one year or less.')).toBeInTheDocument();

    expect(trendMock).not.toHaveBeenCalled();
  });

  it('shows an error with a retry button when loading fails, and recovers', async () => {
    // The first request fails; every later one (the retry) succeeds.
    trendMock.mockRejectedValueOnce(new Error('network down'));
    trendMock.mockImplementation(async (from, to) => ({
      from,
      to,
      points: [{ date: from, average: 110, count: 1 }],
    }));

    render(<TrendCard />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the chart.');

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('img')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
