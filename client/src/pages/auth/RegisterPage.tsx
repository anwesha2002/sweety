import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { Alert } from '../../components/common/Alert';
import { Button } from '../../components/common/Button';
import { PasswordField } from '../../components/common/PasswordField';
import { TextField } from '../../components/common/TextField';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import { registerSchema, type RegisterFormValues } from '../../schemas/auth.schemas';
import { getApiError } from '../../utils/apiError';
import { applyServerErrors } from '../../utils/formErrors';

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    setFormError(null);
    try {
      // The server logs the new user in automatically (sets the cookie).
      await registerUser({ name, email, password });
      void navigate('/dashboard', { replace: true });
    } catch (error) {
      const { message, fieldErrors } = getApiError(error);
      if (!applyServerErrors(setError, fieldErrors, ['name', 'email', 'password'])) {
        setFormError(message);
      }
    }
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking your blood glucose in a few seconds."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-emerald-700 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}

        <TextField
          label="Name"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
