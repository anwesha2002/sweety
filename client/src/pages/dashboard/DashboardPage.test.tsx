import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDailyReport, getMonthToDateReport } from '../../services/reports.service';
import { renderWithProviders } from '../../test/render';
import type { DailyReport, MonthToDateReport } from '../../types/report';
import { DashboardPage } from './DashboardPage';

vi.mock('../../services/reports.service', () => ({
  getDailyReport: vi.fn(),
  getMonthToDateReport: vi.fn(),
  getMonthlyReport: vi.fn(),
}));

const EMPTY = { highest: null, lowest: null, average: null, count: 0 };

const emptyDaily: DailyReport = { date: '2026-11-06', summary: EMPTY, readings: [] };
const emptyMonth: MonthToDateReport = { from: '2026-11-01', to: '2026-11-06', summary: EMPTY };

/** The text of the cards inside a labelled section, e.g. "Highest — No readings yet". */
function cardsIn(headingId: string): string[] {
  const section = document.querySelector(`section[aria-labelledby="${headingId}"]`);
  return [...(section?.querySelectorAll('.grid > div') ?? [])].map((card) =>
    (card.textContent ?? '').trim(),
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(getDailyReport).mockReset();
    vi.mocked(getMonthToDateReport).mockReset();
  });

  it('welcomes the user by first name', async () => {
    vi.mocked(getDailyReport).mockResolvedValue(emptyDaily);
    vi.mocked(getMonthToDateReport).mockResolvedValue(emptyMonth);

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByRole('heading', { name: 'Welcome, Asha' })).toBeInTheDocument();
  });

  it('shows empty states, not made-up numbers, when there are no readings', async () => {
    vi.mocked(getDailyReport).mockResolvedValue(emptyDaily);
    vi.mocked(getMonthToDateReport).mockResolvedValue(emptyMonth);

    renderWithProviders(<DashboardPage />);

    await screen.findAllByText('No reading recorded');
    expect(screen.getAllByText('No readings yet')).toHaveLength(4);
    expect(screen.getAllByText('—')).toHaveLength(4);
    expect(screen.getAllByText('No reading recorded')).toHaveLength(4);
  });

  it('shows real numbers from the month-to-date summary and today’s readings by slot', async () => {
    vi.mocked(getDailyReport).mockResolvedValue({
      date: '2026-11-06',
      summary: { highest: 142, lowest: 96, average: 119, count: 2 },
      readings: [
        { slot: 'MORNING', label: 'Morning (fasting)', value: 96 },
        { slot: 'AFTER_LUNCH', label: 'After lunch', value: 142 },
      ],
    });
    vi.mocked(getMonthToDateReport).mockResolvedValue({
      from: '2026-11-01',
      to: '2026-11-06',
      summary: { highest: 142, lowest: 96, average: 119.5, count: 4 },
    });

    renderWithProviders(<DashboardPage />);

    await screen.findByText('119.5');
    const stats = within(screen.getByRole('region', { name: 'This month so far' }));
    expect(stats.getByText('142')).toBeInTheDocument();
    expect(stats.getByText('96')).toBeInTheDocument();
    expect(stats.getByText('119.5')).toBeInTheDocument();
    expect(stats.getByText('4')).toBeInTheDocument();

    expect(cardsIn('today-heading')).toEqual([
      'Morning (fasting)96mg/dl',
      'After breakfastNo reading recorded',
      'After lunch142mg/dl',
      'After dinnerNo reading recorded',
    ]);
  });

  it('shows an error with a retry button when loading fails', async () => {
    vi.mocked(getDailyReport).mockRejectedValue(new Error('network'));
    vi.mocked(getMonthToDateReport).mockRejectedValue(new Error('network'));

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your readings.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('opens the add-reading dialog from the button', async () => {
    vi.mocked(getDailyReport).mockResolvedValue(emptyDaily);
    vi.mocked(getMonthToDateReport).mockResolvedValue(emptyMonth);
    // jsdom has no <dialog> modal support, so give it a minimal version.
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
    };

    const { default: userEvent } = await import('@testing-library/user-event');
    renderWithProviders(<DashboardPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Add reading' }));

    expect(await screen.findByRole('heading', { name: 'Add reading' })).toBeInTheDocument();
    expect(screen.getByLabelText('Time of day')).toBeInTheDocument();
  });
});
