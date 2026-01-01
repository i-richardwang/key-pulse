'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { KeysTable } from './keys-table';
import { KeyDialog } from './key-dialog';
import { BatchAddDialog } from './batch-add-dialog';
import { BatchEditDialog } from './batch-edit-dialog';
import { ExportDialog } from './export-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  useKeys,
  useAddKeys,
  useUpdateKeys,
  useDeleteKeys,
  useValidateKeys,
  type ApiKeyWithRelations,
} from '@/hooks/use-keys';
import {
  KeyRoundIcon,
  PlusIcon,
  ListPlusIcon,
  PlayIcon,
  SquareIcon,
  PencilIcon,
  TrashIcon,
  DownloadIcon,
  LogOutIcon,
  SearchIcon,
  SettingsIcon,
} from 'lucide-react';

export function KeyPulseApp() {
  const router = useRouter();

  // Query state
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch keys
  const { data: keys, pagination, isLoading, refetch } = useKeys({
    page,
    limit: 50,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchQuery || undefined,
  });

  // Mutations
  const { addKeys } = useAddKeys();
  const { updateKeys } = useUpdateKeys();
  const { deleteKeys } = useDeleteKeys();
  const { validateKeys, stopValidation, isValidating, progress, total } = useValidateKeys();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog state
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [batchAddDialogOpen, setBatchAddDialogOpen] = useState(false);
  const [batchEditDialogOpen, setBatchEditDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKeyWithRelations | null>(null);

  // Delete confirmation dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  // Computed values
  const validCount = useMemo(() => keys.filter(k => k.status === 'valid').length, [keys]);
  const invalidCount = useMemo(() => keys.filter(k => k.status === 'invalid').length, [keys]);

  // Handlers
  const handleAddKey = useCallback(async (data: {
    key?: string;
    providerId: string;
    proxyId?: string | null;
  }) => {
    if (data.key) {
      try {
        await addKeys([{
          key: data.key,
          providerId: data.providerId,
          proxyId: data.proxyId,
        }]);
        toast.success('添加成功');
        refetch();
      } catch (error) {
        toast.error('添加失败', { description: error instanceof Error ? error.message : '未知错误' });
        throw error;
      }
    }
  }, [addKeys, refetch]);

  const handleEditKey = useCallback(async (data: {
    key?: string;
    providerId: string;
    proxyId?: string | null;
  }) => {
    if (editingKey) {
      try {
        await updateKeys([editingKey.id], {
          providerId: data.providerId,
          proxyId: data.proxyId,
        });
        toast.success('更新成功');
        refetch();
      } catch (error) {
        toast.error('更新失败', { description: error instanceof Error ? error.message : '未知错误' });
        throw error;
      }
    }
  }, [editingKey, updateKeys, refetch]);

  const handleBatchAdd = useCallback(async (keysToAdd: Array<{
    key: string;
    providerId: string;
    proxyId?: string | null;
  }>) => {
    try {
      await addKeys(keysToAdd);
      toast.success(`成功添加 ${keysToAdd.length} 个 Key`);
      refetch();
    } catch (error) {
      toast.error('批量添加失败', { description: error instanceof Error ? error.message : '未知错误' });
      throw error;
    }
  }, [addKeys, refetch]);

  const handleBatchEdit = useCallback(async (updates: {
    providerId?: string;
    proxyId?: string | null;
  }) => {
    try {
      await updateKeys(selectedIds, updates);
      toast.success(`成功更新 ${selectedIds.length} 个 Key`);
      setSelectedIds([]);
      refetch();
    } catch (error) {
      toast.error('批量更新失败', { description: error instanceof Error ? error.message : '未知错误' });
      throw error;
    }
  }, [selectedIds, updateKeys, refetch]);

  const handleDeleteRequest = useCallback((ids: string[]) => {
    setPendingDeleteIds(ids);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    try {
      await deleteKeys(pendingDeleteIds);
      toast.success(`成功删除 ${pendingDeleteIds.length} 个 Key`);
      setSelectedIds(prev => prev.filter(id => !pendingDeleteIds.includes(id)));
      refetch();
    } catch (error) {
      toast.error('删除失败', { description: error instanceof Error ? error.message : '未知错误' });
    }
    setPendingDeleteIds([]);
  }, [pendingDeleteIds, deleteKeys, refetch]);

  const handleValidate = useCallback(async (ids: string[]) => {
    const idsToValidate = ids.length > 0 ? ids : keys.map(k => k.id);
    if (idsToValidate.length === 0) return;

    await validateKeys(idsToValidate, () => {
      refetch();
    });
  }, [keys, validateKeys, refetch]);

  const handleEdit = useCallback((key: ApiKeyWithRelations) => {
    setEditingKey(key);
    setKeyDialogOpen(true);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <KeyRoundIcon className="size-5 text-primary" />
            <span className="font-semibold">KeyPulse</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/settings">
                <SettingsIcon />
                <span className="sr-only">设置</span>
              </Link>
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOutIcon data-icon="inline-start" />
              登出
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4">
        <div className="mx-auto max-w-6xl space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Add buttons */}
            <Button onClick={() => { setEditingKey(null); setKeyDialogOpen(true); }}>
              <PlusIcon data-icon="inline-start" />
              添加
            </Button>
            <Button variant="outline" onClick={() => setBatchAddDialogOpen(true)}>
              <ListPlusIcon data-icon="inline-start" />
              批量添加
            </Button>

            <div className="h-4 w-px bg-border mx-1" />

            {/* Validate button */}
            {isValidating ? (
              <Button variant="destructive" onClick={stopValidation}>
                <SquareIcon data-icon="inline-start" />
                停止
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => handleValidate(selectedIds)}
                disabled={keys.length === 0}
              >
                <PlayIcon data-icon="inline-start" />
                {selectedIds.length > 0 ? `验证 (${selectedIds.length})` : '全部验证'}
              </Button>
            )}

            {/* Selection actions */}
            {selectedIds.length > 0 && (
              <>
                <Button variant="outline" onClick={() => setBatchEditDialogOpen(true)}>
                  <PencilIcon data-icon="inline-start" />
                  编辑
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteRequest(selectedIds)}
                >
                  <TrashIcon data-icon="inline-start" />
                  删除
                </Button>
              </>
            )}

            <div className="flex-1" />

            {/* Filter & Search */}
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="pending">待验证</SelectItem>
                <SelectItem value="valid">有效</SelectItem>
                <SelectItem value="invalid">无效</SelectItem>
                <SelectItem value="rate_limited">限流</SelectItem>
                <SelectItem value="timeout">超时</SelectItem>
                <SelectItem value="error">错误</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-[160px] pl-7"
              />
            </div>

            <Button
              size="icon"
              variant="outline"
              onClick={() => setExportDialogOpen(true)}
              disabled={keys.length === 0}
            >
              <DownloadIcon />
              <span className="sr-only">导出</span>
            </Button>
          </div>

          {/* Validation Progress */}
          {isValidating && (
            <div className="flex items-center gap-3">
              <Progress value={total > 0 ? (progress / total) * 100 : 0} className="flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {progress} / {total}
              </span>
            </div>
          )}

          {/* Table */}
          <KeysTable
            keys={keys}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            onValidate={handleValidate}
            page={page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={setPage}
            isLoading={isLoading}
          />
        </div>
      </main>

      {/* Dialogs */}
      <KeyDialog
        open={keyDialogOpen}
        onOpenChange={setKeyDialogOpen}
        editKey={editingKey}
        onSave={editingKey ? handleEditKey : handleAddKey}
      />

      <BatchAddDialog
        open={batchAddDialogOpen}
        onOpenChange={setBatchAddDialogOpen}
        onSave={handleBatchAdd}
      />

      <BatchEditDialog
        open={batchEditDialogOpen}
        onOpenChange={setBatchEditDialogOpen}
        selectedCount={selectedIds.length}
        onSave={handleBatchEdit}
      />

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        results={keys.map(k => ({
          key: k.key,
          maskedKey: k.maskedKey,
          status: k.status as 'valid' | 'invalid' | 'pending' | 'validating' | 'rate_limited' | 'timeout' | 'error',
          responseTime: k.responseTime || undefined,
          errorMessage: k.errorMessage || undefined,
          timestamp: k.lastValidatedAt ? new Date(k.lastValidatedAt).getTime() : Date.now(),
        }))}
        validCount={validCount}
        invalidCount={invalidCount}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="确认删除"
        description={`确定要删除 ${pendingDeleteIds.length} 个 Key 吗？此操作不可撤销。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
