'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { KeyRoundIcon, SettingsIcon, LogOutIcon, ArrowLeftIcon } from 'lucide-react';

interface SiteHeaderProps {
  onLogout?: () => void;
}

export function SiteHeader({ onLogout }: SiteHeaderProps) {
  const pathname = usePathname();
  const isSettingsPage = pathname === '/settings';

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-6xl flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {isSettingsPage ? (
            <>
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeftIcon />
                  <span className="sr-only">Back</span>
                </Button>
              </Link>
              <span className="font-semibold">Settings</span>
            </>
          ) : (
            <>
              <KeyRoundIcon className="size-5 text-primary" />
              <span className="font-semibold">KeyPulse</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isSettingsPage && (
            <Button variant="ghost" size="icon" asChild>
              <Link href="/settings">
                <SettingsIcon />
                <span className="sr-only">Settings</span>
              </Link>
            </Button>
          )}
          {onLogout && (
            <Button variant="ghost" onClick={onLogout}>
              <LogOutIcon data-icon="inline-start" />
              Logout
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
