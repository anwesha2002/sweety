import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getDailyReport,
  getMonthlyReport,
  getMonthToDateReport,
} from '../../services/reports.service';
import { renderWithProviders } from '../../test/render';
import { ReportsPage } from './ReportsPage';

vi.mock('../../services/reports.service', () => ({
  getDailyReport: vi.fn(),
  getMonthToDateReport: vi.fn(),
  getMonthlyReport: vi.fn(),
}));

const EMPTY = { highest: null, lowest: null, average: null, count: 0 };

function mockEmptyReports() {
  vi.mocked(getDailyReport).mockImplementation(async (date) => ({
    date,
    summary: EMPTY,
    readings: [],
  }));
  vi.mocked(getMonthToDateReport).mockImplementation(async (date) => ({
    from: `${date.slice(0, 8)}01`,
    to: date,
    summary: EMPTY,
  }));
  vi.mocked(getMonthlyReport).mockImplementation(async () => ({
    month: '2026-10',
    from: '2026-10-01',
    to: '2026-10-31',
    summary: EMPTY,
  }));
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.mocked(getDailyReport).mockReset();
    vi.mocked(getMonthToDateReport).mockReset();
    vi.mocked(getMonthlyReport).mockReset();
  });

  it('shows a friendly empty message in all three cards when there is no data', async () => {
    mockEmptyReports();

    renderWithProviders(<ReportsPage />);

    expect(await screen.findAllByText('No readings for this period.')).toHaveLength(3);
    // Never zeros that look like data.
    expect(screen.queryByText('Highest')).not.toBeInTheDocument();
  });

  it('shows the numbers, the day’s readings and the period labels', async () => {
    vi.mocked(getDailyReport).mockResolvedValue({
      date: '2026-11-06',
      summary: { highest: 142, lowest: 96, average: 112.7, count: 3 },
      readings: [
        { slot: 'MORNING', label: 'Morning (fasting)', value: 96 },
        { slot: 'AFTER_LUNCH', label: 'After lunch', value: 142 },
        { slot: 'AFTER_DINNER', label: 'After dinner', value: 100 },
      ],
    });
    vi.mocked(getMonthToDateReport).mockResolvedValue({
      from: '2026-11-01',
      to: '2026-11-06',
      summary: { highest: 142, lowest: 96, average: 115.6, count: 5 },
    });
    vi.mocked(getMonthlyReport).mockResolvedValue({
      month: '2026-10',
      from: '2026-10-01',
      to: '2026-10-31',
      summary: { highest: 150, lowest: 90, average: 120, count: 2 },
    });

    renderWithProviders(<ReportsPage />);

    const daily = within(await screen.findByRole('region', { name: 'Daily' }));
    expect(await daily.findByText('112.7')).toBeInTheDocument();
    expect(daily.getByText('Morning (fasting)')).toBeInTheDocument();
    expect(daily.getByText('96 mg/dl')).toBeInTheDocument();

    const monthToDate = within(screen.getByRole('region', { name: 'Month to date' }));
    expect(await monthToDate.findByText('115.6')).toBeInTheDocument();
    expect(monthToDate.getByText('1 Nov 2026 – 6 Nov 2026')).toBeInTheDocument();

    const previous = within(screen.getByRole('region', { name: 'Previous month' }));
    expect(await previous.findByText('October 2026')).toBeInTheDocument();
    expect(previous.getByText('120')).toBeInTheDocument();
  });

  it('asks for a date, and sends no requests, when the date is cleared', async () => {
    mockEmptyReports();
    renderWithProviders(<ReportsPage />);
    await screen.findAllByText('No readings for this period.');
    vi.mocked(getDailyReport).mockClear();

    fireEvent.change(screen.getByLabelText('Report date'), { target: { value: '' } });

    expect(await screen.findByText('Choose a date to see your reports.')).toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(getDailyReport).not.toHaveBeenCalled();
  });

  it('fetches the reports again for a newly chosen date', async () => {
    mockEmptyReports();
    renderWithProviders(<ReportsPage />);
    await screen.findAllByText('No readings for this period.');

    fireEvent.change(screen.getByLabelText('Report date'), { target: { value: '2026-10-15' } });

    expect(await screen.findByText('15 Oct 2026')).toBeInTheDocument();
    expect(getDailyReport).toHaveBeenCalledWith('2026-10-15');
  });
});
