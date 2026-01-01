'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ProviderDialog } from './provider-dialog';
import { useProviders, useDeleteProviders } from '@/hooks/use-providers';
import { PlusIcon, MoreHorizontalIcon, PencilIcon, TrashIcon, StarIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Provider } from '@/db/schema';

interface ProviderWithCount extends Provider {
  keyCount: number;
}

export function ProvidersPanel() {
  const { data: providers, isLoading, refetch } = useProviders();
  const { deleteProviders } = useDeleteProviders();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<ProviderWithCount | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProviderWithCount | null>(null);

  const handleAdd = () => {
    setEditProvider(null);
    setDialogOpen(true);
  };

  const handleEdit = (provider: ProviderWithCount) => {
    setEditProvider(provider);
    setDialogOpen(true);
  };

  const handleDeleteClick = (provider: ProviderWithCount) => {
    setDeleteTarget(provider);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      await deleteProviders([deleteTarget.id]);
      toast.success('Provider 已删除');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    refetch();
  };

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleAdd}>
            <PlusIcon data-icon="inline-start" />
            添加
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-center">Keys</TableHead>
                <TableHead className="text-center">默认</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : providers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    暂无 Provider，点击"添加"按钮添加
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
                    <TableCell className="font-mono text-muted-foreground">
                      {provider.baseUrl.replace(/^https?:\/\//, '')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{provider.model}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {provider.keyCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {provider.isDefault && (
                        <StarIcon className="size-4 text-yellow-500 mx-auto fill-yellow-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontalIcon />
                            <span className="sr-only">操作</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(provider)}>
                            <PencilIcon />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDeleteClick(provider)}
                            disabled={provider.keyCount > 0}
                          >
                            <TrashIcon />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Provider Dialog */}
      <ProviderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editProvider={editProvider}
        onSuccess={handleDialogSuccess}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="删除 Provider"
        description={`确定要删除 "${deleteTarget?.name}" 吗？此操作不可恢复。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
