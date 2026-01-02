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
  const { data: keys, pagination, isLoading, refetch, updateKeyLocally } = useKeys({
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
  const invalidCount = useMemo(() => keys.filter(k => k.status !== 'valid' && k.status !== 'pending').length, [keys]);

  // Real-time validation progress handler
  const handleValidationProgress = useCallback((result: {
    keyId: string;
    status: string;
    responseTime?: number;
    errorMessage?: string;
    lastValidatedAt: string;
  }) => {
    updateKeyLocally(result.keyId, {
      status: result.status,
      responseTime: result.responseTime ?? null,
      errorMessage: result.errorMessage ?? null,
      lastValidatedAt: result.lastValidatedAt,
    });
  }, [updateKeyLocally]);

  const handleValidate = useCallback(async (ids: string[]) => {
    const idsToValidate = ids.length > 0 ? ids : keys.map(k => k.id);
    if (idsToValidate.length === 0) return;

    // Mark keys as validating immediately
    idsToValidate.forEach(id => {
      updateKeyLocally(id, { status: 'validating' });
    });

    await validateKeys(idsToValidate, {
      onProgress: handleValidationProgress,
      onComplete: () => {
        refetch();
      },
    });
  }, [keys, validateKeys, updateKeyLocally, handleValidationProgress, refetch]);

  // Handlers
  const handleAddKey = useCallback(async (data: {
    key?: string;
    providerId: string;
  }) => {
    if (data.key) {
      try {
        const created = await addKeys([{
          key: data.key,
          providerId: data.providerId,
        }]);
        toast.success('Added successfully');
        await refetch();
        // Auto-validate the newly added key
        if (created && created.length > 0) {
          const newKeyIds = created.map((k: { id: string }) => k.id);
          handleValidate(newKeyIds);
        }
      } catch (error) {
        toast.error('Failed to add', { description: error instanceof Error ? error.message : 'Unknown error' });
        throw error;
      }
    }
  }, [addKeys, refetch, handleValidate]);

  const handleEditKey = useCallback(async (data: {
    key?: string;
    providerId: string;
  }) => {
    if (editingKey) {
      try {
        await updateKeys([editingKey.id], {
          providerId: data.providerId,
        });
        toast.success('Updated successfully');
        refetch();
      } catch (error) {
        toast.error('Failed to update', { description: error instanceof Error ? error.message : 'Unknown error' });
        throw error;
      }
    }
  }, [editingKey, updateKeys, refetch]);

  const handleBatchAdd = useCallback(async (keysToAdd: Array<{
    key: string;
    providerId: string;
  }>) => {
    try {
      const created = await addKeys(keysToAdd);
      toast.success(`Successfully added ${keysToAdd.length} keys`);
      await refetch();
      // Auto-validate the newly added keys
      if (created && created.length > 0) {
        const newKeyIds = created.map((k: { id: string }) => k.id);
        handleValidate(newKeyIds);
      }
    } catch (error) {
      toast.error('Batch add failed', { description: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }, [addKeys, refetch, handleValidate]);

  const handleBatchEdit = useCallback(async (updates: {
    providerId?: string;
  }) => {
    try {
      await updateKeys(selectedIds, updates);
      toast.success(`Successfully updated ${selectedIds.length} keys`);
      setSelectedIds([]);
      refetch();
    } catch (error) {
      toast.error('Batch update failed', { description: error instanceof Error ? error.message : 'Unknown error' });
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
      toast.success(`Successfully deleted ${pendingDeleteIds.length} keys`);
      setSelectedIds(prev => prev.filter(id => !pendingDeleteIds.includes(id)));
      refetch();
    } catch (error) {
      toast.error('Delete failed', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
    setPendingDeleteIds([]);
  }, [pendingDeleteIds, deleteKeys, refetch]);

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
                <span className="sr-only">Settings</span>
              </Link>
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOutIcon data-icon="inline-start" />
              Logout
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
              Add
            </Button>
            <Button variant="outline" onClick={() => setBatchAddDialogOpen(true)}>
              <ListPlusIcon data-icon="inline-start" />
              Batch Add
            </Button>

            <div className="h-4 w-px bg-border mx-1" />

            {/* Validate button */}
            {isValidating ? (
              <Button variant="destructive" onClick={stopValidation}>
                <SquareIcon data-icon="inline-start" />
                Stop
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => handleValidate(selectedIds)}
                disabled={keys.length === 0}
              >
                <PlayIcon data-icon="inline-start" />
                {selectedIds.length > 0 ? `Validate (${selectedIds.length})` : 'Validate All'}
              </Button>
            )}

            {/* Selection actions */}
            {selectedIds.length > 0 && (
              <>
                <Button variant="outline" onClick={() => setBatchEditDialogOpen(true)}>
                  <PencilIcon data-icon="inline-start" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteRequest(selectedIds)}
                >
                  <TrashIcon data-icon="inline-start" />
                  Delete
                </Button>
              </>
            )}

            <div className="flex-1" />

            {/* Filter & Search */}
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="invalid">Invalid</SelectItem>
                <SelectItem value="rate_limited">Rate Limited</SelectItem>
                <SelectItem value="timeout">Timeout</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search..."
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
              <span className="sr-only">Export</span>
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
        totalCount={pagination.total}
        validCount={validCount}
        invalidCount={invalidCount}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Confirm Delete"
        description={`Are you sure you want to delete ${pendingDeleteIds.length} keys? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
