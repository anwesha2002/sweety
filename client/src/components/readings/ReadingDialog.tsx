import { useEffect, useId, useRef } from 'react';
import type { Reading } from '../../types/reading';
import { ReadingForm } from './ReadingForm';

interface ReadingDialogProps {
  open: boolean;
  /** Pass the reading to edit it; leave out to add a new one. */
  reading?: Reading;
  onClose: () => void;
  /** Called after a reading was saved, so the page can reload its data. */
  onSaved?: () => void;
}

/**
 * The add/edit form in a native <dialog>: the browser traps focus inside it and closes it
 * with Escape. The form is only rendered while the dialog is open, so it starts fresh
 * (empty, or with the reading's values) every time.
 */
export function ReadingDialog({ open, reading, onClose, onSaved }: ReadingDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Fires for Escape and for dialog.close(), so the parent's state always follows.
      onClose={onClose}
      // Clicks on the dimmed backdrop land on the <dialog> element itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-full max-w-md rounded-2xl border border-slate-200 p-0 shadow-lg backdrop:bg-slate-900/40"
    >
      {open && (
        <div className="p-6">
          <h2 id={titleId} className="mb-4 text-lg font-semibold text-slate-900">
            {reading ? 'Edit reading' : 'Add reading'}
          </h2>
          <ReadingForm
            initial={reading}
            onDone={() => {
              onSaved?.();
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      )}
    </dialog>
  );
}
