'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { KeyRoundIcon, LogInIcon } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || '密码错误');
      }
    } catch {
      setError('登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <KeyRoundIcon className="size-10 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">KeyPulse</h1>
          <p className="text-sm text-muted-foreground">API Key 批量验证工具</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="password">访问密码</FieldLabel>
            <Input
              id="password"
              type="password"
              placeholder="请输入访问密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>

          <Button type="submit" className="w-full" disabled={isLoading || !password}>
            <LogInIcon data-icon="inline-start" />
            {isLoading ? '登录中...' : '登录'}
          </Button>
        </form>
      </div>
    </div>
  );
}
