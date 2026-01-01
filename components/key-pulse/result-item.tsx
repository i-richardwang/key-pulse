'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CopyIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
} from 'lucide-react';
import type { ValidationResult } from '@/types';
import { copyToClipboard, formatTimestamp } from '@/lib/key-utils';
import { STATUS_CONFIG, type KeyStatus } from '@/lib/constants';

interface ResultItemProps {
  result: ValidationResult;
  index: number;
}

export function ResultItem({ result, index }: ResultItemProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const config = STATUS_CONFIG[result.status as KeyStatus] || STATUS_CONFIG.pending;

  const handleCopy = async () => {
    const success = await copyToClipboard(result.key);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-8">{index + 1}</span>
          <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
            {result.maskedKey}
          </code>
          <Badge variant={config.variant} className={config.className}>
            {config.label}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {result.responseTime && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ClockIcon className="size-3" />
              {result.responseTime}ms
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCopy}
            title="复制完整 Key"
          >
            {copied ? (
              <CheckIcon className="text-green-600" />
            ) : (
              <CopyIcon />
            )}
          </Button>
          {(result.errorMessage || result.rawResponse !== undefined) && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUpIcon />
              ) : (
                <ChevronDownIcon />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Error message */}
      {result.errorMessage && !expanded && (
        <p className="text-xs text-muted-foreground pl-11 truncate">
          {result.errorMessage}
        </p>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="pl-11 space-y-2">
          <div className="text-xs space-y-1">
            <p>
              <span className="text-muted-foreground">时间:</span>{' '}
              {formatTimestamp(result.timestamp)}
            </p>
            {result.errorCode && (
              <p>
                <span className="text-muted-foreground">错误码:</span>{' '}
                {result.errorCode}
              </p>
            )}
            {result.errorMessage && (
              <p>
                <span className="text-muted-foreground">错误信息:</span>{' '}
                {result.errorMessage}
              </p>
            )}
          </div>
          {result.rawResponse !== undefined && (
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
              {JSON.stringify(result.rawResponse, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
