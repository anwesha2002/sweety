import { Pencil, Trash2 } from 'lucide-react';
import { GLUCOSE_UNIT } from '../../constants/glucose';
import { SLOT_LABELS } from '../../constants/slots';
import type { Reading } from '../../types/reading';
import { formatDisplayDate } from '../../utils/date';

interface ReadingsListProps {
  items: Reading[];
  onEdit: (reading: Reading) => void;
  onDelete: (reading: Reading) => void;
}

const ACTION_BUTTON = 'rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900';

/** A short description used in button labels, e.g. "reading from 4 Nov 2026, After lunch". */
function describe(reading: Reading): string {
  return `reading from ${formatDisplayDate(reading.date)}, ${SLOT_LABELS[reading.slot]}`;
}

function Actions({
  reading,
  onEdit,
  onDelete,
}: { reading: Reading } & Omit<ReadingsListProps, 'items'>) {
  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        onClick={() => onEdit(reading)}
        aria-label={`Edit ${describe(reading)}`}
        className={ACTION_BUTTON}
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(reading)}
        aria-label={`Delete ${describe(reading)}`}
        className={`${ACTION_BUTTON} hover:text-red-700`}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** A table on wide screens and stacked cards on narrow ones. */
export function ReadingsList({ items, onEdit, onDelete }: ReadingsListProps) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Your glucose readings, newest first</caption>
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Date
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Time of day
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Glucose ({GLUCOSE_UNIT})
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((reading) => (
              <tr key={reading.id}>
                <td className="px-4 py-3 text-slate-900">{formatDisplayDate(reading.date)}</td>
                <td className="px-4 py-3 text-slate-700">{SLOT_LABELS[reading.slot]}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{reading.value}</td>
                <td className="px-4 py-2">
                  <Actions reading={reading} onEdit={onEdit} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {items.map((reading) => (
          <li
            key={reading.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">
                {formatDisplayDate(reading.date)}
              </p>
              <p className="text-sm text-slate-600">{SLOT_LABELS[reading.slot]}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {reading.value}
                <span className="ml-1 text-sm font-normal text-slate-500">{GLUCOSE_UNIT}</span>
              </p>
            </div>
            <Actions reading={reading} onEdit={onEdit} onDelete={onDelete} />
          </li>
        ))}
      </ul>
    </>
  );
}
