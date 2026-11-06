import { useEffect, useId, useRef } from 'react';
import { Alert } from './Alert';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** Shows a spinner on the confirm button while the action runs. */
  isLoading?: boolean;
  /** Shown above the buttons when the action failed. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A native <dialog> asking "are you sure?". Escape and a click on the backdrop cancel. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  isLoading = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
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
      onClose={onCancel}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      className="m-auto w-full max-w-md rounded-2xl border border-slate-200 p-0 shadow-lg backdrop:bg-slate-900/40"
    >
      {open && (
        <div className="space-y-4 p-6">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <p className="text-sm text-slate-600">{message}</p>
          {error && <Alert>{error}</Alert>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
