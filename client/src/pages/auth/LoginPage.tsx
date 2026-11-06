import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import { Alert } from '../../components/common/Alert';
import { Button } from '../../components/common/Button';
import { PasswordField } from '../../components/common/PasswordField';
import { TextField } from '../../components/common/TextField';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import { loginSchema, type LoginFormValues } from '../../schemas/auth.schemas';
import { getApiError } from '../../utils/apiError';
import { applyServerErrors } from '../../utils/formErrors';

/** The router passes a message here when a session expired (see AuthProvider). */
function getNoticeMessage(state: unknown): string | null {
  if (typeof state === 'object' && state !== null && 'message' in state) {
    return typeof state.message === 'string' ? state.message : null;
  }
  return null;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const notice = getNoticeMessage(location.state);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      void navigate('/dashboard', { replace: true });
    } catch (error) {
      const { message, fieldErrors } = getApiError(error);
      if (!applyServerErrors(setError, fieldErrors, ['email', 'password'])) {
        setFormError(message);
      }
    }
  });

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to see your glucose readings."
      footer={
        <>
          New to Sweety?{' '}
          <Link to="/register" className="font-medium text-emerald-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {notice && <Alert tone="info">{notice}</Alert>}
        {formError && <Alert>{formError}</Alert>}

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
