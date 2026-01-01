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
import { ProxyDialog } from './proxy-dialog';
import { useProxies, useDeleteProxies } from '@/hooks/use-proxies';
import { PlusIcon, MoreHorizontalIcon, PencilIcon, TrashIcon, StarIcon, LockIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Proxy } from '@/db/schema';

interface ProxyWithCount extends Proxy {
  keyCount: number;
}

export function ProxiesPanel() {
  const { data: proxies, isLoading, refetch } = useProxies();
  const { deleteProxies } = useDeleteProxies();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProxy, setEditProxy] = useState<ProxyWithCount | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProxyWithCount | null>(null);

  const handleAdd = () => {
    setEditProxy(null);
    setDialogOpen(true);
  };

  const handleEdit = (proxy: ProxyWithCount) => {
    setEditProxy(proxy);
    setDialogOpen(true);
  };

  const handleDeleteClick = (proxy: ProxyWithCount) => {
    setDeleteTarget(proxy);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      await deleteProxies([deleteTarget.id]);
      toast.success('Proxy 已删除');
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
                <TableHead>类型</TableHead>
                <TableHead>地址</TableHead>
                <TableHead className="text-center">认证</TableHead>
                <TableHead className="text-center">Keys</TableHead>
                <TableHead className="text-center">默认</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : proxies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    暂无 Proxy，点击"添加"按钮添加
                  </TableCell>
                </TableRow>
              ) : (
                proxies.map((proxy) => (
                  <TableRow key={proxy.id}>
                    <TableCell className="font-medium">
                      {proxy.name}
                      {proxy.description && (
                        <div className="text-muted-foreground font-normal truncate max-w-[200px]">
                          {proxy.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{proxy.type.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {proxy.host}:{proxy.port}
                    </TableCell>
                    <TableCell className="text-center">
                      {proxy.username && (
                        <LockIcon className="size-4 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {proxy.keyCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {proxy.isDefault && (
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
                          <DropdownMenuItem onClick={() => handleEdit(proxy)}>
                            <PencilIcon />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDeleteClick(proxy)}
                            disabled={proxy.keyCount > 0}
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

      {/* Proxy Dialog */}
      <ProxyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editProxy={editProxy}
        onSuccess={handleDialogSuccess}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="删除 Proxy"
        description={`确定要删除 "${deleteTarget?.name}" 吗？此操作不可恢复。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
