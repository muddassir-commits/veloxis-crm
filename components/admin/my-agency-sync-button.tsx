'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MyAgencySyncButton({ clientId }: { clientId: string }) {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  const handleSyncAll = async () => {
    setSyncing(true);
    const toastId = toast.loading('Syncing all agency marketing metrics (GSC, GA4, Meta)...');
    try {
      // Sync GSC
      const gscPromise = fetch(`/api/integrations/gsc/sync/${clientId}`, { method: 'POST' })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok || d.error) return { error: d.error || 'Failed to sync GSC' };
          return d;
        });

      // Sync GA4
      const ga4Promise = fetch(`/api/integrations/ga4/sync/${clientId}`, { method: 'POST' })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok || d.error) return { error: d.error || 'Failed to sync GA4' };
          return d;
        });

      // Sync Meta Ads
      const metaPromise = fetch(`/api/integrations/meta/sync/${clientId}`, { method: 'POST' })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok || d.error) return { error: d.error || 'Failed to sync Meta Ads' };
          return d;
        });

      const [gsc, ga4, meta] = await Promise.all([gscPromise, ga4Promise, metaPromise]);

      if (gsc.error && ga4.error && meta.error) {
        throw new Error(`Sync failed. GSC: ${gsc.error}. GA4: ${ga4.error}. Meta: ${meta.error}`);
      }

      const successes: string[] = [];
      const errors: string[] = [];

      if (gsc.error) errors.push(`GSC (${gsc.error})`); else successes.push('GSC');
      if (ga4.error) errors.push(`GA4 (${ga4.error})`); else successes.push('GA4');
      if (meta.error) errors.push(`Meta Ads (${meta.error})`); else successes.push('Meta');

      if (errors.length > 0) {
        toast.warning(`Sync partially completed. Synced: ${successes.join(', ')}. Failed: ${errors.join(', ')}`, { id: toastId, duration: 5000 });
      } else {
        toast.success('Agency dashboard metrics synced successfully!', { id: toastId });
      }
      
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cosmetic catch block error
    } catch (err: any) {
      toast.error(err.message || 'Sync failed', { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      size="sm"
      disabled={syncing}
      onClick={handleSyncAll}
      className="bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-xs h-8 gap-1.5 cursor-pointer disabled:opacity-50"
    >
      {syncing ? (
        <Loader2 size={13} className="animate-spin text-[#8BA3C7]" />
      ) : (
        <RefreshCw size={13} className="stroke-[1.5]" />
      )}
      <span>Sync All Data</span>
    </Button>
  );
}
