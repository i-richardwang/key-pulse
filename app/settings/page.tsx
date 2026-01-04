'use client';

import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProvidersPanel } from '@/components/settings/providers-panel';
import { ProxiesPanel } from '@/components/settings/proxies-panel';
import { SchedulesPanel } from '@/components/settings/schedules-panel';
import { BifrostPanel } from '@/components/settings/bifrost-panel';
import { SiteLayout } from '@/components/layout';
import { ServerIcon, GlobeIcon, ClockIcon, RefreshCwIcon } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <SiteLayout onLogout={handleLogout}>
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
          <TabsTrigger value="schedules" className="gap-1.5">
            <ClockIcon className="size-3.5" />
            Schedules
          </TabsTrigger>
          <TabsTrigger value="bifrost" className="gap-1.5">
            <RefreshCwIcon className="size-3.5" />
            Bifrost
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="mt-4">
          <ProvidersPanel />
        </TabsContent>

        <TabsContent value="proxies" className="mt-4">
          <ProxiesPanel />
        </TabsContent>

        <TabsContent value="schedules" className="mt-4">
          <SchedulesPanel />
        </TabsContent>

        <TabsContent value="bifrost" className="mt-4">
          <BifrostPanel />
        </TabsContent>
      </Tabs>
    </SiteLayout>
  );
}
