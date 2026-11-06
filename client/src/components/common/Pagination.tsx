import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/** Previous / Next with "Page X of Y". Renders nothing when everything fits on one page. */
export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
      <Button variant="secondary" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        <ChevronLeft className="size-4" aria-hidden="true" />
        Previous
      </Button>
      <p className="text-sm text-slate-600">
        Page {page} of {totalPages}
      </p>
      <Button variant="secondary" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
        Next
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
    </nav>
  );
}
