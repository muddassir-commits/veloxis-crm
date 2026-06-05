'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Invoice, FileRecord } from '@/types';

interface PortalRealtimeListenerProps {
  clientId: string;
}

export function PortalRealtimeListener({ clientId }: PortalRealtimeListenerProps) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!clientId) return;

    // 1. Subscribe to Invoices changes for this client
    const invoicesChannel = supabase
      .channel(`portal-invoices-${clientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices', filter: `client_id=eq.${clientId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast.success('🧾 Invoice Raised!', {
              description: 'A new invoice has been generated for your services. You can view or pay it in the Invoices tab.',
              duration: 5000,
            });
          } else if (payload.eventType === 'UPDATE') {
            const status = (payload.new as Invoice).status;
            if (status === 'paid') {
              toast.success('💰 Payment Received!', {
                description: 'Thank you! Your payment has been processed and marked as paid.',
                duration: 5000,
              });
            } else {
              toast.success('🧾 Invoice Updated!', {
                description: 'An invoice has been updated. Details refreshed.',
                duration: 4000,
              });
            }
          }
          router.refresh();
        }
      )
      .subscribe();

    // 2. Subscribe to Deliverables (Tasks) changes for this client
    const tasksChannel = supabase
      .channel(`portal-tasks-${clientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `client_id=eq.${clientId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            toast.success('🎯 Deliverables Updated!', {
              description: 'Your project tasks or monthly deliverables have been updated by your campaign manager.',
              duration: 5000,
            });
          }
          router.refresh();
        }
      )
      .subscribe();

    // 3. Subscribe to Shared Files changes for this client
    const filesChannel = supabase
      .channel(`portal-files-${clientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'files', filter: `client_id=eq.${clientId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const isShared = (payload.new as FileRecord).is_shared_with_client;
            if (isShared) {
              toast.success('📁 New Document Shared!', {
                description: `A new file has been shared in your Vault: ${(payload.new as FileRecord).name}`,
                duration: 5000,
              });
            }
          }
          router.refresh();
        }
      )
      .subscribe();

    // 4. Subscribe to Projects changes for this client
    const projectsChannel = supabase
      .channel(`portal-projects-${clientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `client_id=eq.${clientId}` },
        () => {
          toast.success('📊 Project Status Sync!', {
            description: 'Your ongoing project milestones or timelines have been updated in real-time.',
            duration: 4000,
          });
          router.refresh();
        }
      )
      .subscribe();

    // 5. Subscribe to SEO metrics updates
    const seoChannel = supabase
      .channel(`portal-seo-${clientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seo_campaigns', filter: `client_id=eq.${clientId}` },
        () => {
          toast.success('📈 SEO Report Updated!', {
            description: 'Your latest Google Search Console & Analytics metrics have been synchronized.',
            duration: 4000,
          });
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(invoicesChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(filesChannel);
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(seoChannel);
    };
  }, [clientId, supabase, router]);

  return null; // Silent real-time listener
}
