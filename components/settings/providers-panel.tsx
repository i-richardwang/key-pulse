'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useProviders } from '@/hooks/use-providers';
import { StarIcon } from 'lucide-react';

export function ProvidersPanel() {
  const { data: providers, isLoading } = useProviders();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Base URL</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Proxy</TableHead>
            <TableHead className="text-center">Keys</TableHead>
            <TableHead className="text-center">Default</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                Loading...
              </TableCell>
            </TableRow>
          ) : providers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No providers. Sync from Bifrost to import providers.
              </TableCell>
            </TableRow>
          ) : (
            providers.map((provider) => (
              <TableRow key={provider.id}>
                <TableCell className="font-medium">
                  {provider.name}
                  {provider.description && (
                    <div className="text-muted-foreground font-normal truncate max-w-[200px]">
                      {provider.description}
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-mono text-muted-foreground text-xs">
                  {provider.baseUrl.replace(/^https?:\/\//, '')}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{provider.model}</Badge>
                </TableCell>
                <TableCell>
                  {provider.proxy ? (
                    <Badge variant="outline" className="font-mono text-xs">
                      {provider.proxy.host}:{provider.proxy.port}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">None</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {provider.keyCount}
                </TableCell>
                <TableCell className="text-center">
                  {provider.isDefault && (
                    <StarIcon className="size-4 text-yellow-500 mx-auto fill-yellow-500" />
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
