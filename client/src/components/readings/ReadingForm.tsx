import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { GLUCOSE_MAX, GLUCOSE_MIN, GLUCOSE_UNIT } from '../../constants/glucose';
import { SLOT_LABELS, SLOT_ORDER } from '../../constants/slots';
import { readingFormSchema, type ReadingFormValues } from '../../schemas/reading.schemas';
import { createReading, updateReading } from '../../services/readings.service';
import type { Reading } from '../../types/reading';
import { getApiError } from '../../utils/apiError';
import { toLocalDateString } from '../../utils/date';
import { applyServerErrors } from '../../utils/formErrors';
import { Alert } from '../common/Alert';
import { Button } from '../common/Button';
import { SelectField } from '../common/SelectField';
import { TextField } from '../common/TextField';

interface ReadingFormProps {
  /** Pass the reading to edit it; leave out to add a new one. */
  initial?: Reading;
  /** Called after the reading was saved. */
  onDone: () => void;
  onCancel: () => void;
}

export function ReadingForm({ initial, onDone, onCancel }: ReadingFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const today = toLocalDateString(new Date());

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReadingFormValues>({
    resolver: zodResolver(readingFormSchema),
    // No slot / value defaults for a new reading: the <select> starts on its placeholder and
    // the number field starts empty.
    defaultValues: initial
      ? { date: initial.date, slot: initial.slot, value: initial.value }
      : { date: today },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (initial) {
        await updateReading(initial.id, values);
      } else {
        await createReading(values);
      }
      onDone();
    } catch (error) {
      const { message, fieldErrors } = getApiError(error);
      // Field errors go next to their field; rules like "one reading per slot per day" and
      // "4 readings per day" come back as a plain message and are shown above the form.
      if (!applyServerErrors(setError, fieldErrors, ['date', 'slot', 'value'])) {
        setFormError(message);
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <Alert>{formError}</Alert>}

      <TextField
        label="Date"
        type="date"
        max={today}
        error={errors.date?.message}
        {...register('date')}
      />
      <SelectField label="Time of day" error={errors.slot?.message} {...register('slot')}>
        <option value="">Choose a reading time</option>
        {SLOT_ORDER.map((slot) => (
          <option key={slot} value={slot}>
            {SLOT_LABELS[slot]}
          </option>
        ))}
      </SelectField>
      <TextField
        label={`Glucose value (${GLUCOSE_UNIT})`}
        type="number"
        inputMode="numeric"
        step={1}
        min={GLUCOSE_MIN}
        max={GLUCOSE_MAX}
        error={errors.value?.message}
        // valueAsNumber turns the text into a number; an empty field becomes NaN, which the
        // schema reports as "Please enter a glucose value."
        {...register('value', { valueAsNumber: true })}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {initial ? 'Save changes' : 'Save reading'}
        </Button>
      </div>
    </form>
  );
}
