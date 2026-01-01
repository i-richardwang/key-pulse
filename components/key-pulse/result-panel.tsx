'use client';

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ResultItem } from './result-item';
import type { ValidationResult } from '@/types';
import { ListIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon } from 'lucide-react';

interface ResultPanelProps {
  results: ValidationResult[];
  validKeys: ValidationResult[];
  invalidKeys: ValidationResult[];
  rateLimitedKeys: ValidationResult[];
  timeoutKeys: ValidationResult[];
  errorKeys: ValidationResult[];
}

export function ResultPanel({
  results,
  validKeys,
  invalidKeys,
  rateLimitedKeys,
  timeoutKeys,
  errorKeys,
}: ResultPanelProps) {
  const problemKeys = [...rateLimitedKeys, ...timeoutKeys, ...errorKeys];

  return (
    <Card className="flex flex-col h-full">
      <Tabs defaultValue="all" className="flex flex-col h-full">
        <div className="px-4 pt-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="all" className="gap-1.5">
              <ListIcon className="size-3" />
              全部
              <Badge variant="secondary" className="ml-1 h-4 px-1">
                {results.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="valid" className="gap-1.5">
              <CheckCircleIcon className="size-3 text-green-600" />
              有效
              <Badge variant="secondary" className="ml-1 h-4 px-1">
                {validKeys.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="invalid" className="gap-1.5">
              <XCircleIcon className="size-3 text-red-600" />
              无效
              <Badge variant="secondary" className="ml-1 h-4 px-1">
                {invalidKeys.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="problem" className="gap-1.5">
              <AlertTriangleIcon className="size-3 text-amber-600" />
              问题
              <Badge variant="secondary" className="ml-1 h-4 px-1">
                {problemKeys.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 p-4">
          <TabsContent value="all" className="h-full mt-0">
            <ResultList results={results} emptyMessage="暂无验证结果" />
          </TabsContent>
          <TabsContent value="valid" className="h-full mt-0">
            <ResultList results={validKeys} emptyMessage="暂无有效 Key" />
          </TabsContent>
          <TabsContent value="invalid" className="h-full mt-0">
            <ResultList results={invalidKeys} emptyMessage="暂无无效 Key" />
          </TabsContent>
          <TabsContent value="problem" className="h-full mt-0">
            <ResultList results={problemKeys} emptyMessage="暂无问题 Key (限流/超时/错误)" />
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
}

function ResultList({
  results,
  emptyMessage,
}: {
  results: ValidationResult[];
  emptyMessage: string;
}) {
  if (results.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 pr-4">
        {results.map((result, index) => (
          <ResultItem key={result.key} result={result} index={index} />
        ))}
      </div>
    </ScrollArea>
  );
}
