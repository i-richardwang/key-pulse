'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import type { ExportOptions } from '@/types';
import { DownloadIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalCount: number;
  validCount: number;
  invalidCount: number;
}

export function ExportDialog({
  open,
  onOpenChange,
  totalCount,
  validCount,
  invalidCount,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportOptions['format']>('txt');
  const [content, setContent] = useState<ExportOptions['content']>('valid');
  const [includeDetails, setIncludeDetails] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const response = await fetch('/api/keys/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, content, includeDetails }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Get filename from Content-Disposition header
      const disposition = response.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `keypulse-export.${format}`;

      // Download file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Export completed');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const getExportCount = () => {
    switch (content) {
      case 'valid':
        return validCount;
      case 'invalid':
        return invalidCount;
      default:
        return totalCount;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Keys</DialogTitle>
          <DialogDescription>Export API keys to a file</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="export-format">Format</FieldLabel>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportOptions['format'])}>
              <SelectTrigger id="export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="txt">TXT (Plain Text)</SelectItem>
                <SelectItem value="csv">CSV (Table)</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="export-content">Content</FieldLabel>
            <Select value={content} onValueChange={(v) => setContent(v as ExportOptions['content'])}>
              <SelectTrigger id="export-content">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="valid">Valid Keys Only ({validCount})</SelectItem>
                <SelectItem value="invalid">Invalid Keys Only ({invalidCount})</SelectItem>
                <SelectItem value="all">All ({totalCount})</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field orientation="horizontal">
            <Checkbox
              id="includeDetails"
              checked={includeDetails}
              onCheckedChange={(checked) => setIncludeDetails(checked === true)}
            />
            <FieldLabel htmlFor="includeDetails" className="cursor-pointer font-normal">
              Include details (response time, error message, etc.)
            </FieldLabel>
          </Field>
        </FieldGroup>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || getExportCount() === 0}>
            <DownloadIcon data-icon="inline-start" />
            {isExporting ? 'Exporting...' : `Export ${getExportCount()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
