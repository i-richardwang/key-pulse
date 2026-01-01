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
import type { ValidationResult, ExportOptions } from '@/types';
import { exportResults } from '@/lib/export-utils';
import { DownloadIcon } from 'lucide-react';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: ValidationResult[];
  validCount: number;
}

export function ExportDialog({
  open,
  onOpenChange,
  results,
  validCount,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportOptions['format']>('txt');
  const [content, setContent] = useState<ExportOptions['content']>('valid');
  const [includeDetails, setIncludeDetails] = useState(false);

  const handleExport = () => {
    exportResults(results, { format, content, includeDetails });
    onOpenChange(false);
  };

  const getExportCount = () => {
    switch (content) {
      case 'valid':
        return validCount;
      case 'invalid':
        return results.length - validCount;
      default:
        return results.length;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Results</DialogTitle>
          <DialogDescription>Select export format and content</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          {/* Format */}
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

          {/* Content */}
          <Field>
            <FieldLabel htmlFor="export-content">Content</FieldLabel>
            <Select value={content} onValueChange={(v) => setContent(v as ExportOptions['content'])}>
              <SelectTrigger id="export-content">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="valid">Valid Keys Only ({validCount})</SelectItem>
                <SelectItem value="invalid">Invalid Keys Only ({results.length - validCount})</SelectItem>
                <SelectItem value="all">All ({results.length})</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Include Details */}
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
          <Button onClick={handleExport}>
            <DownloadIcon data-icon="inline-start" />
            Export {getExportCount()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
