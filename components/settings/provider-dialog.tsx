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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { useCreateProvider, useUpdateProvider, type ProviderWithDetails } from '@/hooks/use-providers';
import { useProxies } from '@/hooks/use-proxies';
import { providerSchema } from '@/lib/schemas';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editProvider?: ProviderWithDetails | null;
  onSuccess: () => void;
}

const BASE_PROVIDER_TYPES = [
  { value: 'none', label: 'None (Standard)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'cohere', label: 'Cohere' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'bedrock', label: 'AWS Bedrock' },
];

export function ProviderDialog({
  open,
  onOpenChange,
  editProvider,
  onSuccess,
}: ProviderDialogProps) {
  // Core fields
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [proxyId, setProxyId] = useState<string>('none');

  // Bifrost fields
  const [extraHeadersJson, setExtraHeadersJson] = useState('');
  const [requestTimeout, setRequestTimeout] = useState(30);
  const [maxRetries, setMaxRetries] = useState(0);
  const [retryBackoffInitial, setRetryBackoffInitial] = useState(500);
  const [retryBackoffMax, setRetryBackoffMax] = useState(5000);
  const [concurrency, setConcurrency] = useState(1000);
  const [bufferSize, setBufferSize] = useState(5000);
  const [sendBackRawRequest, setSendBackRawRequest] = useState(false);
  const [sendBackRawResponse, setSendBackRawResponse] = useState(false);
  const [baseProviderType, setBaseProviderType] = useState('none');

  // Collapsible sections
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { createProvider, isLoading: isCreating } = useCreateProvider();
  const { updateProvider, isLoading: isUpdating } = useUpdateProvider();
  const { data: proxies } = useProxies();

  const isEditing = !!editProvider;
  const isLoading = isCreating || isUpdating;

  useEffect(() => {
    if (open) {
      if (editProvider) {
        setName(editProvider.name);
        setBaseUrl(editProvider.baseUrl);
        setModel(editProvider.model);
        setDescription(editProvider.description || '');
        setProxyId(editProvider.proxyId || 'none');
        // Bifrost fields
        setExtraHeadersJson(editProvider.extraHeaders ? JSON.stringify(editProvider.extraHeaders, null, 2) : '');
        setRequestTimeout(editProvider.requestTimeout ?? 30);
        setMaxRetries(editProvider.maxRetries ?? 0);
        setRetryBackoffInitial(editProvider.retryBackoffInitial ?? 500);
        setRetryBackoffMax(editProvider.retryBackoffMax ?? 5000);
        setConcurrency(editProvider.concurrency ?? 1000);
        setBufferSize(editProvider.bufferSize ?? 5000);
        setSendBackRawRequest(editProvider.sendBackRawRequest ?? false);
        setSendBackRawResponse(editProvider.sendBackRawResponse ?? false);
        setBaseProviderType(editProvider.baseProviderType || 'none');
        // Expand advanced if any bifrost field is set
        setShowAdvanced(!!editProvider.extraHeaders);
      } else {
        setName('');
        setBaseUrl('');
        setModel('');
        setDescription('');
        setProxyId('none');
        setExtraHeadersJson('');
        setRequestTimeout(30);
        setMaxRetries(0);
        setRetryBackoffInitial(500);
        setRetryBackoffMax(5000);
        setConcurrency(1000);
        setBufferSize(5000);
        setSendBackRawRequest(false);
        setSendBackRawResponse(false);
        setBaseProviderType('none');
        setShowAdvanced(false);
      }
    }
  }, [open, editProvider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Parse extra headers JSON
    let extraHeaders: Record<string, string> | null = null;
    if (extraHeadersJson.trim()) {
      try {
        extraHeaders = JSON.parse(extraHeadersJson);
      } catch {
        toast.error('Invalid JSON format for Extra Headers');
        return;
      }
    }

    // Validate with Zod
    const result = providerSchema.safeParse({
      name,
      baseUrl,
      model,
      description: description || undefined,
      proxyId: proxyId === 'none' ? undefined : proxyId,
      extraHeaders,
      requestTimeout,
      maxRetries,
      retryBackoffInitial,
      retryBackoffMax,
      concurrency,
      bufferSize,
      sendBackRawRequest,
      sendBackRawResponse,
      baseProviderType: baseProviderType === 'none' ? undefined : baseProviderType,
    });

    if (!result.success) {
      toast.error(result.error.issues[0]?.message || 'Validation failed');
      return;
    }

    try {
      if (isEditing) {
        await updateProvider({
          id: editProvider.id,
          name: result.data.name,
          baseUrl: result.data.baseUrl,
          model: result.data.model,
          description: result.data.description ?? null,
          proxyId: result.data.proxyId ?? null,
          extraHeaders: (result.data.extraHeaders as Record<string, string>) ?? null,
          requestTimeout: result.data.requestTimeout ?? null,
          maxRetries: result.data.maxRetries ?? null,
          retryBackoffInitial: result.data.retryBackoffInitial ?? null,
          retryBackoffMax: result.data.retryBackoffMax ?? null,
          concurrency: result.data.concurrency ?? null,
          bufferSize: result.data.bufferSize ?? null,
          sendBackRawRequest: result.data.sendBackRawRequest ?? null,
          sendBackRawResponse: result.data.sendBackRawResponse ?? null,
          baseProviderType: result.data.baseProviderType ?? null,
        });
        toast.success('Provider updated');
      } else {
        await createProvider({
          name: result.data.name,
          baseUrl: result.data.baseUrl,
          model: result.data.model,
          description: result.data.description ?? null,
          proxyId: result.data.proxyId ?? null,
          extraHeaders: (result.data.extraHeaders as Record<string, string>) ?? null,
          requestTimeout: result.data.requestTimeout ?? null,
          maxRetries: result.data.maxRetries ?? null,
          retryBackoffInitial: result.data.retryBackoffInitial ?? null,
          retryBackoffMax: result.data.retryBackoffMax ?? null,
          concurrency: result.data.concurrency ?? null,
          bufferSize: result.data.bufferSize ?? null,
          sendBackRawRequest: result.data.sendBackRawRequest ?? null,
          sendBackRawResponse: result.data.sendBackRawResponse ?? null,
          baseProviderType: result.data.baseProviderType ?? null,
        });
        toast.success('Provider created');
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Provider' : 'Add Provider'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {/* Core Fields */}
            <Field>
              <FieldLabel htmlFor="provider-name">Name</FieldLabel>
              <Input
                id="provider-name"
                placeholder="OpenAI"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="provider-baseUrl">Base URL</FieldLabel>
              <Input
                id="provider-baseUrl"
                placeholder="https://api.openai.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="provider-model">Model</FieldLabel>
              <Input
                id="provider-model"
                placeholder="gpt-4o"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="provider-proxy">Proxy (optional)</FieldLabel>
              <Select value={proxyId} onValueChange={setProxyId}>
                <SelectTrigger id="provider-proxy">
                  <SelectValue placeholder="No proxy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No proxy</SelectItem>
                  {proxies.map((proxy) => (
                    <SelectItem key={proxy.id} value={proxy.id}>
                      {proxy.name} ({proxy.host}:{proxy.port})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="provider-description">Description (optional)</FieldLabel>
              <Input
                id="provider-description"
                placeholder="Brief description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            {/* Advanced Settings (Bifrost) */}
            <div className="border-t pt-4 mt-2">
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Advanced Settings (Bifrost)
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  <Field>
                    <FieldLabel htmlFor="provider-baseProviderType">Base Provider Type</FieldLabel>
                    <Select value={baseProviderType} onValueChange={setBaseProviderType}>
                      <SelectTrigger id="provider-baseProviderType">
                        <SelectValue placeholder="Select base type" />
                      </SelectTrigger>
                      <SelectContent>
                        {BASE_PROVIDER_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">For custom providers</p>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="provider-extraHeaders">Extra Headers (JSON)</FieldLabel>
                    <textarea
                      id="provider-extraHeaders"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
                      placeholder='{"X-Custom-Header": "value"}'
                      value={extraHeadersJson}
                      onChange={(e) => setExtraHeadersJson(e.target.value)}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="provider-timeout">Timeout (s)</FieldLabel>
                      <Input
                        id="provider-timeout"
                        type="number"
                        min={1}
                        max={172800}
                        value={requestTimeout}
                        onChange={(e) => setRequestTimeout(parseInt(e.target.value) || 30)}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="provider-retries">Max Retries</FieldLabel>
                      <Input
                        id="provider-retries"
                        type="number"
                        min={0}
                        max={10}
                        value={maxRetries}
                        onChange={(e) => setMaxRetries(parseInt(e.target.value) || 0)}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="provider-backoffInitial">Backoff Initial (ms)</FieldLabel>
                      <Input
                        id="provider-backoffInitial"
                        type="number"
                        min={100}
                        value={retryBackoffInitial}
                        onChange={(e) => setRetryBackoffInitial(parseInt(e.target.value) || 500)}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="provider-backoffMax">Backoff Max (ms)</FieldLabel>
                      <Input
                        id="provider-backoffMax"
                        type="number"
                        min={1000}
                        value={retryBackoffMax}
                        onChange={(e) => setRetryBackoffMax(parseInt(e.target.value) || 5000)}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="provider-concurrency">Concurrency</FieldLabel>
                      <Input
                        id="provider-concurrency"
                        type="number"
                        min={1}
                        max={100000}
                        value={concurrency}
                        onChange={(e) => setConcurrency(parseInt(e.target.value) || 1000)}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="provider-bufferSize">Buffer Size</FieldLabel>
                      <Input
                        id="provider-bufferSize"
                        type="number"
                        min={1}
                        max={100000}
                        value={bufferSize}
                        onChange={(e) => setBufferSize(parseInt(e.target.value) || 5000)}
                      />
                    </Field>
                  </div>

                  <div className="flex gap-6">
                    <Field orientation="horizontal">
                      <Switch
                        checked={sendBackRawRequest}
                        onCheckedChange={setSendBackRawRequest}
                      />
                      <FieldLabel>Raw Request</FieldLabel>
                    </Field>

                    <Field orientation="horizontal">
                      <Switch
                        checked={sendBackRawResponse}
                        onCheckedChange={setSendBackRawResponse}
                      />
                      <FieldLabel>Raw Response</FieldLabel>
                    </Field>
                  </div>
                </div>
              )}
            </div>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name || !baseUrl || !model}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
