'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button, Input, Alert } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { apiError } from '@/lib/api';

interface Fields {
  name?: string;
  email: string;
  password: string;
}

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const { login, register: registerUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Fields>();

  const onSubmit = async (values: Fields) => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') await login(values.email, values.password);
      else await registerUser(values.email, values.password, values.name);
      router.push('/dashboard');
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-accent text-lg font-bold text-white">
            M
          </div>
          <h1 className="text-xl font-semibold text-primary">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            Real-time market intelligence for investors
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3 rounded-xl border border-border bg-panel p-5"
        >
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-[12px] text-secondary">Name</label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => <Input placeholder="Jane Investor" {...field} />}
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-[12px] text-secondary">Email</label>
            <Controller
              name="email"
              control={control}
              rules={{ required: 'Email is required' }}
              render={({ field }) => (
                <Input
                  type="email"
                  placeholder="you@example.com"
                  status={errors.email ? 'error' : ''}
                  {...field}
                />
              )}
            />
            {errors.email && <p className="mt-1 text-[11px] text-down">{errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-[12px] text-secondary">Password</label>
            <Controller
              name="password"
              control={control}
              rules={{
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
              }}
              render={({ field }) => (
                <Input.Password
                  placeholder="••••••••"
                  status={errors.password ? 'error' : ''}
                  {...field}
                />
              )}
            />
            {errors.password && (
              <p className="mt-1 text-[11px] text-down">{errors.password.message}</p>
            )}
          </div>

          {error && <Alert type="error" showIcon message={error} />}

          <Button type="primary" htmlType="submit" block loading={loading}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>

          <p className="pt-1 text-center text-[12px] text-muted">
            {mode === 'login' ? (
              <>
                No account?{' '}
                <Link href="/register" className="text-accent">
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already registered?{' '}
                <Link href="/login" className="text-accent">
                  Sign in
                </Link>
              </>
            )}
          </p>
          <p className="text-center text-[12px] text-faint">
            <Link href="/dashboard" className="hover:text-secondary">
              Continue as guest →
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
