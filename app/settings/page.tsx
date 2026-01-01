'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProvidersPanel } from '@/components/settings/providers-panel';
import { ProxiesPanel } from '@/components/settings/proxies-panel';
import { ArrowLeftIcon, ServerIcon, GlobeIcon } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeftIcon />
                <span className="sr-only">返回</span>
              </Button>
            </Link>
            <span className="font-semibold">设置</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4">
        <div className="mx-auto max-w-6xl space-y-4">
          <Tabs defaultValue="providers">
            <TabsList>
              <TabsTrigger value="providers" className="gap-1.5">
                <ServerIcon className="size-3.5" />
                Providers
              </TabsTrigger>
              <TabsTrigger value="proxies" className="gap-1.5">
                <GlobeIcon className="size-3.5" />
                Proxies
              </TabsTrigger>
            </TabsList>

            <TabsContent value="providers" className="mt-4">
              <ProvidersPanel />
            </TabsContent>

            <TabsContent value="proxies" className="mt-4">
              <ProxiesPanel />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
