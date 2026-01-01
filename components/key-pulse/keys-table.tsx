'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { STATUS_CONFIG, type KeyStatus } from '@/lib/constants';
import type { ApiKeyWithRelations } from '@/hooks/use-keys';

interface KeysTableProps {
  keys: ApiKeyWithRelations[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onEdit: (key: ApiKeyWithRelations) => void;
  onDelete: (ids: string[]) => void;
  onValidate: (ids: string[]) => void;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function KeysTable({
  keys,
  selectedIds,
  onSelectionChange,
  onEdit,
  onDelete,
  onValidate,
  page,
  totalPages,
  total,
  onPageChange,
  isLoading,
}: KeysTableProps) {
  const allSelected = keys.length > 0 && keys.every(k => selectedIds.includes(k.id));
  const someSelected = keys.some(k => selectedIds.includes(k.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(keys.map(k => k.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="min-w-[180px]">Key</TableHead>
              <TableHead className="min-w-[120px]">Provider</TableHead>
              <TableHead className="min-w-[100px]">Model</TableHead>
              <TableHead className="min-w-[80px]">Proxy</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[120px]">Validated At</TableHead>
              <TableHead className="w-[80px]">Time</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No data yet. Click &quot;Add&quot; to add API Keys.
                </TableCell>
              </TableRow>
            ) : (
              keys.map((key) => {
                const statusConfig = STATUS_CONFIG[key.status as KeyStatus] || STATUS_CONFIG.pending;
                return (
                  <TableRow key={key.id} className={selectedIds.includes(key.id) ? 'bg-muted/50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(key.id)}
                        onCheckedChange={() => toggleSelect(key.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono">{key.maskedKey}</TableCell>
                    <TableCell>
                      {key.provider ? key.provider.name : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {key.provider ? key.provider.model : '-'}
                    </TableCell>
                    <TableCell>
                      {key.proxy ? (
                        <Badge variant="outline">{key.proxy.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant} className={statusConfig.className}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(key.lastValidatedAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {key.responseTime ? `${key.responseTime}ms` : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontalIcon />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onValidate([key.id])}>
                            <PlayIcon />
                            Validate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(key)}>
                            <PencilIcon />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onDelete([key.id])}
                          >
                            <TrashIcon />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {total} records
          {selectedIds.length > 0 && ` · ${selectedIds.length} selected`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeftIcon />
            <span className="sr-only">Previous page</span>
          </Button>
          <span className="text-muted-foreground min-w-[60px] text-center">
            {page} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRightIcon />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
