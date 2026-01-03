'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useProviders } from '@/hooks/use-providers';
import {
  Loader2Icon,
  UploadIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  AlertTriangleIcon,
  CheckIcon,
  XIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PreviewChange, PreviewError, PushResult } from '@/types/bifrost';

type Step = 'select' | 'preview' | 'result';

interface PushSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PushSyncDialog({ open, onOpenChange }: PushSyncDialogProps) {
  const { data: providers } = useProviders();
  const [step, setStep] = useState<Step>('select');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    changes: PreviewChange[];
    errors: PreviewError[];
  } | null>(null);
  const [pushResult, setPushResult] = useState<{
    results: PushResult[];
    errors: PreviewError[];
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('select');
      setSelectedIds(new Set());
      setPreviewData(null);
      setPushResult(null);
    }
  }, [open]);

  const toggleProvider = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === providers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(providers.map((p) => p.id)));
    }
  };

  const handleNext = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerIds: Array.from(selectedIds),
          mode: 'preview',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Preview failed');
      setPreviewData(data);
      setStep('preview');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushClick = () => {
    setConfirmOpen(true);
  };

  const handlePushConfirm = async () => {
    // Only push providers that have changes
    const changedProviderIds = (previewData?.changes ?? [])
      .filter((c) => c.action !== 'no_change')
      .map((c) => c.providerId);

    if (changedProviderIds.length === 0) {
      toast.info('No changes to push');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerIds: changedProviderIds,
          mode: 'push',
          confirmed: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Push failed');
      setPushResult(data);
      setStep('result');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Push failed');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSelectStep = () => (
    <>
      <DialogHeader>
        <DialogTitle>Push to Bifrost</DialogTitle>
        <DialogDescription>
          Select providers to push. Each provider will be synced with all its keys.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedIds.size === providers.length && providers.length > 0}
                  onCheckedChange={toggleAll}
                  disabled={providers.length === 0}
                />
              </TableHead>
              <TableHead>Provider</TableHead>
              <TableHead className="text-right">Keys</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No providers available
                </TableCell>
              </TableRow>
            ) : (
              providers.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(provider.id)}
                      onCheckedChange={() => toggleProvider(provider.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{provider.name}</TableCell>
                  <TableCell className="text-right">{provider.keyCount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DialogFooter className="mt-6">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleNext} disabled={selectedIds.size === 0 || isLoading}>
          {isLoading ? (
            <>
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
              Loading...
            </>
          ) : (
            <>
              Next
              <ChevronRightIcon data-icon="inline-end" />
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );

  const renderPreviewStep = () => {
    const allChanges = previewData?.changes ?? [];
    const errors = previewData?.errors ?? [];

    const newCount = allChanges.filter((c) => c.action === 'create').length;
    const updateCount = allChanges.filter((c) => c.action === 'update').length;
    const noChangeCount = allChanges.filter((c) => c.action === 'no_change').length;
    const pushableCount = newCount + updateCount;

    const formatKeysAdd = (change: PreviewChange) => {
      const { add } = change.keysChange;
      if (change.action === 'create') return `+${add}`;
      return add > 0 ? `+${add}` : '-';
    };

    const formatKeysUpdate = (change: PreviewChange) => {
      const { update } = change.keysChange;
      return update > 0 ? `~${update}` : '-';
    };

    const formatKeysDelete = (change: PreviewChange) => {
      const { delete: del } = change.keysChange;
      return del > 0 ? `-${del}` : '-';
    };

    const formatConfigChanges = (change: PreviewChange) => {
      if (change.configChanges.length === 0) return '-';
      return change.configChanges.map((c) => c.field).join(', ');
    };

    const getActionBadge = (action: PreviewChange['action']) => {
      switch (action) {
        case 'create':
          return <Badge variant="default">New</Badge>;
        case 'update':
          return <Badge variant="secondary">Update</Badge>;
        case 'no_change':
          return <Badge variant="outline">Skipped</Badge>;
      }
    };

    return (
      <>
        <DialogHeader>
          <DialogTitle>Review Changes</DialogTitle>
          <DialogDescription>
            {pushableCount > 0 ? (
              <>
                {newCount > 0 && `${newCount} new`}
                {newCount > 0 && updateCount > 0 && ', '}
                {updateCount > 0 && `${updateCount} update`}
                {noChangeCount > 0 && `, ${noChangeCount} skipped`}
              </>
            ) : (
              'No changes detected'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead className="text-center">Action</TableHead>
                <TableHead className="text-center w-14">Add</TableHead>
                <TableHead className="text-center w-14">Update</TableHead>
                <TableHead className="text-center w-14">Delete</TableHead>
                <TableHead>Config Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allChanges.map((change) => (
                <TableRow
                  key={change.providerId}
                  className={change.action === 'no_change' ? 'text-muted-foreground' : ''}
                >
                  <TableCell className="font-medium">{change.providerName}</TableCell>
                  <TableCell className="text-center">{getActionBadge(change.action)}</TableCell>
                  <TableCell className="text-center text-green-600">
                    {formatKeysAdd(change)}
                  </TableCell>
                  <TableCell className="text-center text-amber-600">
                    {formatKeysUpdate(change)}
                  </TableCell>
                  <TableCell className="text-center text-red-600">
                    {formatKeysDelete(change)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatConfigChanges(change)}
                  </TableCell>
                </TableRow>
              ))}
              {errors.map((err) => (
                <TableRow key={err.providerId} className="text-destructive">
                  <TableCell>{err.providerName || 'Unknown'}</TableCell>
                  <TableCell colSpan={5}>
                    <div className="flex items-center gap-1">
                      <AlertTriangleIcon className="size-3" />
                      {err.error}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {pushableCount > 0 && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm flex items-center gap-2">
            <AlertTriangleIcon className="size-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">
              This will overwrite existing configurations in Bifrost.
            </span>
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setStep('select')}>
            <ChevronLeftIcon data-icon="inline-start" />
            Back
          </Button>
          <Button onClick={handlePushClick} disabled={pushableCount === 0 || isLoading}>
            {isLoading ? (
              <>
                <Loader2Icon data-icon="inline-start" className="animate-spin" />
                Pushing...
              </>
            ) : (
              <>
                <UploadIcon data-icon="inline-start" />
                Push {pushableCount}
              </>
            )}
          </Button>
        </DialogFooter>
      </>
    );
  };

  const renderResultStep = () => {
    const results = pushResult?.results ?? [];
    const errors = pushResult?.errors ?? [];
    const success = errors.length === 0;

    return (
      <>
        <DialogHeader>
          <DialogTitle>{success ? 'Push Complete' : 'Push Completed with Errors'}</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-center">Action</TableHead>
                <TableHead className="text-right">Keys</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => (
                <TableRow key={r.providerId}>
                  <TableCell>
                    <CheckIcon className="size-4 text-green-600" />
                  </TableCell>
                  <TableCell className="font-medium">{r.providerName}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{r.action}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{r.keysCount}</TableCell>
                </TableRow>
              ))}
              {errors.map((err, i) => (
                <TableRow key={i} className="text-destructive">
                  <TableCell>
                    <XIcon className="size-4" />
                  </TableCell>
                  <TableCell>{err.providerName || 'Unknown'}</TableCell>
                  <TableCell colSpan={2}>{err.error}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="mt-6">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          {step === 'select' && renderSelectStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'result' && renderResultStep()}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm Push"
        description={`Push ${(previewData?.changes ?? []).filter((c) => c.action !== 'no_change').length} provider(s) to Bifrost? This will overwrite existing configurations.`}
        confirmText="Push"
        variant="destructive"
        onConfirm={handlePushConfirm}
      />
    </>
  );
}
