import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createReading } from '../../services/readings.service';
import { renderWithProviders } from '../../test/render';
import type { Reading } from '../../types/reading';
import { toLocalDateString } from '../../utils/date';
import { ReadingForm } from './ReadingForm';

vi.mock('../../services/readings.service', () => ({
  createReading: vi.fn(),
  updateReading: vi.fn(),
  listReadings: vi.fn(),
  deleteReading: vi.fn(),
}));

const createReadingMock = vi.mocked(createReading);
const savedReading: Reading = {
  id: 'r1',
  date: toLocalDateString(new Date()),
  slot: 'AFTER_LUNCH',
  value: 120,
  createdAt: '2026-11-06T09:00:00.000Z',
};

/** An error shaped like the one Axios throws for a non-2xx response. */
function serverError(status: number, data: object): AxiosError {
  return new AxiosError('Request failed', String(status), undefined, undefined, {
    status,
    data,
  } as AxiosResponse);
}

function renderForm() {
  const onDone = vi.fn();
  const onCancel = vi.fn();
  renderWithProviders(<ReadingForm onDone={onDone} onCancel={onCancel} />);
  return { onDone, onCancel };
}

async function fillAndSubmit(slot: string, value: string) {
  const user = userEvent.setup();
  if (slot) await user.selectOptions(screen.getByLabelText('Time of day'), slot);
  if (value) await user.type(screen.getByLabelText(/Glucose value/), value);
  await user.click(screen.getByRole('button', { name: 'Save reading' }));
}

describe('ReadingForm', () => {
  beforeEach(() => {
    createReadingMock.mockReset();
  });

  it('defaults the date to today (local) and does not allow later dates', () => {
    renderForm();

    const date = screen.getByLabelText('Date');
    const today = toLocalDateString(new Date());
    expect(date).toHaveValue(today);
    expect(date).toHaveAttribute('max', today);
  });

  it('shows the required messages when submitted empty, and sends nothing', async () => {
    renderForm();

    await fillAndSubmit('', '');

    expect(await screen.findByText('Choose a reading time.')).toBeInTheDocument();
    expect(screen.getByText('Please enter a glucose value.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Glucose value/)).toHaveAttribute('aria-invalid', 'true');
    expect(createReadingMock).not.toHaveBeenCalled();
  });

  it.each(['39', '601'])('shows the range message for %s', async (value) => {
    renderForm();

    await fillAndSubmit('MORNING', value);

    expect(await screen.findByText('Value must be between 40 and 600 mg/dl.')).toBeInTheDocument();
    expect(createReadingMock).not.toHaveBeenCalled();
  });

  it('saves a valid reading and calls onDone', async () => {
    createReadingMock.mockResolvedValue(savedReading);
    const { onDone } = renderForm();

    await fillAndSubmit('AFTER_LUNCH', '120');

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(createReadingMock).toHaveBeenCalledWith({
      date: toLocalDateString(new Date()),
      slot: 'AFTER_LUNCH',
      value: 120,
    });
  });

  it('shows a server rule message (409) in an alert and stays open', async () => {
    createReadingMock.mockRejectedValue(
      serverError(409, {
        success: false,
        message: 'You already have an After lunch reading for this date.',
      }),
    );
    const { onDone } = renderForm();

    await fillAndSubmit('AFTER_LUNCH', '120');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You already have an After lunch reading for this date.',
    );
    expect(onDone).not.toHaveBeenCalled();
  });

  it('puts a server field error next to its field', async () => {
    createReadingMock.mockRejectedValue(
      serverError(400, {
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'date', message: 'Date cannot be in the future.' }],
      }),
    );
    renderForm();

    await fillAndSubmit('MORNING', '100');

    expect(await screen.findByText('Date cannot be in the future.')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('calls onCancel from the Cancel button', async () => {
    const { onCancel } = renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
