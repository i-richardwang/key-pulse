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
  invalidCount: number;
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
          <DialogTitle>导出结果</DialogTitle>
          <DialogDescription>选择导出格式和内容</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          {/* Format */}
          <Field>
            <FieldLabel htmlFor="export-format">导出格式</FieldLabel>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportOptions['format'])}>
              <SelectTrigger id="export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="txt">TXT (纯文本)</SelectItem>
                <SelectItem value="csv">CSV (表格)</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Content */}
          <Field>
            <FieldLabel htmlFor="export-content">导出内容</FieldLabel>
            <Select value={content} onValueChange={(v) => setContent(v as ExportOptions['content'])}>
              <SelectTrigger id="export-content">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="valid">仅有效 Key ({validCount} 个)</SelectItem>
                <SelectItem value="invalid">仅无效 Key ({results.length - validCount} 个)</SelectItem>
                <SelectItem value="all">全部 ({results.length} 个)</SelectItem>
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
              包含详细信息 (响应时间、错误信息等)
            </FieldLabel>
          </Field>
        </FieldGroup>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleExport}>
            <DownloadIcon data-icon="inline-start" />
            导出 {getExportCount()} 条
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
