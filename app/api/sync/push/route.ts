import { NextRequest, NextResponse } from 'next/server';
import { db, providers, apiKeys, proxies } from '@/db';
import { eq, inArray, and } from 'drizzle-orm';
import { z } from 'zod';
import {
  isBifrostConfigured,
  getBifrostProvider,
  createBifrostProvider,
  updateBifrostProvider,
} from '@/lib/bifrost-client';
import { transformToBifrostPayload, diffProviderWithRemote } from '@/lib/bifrost-transform';
import type { ApiKey } from '@/db/schema';
import type {
  BifrostProvider,
  BifrostKeyConfig,
  PreviewChange,
  PreviewError,
  PushResult,
} from '@/types/bifrost';

const previewSchema = z.object({
  providerIds: z.array(z.uuid()).min(1),
  mode: z.literal('preview'),
});

const pushSchema = z.object({
  providerIds: z.array(z.uuid()).min(1),
  mode: z.literal('push'),
  confirmed: z.literal(true),
});

const requestSchema = z.discriminatedUnion('mode', [previewSchema, pushSchema]);

export async function POST(request: NextRequest) {
  if (!isBifrostConfigured()) {
    return NextResponse.json(
      { error: 'Bifrost API is not configured. Set BIFROST_API_URL.' },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid request' },
      { status: 400 }
    );
  }

  const { providerIds, mode } = parsed.data;

  try {
    const providerList = await db
      .select({
        provider: providers,
        proxy: proxies,
      })
      .from(providers)
      .leftJoin(proxies, eq(providers.proxyId, proxies.id))
      .where(inArray(providers.id, providerIds));

    if (providerList.length === 0) {
      return NextResponse.json({ error: 'No providers found' }, { status: 404 });
    }

    const allKeys = await db
      .select()
      .from(apiKeys)
      .where(inArray(apiKeys.providerId, providerIds));

    const keysByProvider = Map.groupBy(allKeys, (k) => k.providerId);

    if (mode === 'preview') {
      const changes: PreviewChange[] = [];
      const errors: PreviewError[] = [];

      // Fetch all remote providers concurrently
      await Promise.all(
        providerList.map(async ({ provider, proxy }) => {
          try {
            const keys = keysByProvider.get(provider.id) ?? [];
            const remoteProv = await getBifrostProvider(provider.name);
            const payload = transformToBifrostPayload({ ...provider, proxy }, keys);
            const diff = diffProviderWithRemote(payload, keys, remoteProv);

            changes.push({
              providerId: provider.id,
              providerName: provider.name,
              action: remoteProv ? (diff.hasChanges ? 'update' : 'no_change') : 'create',
              keysChange: diff.keysChange,
              configChanges: diff.configChanges,
            });
          } catch (err) {
            errors.push({
              providerId: provider.id,
              providerName: provider.name,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          }
        })
      );

      return NextResponse.json({ changes, errors });
    } else {
      const results: PushResult[] = [];
      const errors: PreviewError[] = [];

      for (const { provider, proxy } of providerList) {
        try {
          const keys = keysByProvider.get(provider.id) ?? [];
          const payload = transformToBifrostPayload({ ...provider, proxy }, keys);
          const remoteProv = await getBifrostProvider(provider.name);

          let response: BifrostProvider;
          let action: 'created' | 'updated';

          if (remoteProv) {
            response = await updateBifrostProvider(provider.name, payload);
            action = 'updated';
          } else {
            response = await createBifrostProvider(payload);
            action = 'created';
          }

          if (response.keys && response.keys.length > 0) {
            await updateLocalKeyIds(provider.id, keys, response.keys);
          }

          results.push({
            providerId: provider.id,
            providerName: provider.name,
            action,
            keysCount: keys.length,
          });
        } catch (err) {
          errors.push({
            providerId: provider.id,
            providerName: provider.name,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      return NextResponse.json({
        success: errors.length === 0,
        results,
        errors,
      });
    }
  } catch (error) {
    console.error('Push sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Push failed' },
      { status: 500 }
    );
  }
}

// Sync local key IDs with Bifrost response to enable future updates
async function updateLocalKeyIds(
  providerId: string,
  localKeys: ApiKey[],
  remoteKeys: BifrostKeyConfig[]
): Promise<void> {
  const remoteKeyMap = new Map<string, string>();
  for (const remoteKey of remoteKeys) {
    if (remoteKey.id && remoteKey.name) {
      remoteKeyMap.set(remoteKey.name, remoteKey.id);
    }
  }

  const updates = localKeys
    .map((localKey) => {
      const keyName = localKey.name || localKey.maskedKey;
      const remoteKeyId = remoteKeyMap.get(keyName);
      if (remoteKeyId && localKey.bifrostKeyId !== remoteKeyId) {
        return { localKey, remoteKeyId };
      }
      return null;
    })
    .filter((u): u is { localKey: ApiKey; remoteKeyId: string } => u !== null);

  if (updates.length === 0) return;

  await Promise.all(
    updates.map(({ localKey, remoteKeyId }) =>
      db.update(apiKeys)
        .set({ bifrostKeyId: remoteKeyId, updatedAt: new Date() })
        .where(and(eq(apiKeys.id, localKey.id), eq(apiKeys.providerId, providerId)))
    )
  );
}
