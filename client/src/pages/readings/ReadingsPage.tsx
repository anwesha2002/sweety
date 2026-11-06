import { ClipboardList, Plus } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../components/common/Alert';
import { Button } from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';
import { TextField } from '../../components/common/TextField';
import { ReadingDialog } from '../../components/readings/ReadingDialog';
import { ReadingsList } from '../../components/readings/ReadingsList';
import { GLUCOSE_UNIT } from '../../constants/glucose';
import { SLOT_LABELS } from '../../constants/slots';
import { useReadings } from '../../hooks/useReadings';
import { deleteReading } from '../../services/readings.service';
import type { Reading } from '../../types/reading';
import { getApiError } from '../../utils/apiError';
import { formatDisplayDate } from '../../utils/date';

const PAGE_SIZE = 10;

export function ReadingsPage() {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Reading | null>(null);
  const [deleting, setDeleting] = useState<Reading | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = from !== '' || to !== '';
  // Same rule as the server (from <= to), checked here so we do not send a request that fails.
  const rangeInvalid = from !== '' && to !== '' && from > to;

  const readings = useReadings(
    { from: from || undefined, to: to || undefined, page, pageSize: PAGE_SIZE },
    { enabled: !rangeInvalid },
  );

  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1); // a new filter starts again from the first page
  }

  function clearFilters() {
    setFrom('');
    setTo('');
    setPage(1);
  }

  function closeDeleteDialog() {
    setDeleting(null);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    const onLastPage = (readings.data?.items.length ?? 0) === 1 && page > 1;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteReading(deleting.id);
      closeDeleteDialog();
      if (onLastPage) {
        // Deleting the only reading on the last page would leave an empty page behind.
        setPage(page - 1);
      } else {
        readings.refetch();
      }
    } catch (error) {
      setDeleteError(getApiError(error).message);
    } finally {
      setIsDeleting(false);
    }
  }

  const data = readings.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">My Readings</h1>
        <Button onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Add reading
        </Button>
      </div>

      <section aria-label="Filter by date" className="flex flex-wrap items-end gap-4">
        <TextField
          label="From"
          type="date"
          value={from}
          onChange={(event) => changeFilter(setFrom, event.target.value)}
        />
        <TextField
          label="To"
          type="date"
          value={to}
          onChange={(event) => changeFilter(setTo, event.target.value)}
          error={rangeInvalid ? 'End date must be on or after the start date.' : undefined}
        />
        {filtered && (
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </section>

      {readings.isError && (
        <div className="space-y-3">
          <Alert>{getApiError(readings.error).message}</Alert>
          <Button variant="secondary" onClick={readings.refetch}>
            Try again
          </Button>
        </div>
      )}

      {readings.isLoading && (
        <p role="status" className="text-sm text-slate-600">
          Loading readings…
        </p>
      )}

      {data && !rangeInvalid && (
        <>
          {data.items.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={filtered ? 'No readings in this date range' : 'No readings yet'}
              description={
                filtered
                  ? 'Try a different range, or clear the filters.'
                  : 'Add your first reading to start tracking your glucose.'
              }
            />
          ) : (
            <div aria-busy={readings.isFetching} className="space-y-4">
              <p className="text-sm text-slate-600">
                {data.pagination.total} reading{data.pagination.total === 1 ? '' : 's'}
              </p>
              <ReadingsList items={data.items} onEdit={setEditing} onDelete={setDeleting} />
              <Pagination
                page={data.pagination.page}
                totalPages={data.pagination.totalPages}
                onChange={setPage}
              />
            </div>
          )}
        </>
      )}

      <ReadingDialog
        open={adding || editing !== null}
        reading={editing ?? undefined}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        onSaved={readings.refetch}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete reading?"
        message={
          deleting
            ? `Delete the ${SLOT_LABELS[deleting.slot]} reading from ${formatDisplayDate(deleting.date)} (${deleting.value} ${GLUCOSE_UNIT})? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={() => void confirmDelete()}
        onCancel={closeDeleteDialog}
      />
    </div>
  );
}
