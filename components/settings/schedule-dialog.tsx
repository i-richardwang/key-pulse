'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field';
import { useCreateSchedule, useUpdateSchedule } from '@/hooks/use-schedules';
import { useProviders } from '@/hooks/use-providers';
import type { ScheduleInfo } from '@/types';
import { toast } from 'sonner';

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editSchedule?: ScheduleInfo | null;
  onSuccess: () => void;
}

const CRON_PRESETS = [
  { value: '0 * * * *', label: 'Every hour' },
  { value: '0 */6 * * *', label: 'Every 6 hours' },
  { value: '0 3 * * *', label: 'Daily at 3:00 AM', recommended: true },
  { value: '0 3 * * 1', label: 'Weekly on Monday' },
  { value: 'custom', label: 'Custom' },
];

export function ScheduleDialog({
  open,
  onOpenChange,
  editSchedule,
  onSuccess,
}: ScheduleDialogProps) {
  const [name, setName] = useState('');
  const [cronPreset, setCronPreset] = useState('0 3 * * *');
  const [customCron, setCustomCron] = useState('');
  const [providerId, setProviderId] = useState<string>('all');

  const { createSchedule, isLoading: isCreating } = useCreateSchedule();
  const { updateSchedule, isLoading: isUpdating } = useUpdateSchedule();
  const { data: providers } = useProviders();

  const isEditing = !!editSchedule;
  const isLoading = isCreating || isUpdating;

  // Reset form state when dialog opens (common dialog pattern)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (open) {
      if (editSchedule) {
        setName(editSchedule.name);
        setProviderId(editSchedule.providerId || 'all');
        // Check if cron matches a preset
        const preset = CRON_PRESETS.find((p) => p.value === editSchedule.cron);
        if (preset && preset.value !== 'custom') {
          setCronPreset(editSchedule.cron);
          setCustomCron('');
        } else {
          setCronPreset('custom');
          setCustomCron(editSchedule.cron);
        }
      } else {
        // Reset to defaults
        setName('');
        setCronPreset('0 3 * * *');
        setCustomCron('');
        setProviderId('all');
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, editSchedule]);

  const getCronValue = () => {
    return cronPreset === 'custom' ? customCron : cronPreset;
  };

  const handleSubmit = async () => {
    const cronValue = getCronValue();

    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!cronValue.trim()) {
      toast.error('Cron expression is required');
      return;
    }

    try {
      const data = {
        name: name.trim(),
        cron: cronValue.trim(),
        providerId: providerId === 'all' ? null : providerId,
      };

      if (isEditing) {
        await updateSchedule({ id: editSchedule.id, ...data });
        toast.success('Schedule updated');
      } else {
        await createSchedule(data);
        toast.success('Schedule created');
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Schedule' : 'Add Schedule'}</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="schedule-name">Name *</FieldLabel>
            <Input
              id="schedule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Daily validation"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="schedule-cron">Schedule *</FieldLabel>
            <Select value={cronPreset} onValueChange={setCronPreset}>
              <SelectTrigger id="schedule-cron">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRON_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                    {preset.recommended && (
                      <span className="ml-2 text-xs text-muted-foreground">(Recommended)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {cronPreset === 'custom' && (
            <Field>
              <FieldLabel htmlFor="schedule-custom-cron">Cron Expression *</FieldLabel>
              <Input
                id="schedule-custom-cron"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                placeholder="0 3 * * *"
                className="font-mono"
              />
              <FieldDescription>
                Format: minute hour day month weekday
              </FieldDescription>
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="schedule-provider">Provider</FieldLabel>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger id="schedule-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              Select a specific provider or validate all keys
            </FieldDescription>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
