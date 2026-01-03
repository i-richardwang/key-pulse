'use client';

import { SiteHeader } from './site-header';
import { SiteFooter } from './site-footer';

interface SiteLayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

export function SiteLayout({ children, onLogout }: SiteLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader onLogout={onLogout} />
      <main className="flex-1 py-4">
        <div className="mx-auto max-w-6xl px-4">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
