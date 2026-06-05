'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Client, Profile, ClientCommunication, SupportTicket, NpsResponse } from '@/types';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import {
  MessageSquare,
  AlertCircle,
  TrendingUp,
  PlusCircle,
  Trash2,
  Edit2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

// Modals
import { LogCommunicationModal } from '../../client-relations/modals/log-communication-modal';
import { TicketModal } from '../../client-relations/modals/ticket-modal';
import { NpsModal } from '../../client-relations/modals/nps-modal';

interface ClientRelationsTabProps {
  client: Client;
  profiles: Profile[];
}

export function ClientRelationsTab({ client, profiles }: ClientRelationsTabProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  // Data State
  const [comms, setComms] = useState<ClientCommunication[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [npsList, setNpsList] = useState<NpsResponse[]>([]);

  // Modals visibility
  const [commsModalOpen, setCommsModalOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [npsModalOpen, setNpsModalOpen] = useState(false);

  // Deletions
  const [deleteCommId, setDeleteCommId] = useState<string | null>(null);
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null);
  const [deleteNpsId, setDeleteNpsId] = useState<string | null>(null);

  // Fetch functions
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch communications
      const { data: commData } = await supabase
        .from('client_communications')
        .select('*, profiles:created_by(full_name)')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      // Fetch tickets
      const { data: ticketData } = await supabase
        .from('support_tickets')
        .select('*, clients(name), profiles_created:created_by(full_name), profiles_assigned:assigned_to(full_name)')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      // Fetch NPS responses
      const { data: npsData } = await supabase
        .from('nps_responses')
        .select('*, clients(name), profiles:created_by(full_name)')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (commData) setComms(commData);
      if (ticketData) setTickets(ticketData);
      if (npsData) setNpsList(npsData);
    } catch (err) {
      console.error('Failed to load client relations history:', err);
    } finally {
      setLoading(false);
    }
  }, [client.id, supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // Delete Handlers
  const handleDeleteComm = async () => {
    if (!deleteCommId) return;
    try {
      const { error } = await supabase.from('client_communications').delete().eq('id', deleteCommId);
      if (error) throw error;
      toast.success('Communication log deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete communication log');
    } finally {
      setDeleteCommId(null);
    }
  };

  const handleDeleteTicket = async () => {
    if (!deleteTicketId) return;
    try {
      const { error } = await supabase.from('support_tickets').delete().eq('id', deleteTicketId);
      if (error) throw error;
      toast.success('Support ticket deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete support ticket');
    } finally {
      setDeleteTicketId(null);
    }
  };

  const handleDeleteNps = async () => {
    if (!deleteNpsId) return;
    try {
      const { error } = await supabase.from('nps_responses').delete().eq('id', deleteNpsId);
      if (error) throw error;
      toast.success('NPS response deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete NPS response');
    } finally {
      setDeleteNpsId(null);
    }
  };

  const avgNps = npsList.length
    ? (npsList.reduce((acc, curr) => acc + curr.score, 0) / npsList.length).toFixed(1)
    : 'N/A';

  if (loading) {
    return <div className="text-sm text-[#8BA3C7] animate-pulse">Loading Client Relations logs...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ━━━ STATS BLOCK ━━━ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 select-none">
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[8px] p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#4A6480] uppercase tracking-wider font-semibold">Communications</span>
            <span className="text-xl font-bold font-mono text-[#F0F4FF] block mt-0.5">{comms.length} logs</span>
          </div>
          <MessageSquare className="text-[#1B4FD8]" size={20} />
        </div>

        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[8px] p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#4A6480] uppercase tracking-wider font-semibold">Pending Tickets</span>
            <span className="text-xl font-bold font-mono text-[#F97316] block mt-0.5">
              {tickets.filter((t) => t.status !== 'resolved').length} open
            </span>
          </div>
          <AlertCircle className="text-[#F97316]" size={20} />
        </div>

        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[8px] p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#4A6480] uppercase tracking-wider font-semibold">Average NPS</span>
            <span className="text-xl font-bold font-mono text-[#22C55E] block mt-0.5">{avgNps} / 10</span>
          </div>
          <TrendingUp className="text-[#22C55E]" size={20} />
        </div>
      </div>

      {/* ━━━ TWO COLUMN GRID ━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Communications Log */}
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-[#1E3352] pb-3">
            <h3 className="text-xs font-bold text-[#F0F4FF] uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare size={14} className="text-[#1B4FD8]" />
              <span>Communications Log</span>
            </h3>
            <Button
              onClick={() => setCommsModalOpen(true)}
              size="sm"
              className="bg-[#1B4FD8]/10 hover:bg-[#1B4FD8]/20 border border-[#1B4FD8]/20 text-[#4D90FE] text-[10px] h-7 gap-1 px-2.5 cursor-pointer font-semibold"
            >
              <PlusCircle size={11} />
              <span>Log Comms</span>
            </Button>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {comms.map((c) => (
              <div key={c.id} className="p-3 bg-[#060D1A] border border-[#1E3352] rounded-lg space-y-2 relative group">
                <div className="flex justify-between items-center text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded uppercase text-[8px] font-bold ${
                      c.type === 'call' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
                      c.type === 'whatsapp' ? 'bg-[#10B981]/10 text-[#10B981]' :
                      c.type === 'email' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                    }`}>
                      {c.type}
                    </span>
                    <span className="text-[#4A6480] capitalize font-medium">{c.direction}</span>
                  </div>
                  <span className="text-[#4A6480]">{formatDate(c.created_at)}</span>
                </div>

                <p className="text-xs text-[#8BA3C7] leading-relaxed whitespace-pre-wrap">{c.body}</p>

                <div className="flex justify-between items-center text-[9px] text-[#4A6480] font-medium pt-1">
                  <span>Logged by: {c.profiles?.full_name || 'System'}</span>
                  <button
                    onClick={() => setDeleteCommId(c.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#4A6480] hover:text-[#EF4444] transition-all p-0.5"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}

            {comms.length === 0 && (
              <div className="text-center py-12 text-xs text-[#4A6480] italic">No communications logged yet.</div>
            )}
          </div>
        </div>

        {/* Column 2: Support Tickets & NPS */}
        <div className="space-y-6">
          {/* Support Tickets list */}
          <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#1E3352] pb-3">
              <h3 className="text-xs font-bold text-[#F0F4FF] uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle size={14} className="text-[#F97316]" />
                <span>Support Tickets</span>
              </h3>
              <Button
                onClick={() => {
                  setSelectedTicket(null);
                  setTicketModalOpen(true);
                }}
                size="sm"
                className="bg-[#1B4FD8]/10 hover:bg-[#1B4FD8]/20 border border-[#1B4FD8]/20 text-[#4D90FE] text-[10px] h-7 gap-1 px-2.5 cursor-pointer font-semibold"
              >
                <PlusCircle size={11} />
                <span>Raise Ticket</span>
              </Button>
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {tickets.map((t) => (
                <div key={t.id} className="p-3 bg-[#060D1A] border border-[#1E3352] rounded-lg space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        t.status === 'open' ? 'bg-[#EF4444]' :
                        t.status === 'in_progress' ? 'bg-[#F59E0B]' : 'bg-[#22C55E]'
                      }`} />
                      <span className="font-bold text-[#8BA3C7] capitalize">{t.status.replace('_', ' ')}</span>
                    </div>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      t.priority === 'urgent' ? 'bg-[#EF4444]/10 text-[#EF4444]' :
                      t.priority === 'high' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                      t.priority === 'medium' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'bg-[#4B5563]/10 text-[#8BA3C7]'
                    }`}>
                      {t.priority}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-[#F0F4FF]">{t.subject}</h4>

                  {t.status === 'resolved' && t.resolution && (
                    <p className="text-[10px] text-[#22C55E] bg-[#22C55E]/5 border border-[#22C55E]/10 rounded p-1.5 italic">
                      Resolution: &quot;{t.resolution}&quot;
                    </p>
                  )}

                  <div className="flex justify-between items-center text-[9px] text-[#4A6480] font-semibold pt-1 border-t border-[#1E3352]/40">
                    <span>Assigned: {t.profiles_assigned?.full_name || 'Unassigned'}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedTicket(t);
                          setTicketModalOpen(true);
                        }}
                        className="hover:text-[#4D90FE] transition-colors"
                      >
                        <Edit2 size={10} />
                      </button>
                      <button
                        onClick={() => setDeleteTicketId(t.id)}
                        className="hover:text-[#EF4444] transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {tickets.length === 0 && (
                <div className="text-center py-8 text-xs text-[#4A6480] italic">No support tickets created yet.</div>
              )}
            </div>
          </div>

          {/* NPS History list */}
          <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#1E3352] pb-3">
              <h3 className="text-xs font-bold text-[#F0F4FF] uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={14} className="text-[#22C55E]" />
                <span>NPS Response History</span>
              </h3>
              <Button
                onClick={() => setNpsModalOpen(true)}
                size="sm"
                className="bg-[#1B4FD8]/10 hover:bg-[#1B4FD8]/20 border border-[#1B4FD8]/20 text-[#4D90FE] text-[10px] h-7 gap-1 px-2.5 cursor-pointer font-semibold"
              >
                <PlusCircle size={11} />
                <span>Log NPS</span>
              </Button>
            </div>

            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
              {npsList.map((n) => (
                <div key={n.id} className="p-3 bg-[#060D1A] border border-[#1E3352] rounded-lg flex items-center justify-between gap-4 group">
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#4A6480]">{formatDate(n.created_at)}</span>
                    {n.feedback ? (
                      <p className="text-xs text-[#8BA3C7] italic">&quot;{n.feedback}&quot;</p>
                    ) : (
                      <p className="text-xs text-[#4A6480] italic">No comments.</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold font-mono w-7 h-7 rounded-full flex items-center justify-center border ${
                      n.score >= 9 ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]' :
                      n.score >= 7 ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]' : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                    }`}>
                      {n.score}
                    </span>
                    <button
                      onClick={() => setDeleteNpsId(n.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#4A6480] hover:text-[#EF4444] transition-all p-0.5"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}

              {npsList.length === 0 && (
                <div className="text-center py-8 text-xs text-[#4A6480] italic">No NPS response logs.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ CONFIRM DIALOGS ━━━ */}
      <ConfirmDialog
        open={deleteCommId !== null}
        onClose={() => setDeleteCommId(null)}
        onConfirm={handleDeleteComm}
        title="Delete Communication Log"
        description="Are you sure you want to permanently delete this communication log entry? This action cannot be undone."
      />

      <ConfirmDialog
        open={deleteTicketId !== null}
        onClose={() => setDeleteTicketId(null)}
        onConfirm={handleDeleteTicket}
        title="Delete Support Ticket"
        description="Are you sure you want to permanently delete this support ticket? This action cannot be undone."
      />

      <ConfirmDialog
        open={deleteNpsId !== null}
        onClose={() => setDeleteNpsId(null)}
        onConfirm={handleDeleteNps}
        title="Delete NPS Survey Entry"
        description="Are you sure you want to permanently delete this Net Promoter Score survey entry? This action cannot be undone."
      />

      {/* ━━━ MODALS ━━━ */}
      <LogCommunicationModal
        open={commsModalOpen}
        onClose={() => setCommsModalOpen(false)}
        clients={[client]}
        onSuccess={fetchData}
      />

      <TicketModal
        open={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        clients={[client]}
        team={profiles}
        ticket={selectedTicket}
        onSuccess={fetchData}
      />

      <NpsModal
        open={npsModalOpen}
        onClose={() => setNpsModalOpen(false)}
        clients={[client]}
        onSuccess={fetchData}
      />
    </div>
  );
}
export default ClientRelationsTab;
