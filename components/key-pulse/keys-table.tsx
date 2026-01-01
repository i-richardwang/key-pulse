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
import type { ApiKey } from '@/types';

interface KeysTableProps {
  keys: ApiKey[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onEdit: (key: ApiKey) => void;
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
  return d.toLocaleString('zh-CN', {
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
              <TableHead className="min-w-[200px]">Base URL</TableHead>
              <TableHead className="min-w-[120px]">Model</TableHead>
              <TableHead className="w-[100px]">状态</TableHead>
              <TableHead className="w-[120px]">验证时间</TableHead>
              <TableHead className="w-[80px]">耗时</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  加载中...
                </TableCell>
              </TableRow>
            ) : keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  暂无数据，点击"添加"按钮添加 API Key
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
                    <TableCell className="text-muted-foreground truncate max-w-[200px]">
                      {key.baseUrl}
                    </TableCell>
                    <TableCell>{key.model}</TableCell>
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
                            <span className="sr-only">操作菜单</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onValidate([key.id])}>
                            <PlayIcon />
                            验证
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(key)}>
                            <PencilIcon />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onDelete([key.id])}
                          >
                            <TrashIcon />
                            删除
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
          共 {total} 条记录
          {selectedIds.length > 0 && ` · 已选 ${selectedIds.length} 条`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeftIcon />
            <span className="sr-only">上一页</span>
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
            <span className="sr-only">下一页</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
