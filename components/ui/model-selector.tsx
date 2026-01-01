'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COMMON_MODELS } from '@/lib/constants';

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  customValue: string;
  onCustomChange: (value: string) => void;
  id?: string;
  label?: string;
  required?: boolean;
}

export function ModelSelector({
  value,
  onChange,
  customValue,
  onCustomChange,
  id = 'model',
  label = '模型',
  required = false,
}: ModelSelectorProps) {
  const isCustom = value === 'custom';

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {isCustom ? (
        <div className="flex gap-2">
          <Input
            id={id}
            placeholder="模型名称"
            value={customValue}
            onChange={(e) => onCustomChange(e.target.value)}
            className="flex-1"
            required={required}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange('gpt-3.5-turbo')}
          >
            预设
          </Button>
        </div>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue placeholder="选择模型" />
          </SelectTrigger>
          <SelectContent>
            {COMMON_MODELS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
            <SelectItem value="custom">自定义...</SelectItem>
          </SelectContent>
        </Select>
      )}
    </Field>
  );
}

// 获取最终的模型值
export function getFinalModel(selected: string, custom: string): string {
  return selected === 'custom' ? custom : selected;
}

// 判断是否为预设模型
export function isPresetModel(model: string): boolean {
  return COMMON_MODELS.includes(model as typeof COMMON_MODELS[number]);
}

// 从模型名称初始化选择器状态
export function initModelState(model: string): { selected: string; custom: string } {
  if (isPresetModel(model)) {
    return { selected: model, custom: '' };
  }
  return { selected: 'custom', custom: model };
}
