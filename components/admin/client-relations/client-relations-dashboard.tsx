'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Client, Profile, ClientCommunication, SupportTicket, NpsResponse } from '@/types';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import {
  MessageSquare,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  PlusCircle,
  HeartPulse,
  TrendingUp,
  User,
  Users,
  Search,
  MessageCircle,
  Trash2,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

// Modals
import { LogCommunicationModal } from './modals/log-communication-modal';
import { TicketModal } from './modals/ticket-modal';
import { NpsModal } from './modals/nps-modal';

interface ClientRelationsDashboardProps {
  clients: Client[];
  team: Profile[];
  initialCommunications: ClientCommunication[];
  initialTickets: SupportTicket[];
  initialNpsResponses: NpsResponse[];
}

export function ClientRelationsDashboard({
  clients,
  team,
  initialCommunications,
  initialTickets,
  initialNpsResponses,
}: ClientRelationsDashboardProps) {
  const supabase = createClient();

  // State
  const [comms, setComms] = useState<ClientCommunication[]>(initialCommunications);
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets);
  const [npsList, setNpsList] = useState<NpsResponse[]>(initialNpsResponses);
  const [activeTab, setActiveTab] = useState<'overview' | 'comms' | 'tickets' | 'nps' | 'risk'>('overview');

  // Modals visibility
  const [commsModalOpen, setCommsModalOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [npsModalOpen, setNpsModalOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [commsTypeFilter, setCommsTypeFilter] = useState('');

  // Delete Confirmations
  const [deleteCommId, setDeleteCommId] = useState<string | null>(null);
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null);
  const [deleteNpsId, setDeleteNpsId] = useState<string | null>(null);

  // Refresh handlers
  const refreshComms = async () => {
    const { data } = await supabase
      .from('client_communications')
      .select('*, profiles:created_by(full_name)')
      .order('created_at', { ascending: false });
    if (data) setComms(data);
  };

  const refreshTickets = async () => {
    const { data } = await supabase
      .from('support_tickets')
      .select('*, clients(name), profiles_created:created_by(full_name), profiles_assigned:assigned_to(full_name)')
      .order('created_at', { ascending: false });
    if (data) setTickets(data);
  };

  const refreshNps = async () => {
    const { data } = await supabase
      .from('nps_responses')
      .select('*, clients(name), profiles:created_by(full_name)')
      .order('created_at', { ascending: false });
    if (data) setNpsList(data);
  };

  // Delete mutators
  const handleDeleteComm = async () => {
    if (!deleteCommId) return;
    try {
      const { error } = await supabase.from('client_communications').delete().eq('id', deleteCommId);
      if (error) throw error;
      toast.success('Communication log deleted');
      refreshComms();
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
      refreshTickets();
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
      refreshNps();
    } catch {
      toast.error('Failed to delete NPS response');
    } finally {
      setDeleteNpsId(null);
    }
  };

  // HTML5 Drag and Drop for Kanban Board
  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    e.dataTransfer.setData('text/plain', ticketId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, status: 'open' | 'in_progress' | 'resolved') => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('text/plain');
    if (!ticketId) return;

    const originalTicket = tickets.find((t) => t.id === ticketId);
    if (!originalTicket) return;

    if (originalTicket.status === status) return;

    // Optimistic update
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status } : t))
    );

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;

      toast.success(`Ticket status updated to ${status}`);
      refreshTickets();
    } catch (err: unknown) {
      console.error('Failed to update ticket status:', err);
      toast.error('Failed to update ticket status');
      refreshTickets();
    }
  };

  // Calculators
  const openTickets = tickets.filter((t) => t.status !== 'resolved');
  const avgNps = npsList.length
    ? (npsList.reduce((acc, curr) => acc + curr.score, 0) / npsList.length).toFixed(1)
    : 'N/A';
  const riskClients = clients.filter((c) => c.health_score <= 70 && !c.is_agency_self);

  return (
    <div className="space-y-6">
      {/* ━━━ OVERVIEW KPI SECTION ━━━ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 select-none">
        {/* KPI 1: Total Communications */}
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-[#4A6480] uppercase tracking-wider font-semibold">Communications</span>
            <span className="text-2xl font-bold font-mono text-[#F0F4FF] block">{comms.length}</span>
            <span className="text-[9px] text-[#8BA3C7] flex items-center gap-1">
              <Phone size={9} /> {comms.filter(c => c.type === 'call').length} calls · <Mail size={9} /> {comms.filter(c => c.type === 'email').length} emails
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#1B4FD8]/10 flex items-center justify-center text-[#1B4FD8]">
            <MessageSquare size={18} />
          </div>
        </div>

        {/* KPI 2: Open Support Tickets */}
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-[#4A6480] uppercase tracking-wider font-semibold">Open Tickets</span>
            <span className="text-2xl font-bold font-mono text-[#F97316] block">{openTickets.length}</span>
            <span className="text-[9px] text-[#8BA3C7] flex items-center gap-1">
              <AlertCircle size={9} /> {tickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved').length} urgent tickets pending
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#F97316]/10 flex items-center justify-center text-[#F97316]">
            <HelpCircle size={18} />
          </div>
        </div>

        {/* KPI 3: Average NPS Score */}
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-[#4A6480] uppercase tracking-wider font-semibold">Average NPS</span>
            <span className="text-2xl font-bold font-mono text-[#22C55E] block">{avgNps} / 10</span>
            <span className="text-[9px] text-[#8BA3C7] flex items-center gap-1">
              <TrendingUp size={9} /> {npsList.filter(n => n.score >= 9).length} promoters total
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E]">
            <TrendingUp size={18} />
          </div>
        </div>

        {/* KPI 4: Churn Risk */}
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-[#4A6480] uppercase tracking-wider font-semibold">Clients at Risk</span>
            <span className="text-2xl font-bold font-mono text-[#EF4444] block">{riskClients.length}</span>
            <span className="text-[9px] text-[#8BA3C7] flex items-center gap-1">
              <HeartPulse size={9} /> Health score under 70%
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#EF4444]/10 flex items-center justify-center text-[#EF4444]">
            <HeartPulse size={18} />
          </div>
        </div>
      </div>

      {/* ━━━ TAB NAVIGATION ━━━ */}
      <div className="bg-[#060D1A] border border-[#1E3352] rounded-[8px] px-4 py-1.5 flex flex-wrap justify-between items-center gap-3 select-none">
        <div className="flex gap-2">
          {[
            { id: 'overview', label: 'Overview', icon: Users },
            { id: 'comms', label: 'Communication Log', icon: MessageSquare },
            { id: 'tickets', label: 'Support Tickets Board', icon: HelpCircle },
            { id: 'nps', label: 'NPS & Feedback', icon: TrendingUp },
            { id: 'risk', label: 'Churn Risk Panel', icon: HeartPulse },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'comms' | 'tickets' | 'nps' | 'risk')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#1B4FD8] text-white'
                    : 'text-[#4A6480] hover:text-[#8BA3C7]'
                }`}
              >
                <Icon size={12} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Global Tab Actions */}
        <div className="flex gap-2">
          {activeTab === 'comms' && (
            <Button
              onClick={() => setCommsModalOpen(true)}
              size="sm"
              className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-8 gap-1.5 cursor-pointer font-semibold"
            >
              <PlusCircle size={13} />
              <span>Log Communication</span>
            </Button>
          )}
          {activeTab === 'tickets' && (
            <Button
              onClick={() => {
                setSelectedTicket(null);
                setTicketModalOpen(true);
              }}
              size="sm"
              className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-8 gap-1.5 cursor-pointer font-semibold"
            >
              <PlusCircle size={13} />
              <span>Raise Ticket</span>
            </Button>
          )}
          {activeTab === 'nps' && (
            <Button
              onClick={() => setNpsModalOpen(true)}
              size="sm"
              className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-8 gap-1.5 cursor-pointer font-semibold"
            >
              <PlusCircle size={13} />
              <span>Record NPS</span>
            </Button>
          )}
        </div>
      </div>

      {/* ━━━ TAB CONTENT ━━━ */}
      <div className="space-y-4">
        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
            {/* Recent Communications Card */}
            <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-[#1E3352] pb-3">
                <h3 className="text-sm font-bold text-[#F0F4FF] flex items-center gap-1.5">
                  <MessageCircle size={16} className="text-[#1B4FD8]" />
                  <span>Recent Communications</span>
                </h3>
                <button
                  onClick={() => setActiveTab('comms')}
                  className="text-[10px] font-bold text-[#4D90FE] hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {comms.slice(0, 5).map((c) => {
                  const client = clients.find((cl) => cl.id === c.client_id);
                  return (
                    <div key={c.id} className="p-3 bg-[#060D1A] border border-[#1E3352] rounded-lg space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-[#8BA3C7]">{client?.name || 'Unknown Client'}</span>
                        <span className="text-[#4A6480]">{formatDate(c.created_at)}</span>
                      </div>
                      <p className="text-xs text-[#F0F4FF] line-clamp-2">{c.body}</p>
                      <div className="flex items-center gap-2 text-[9px] font-semibold">
                        <span className={`px-1.5 py-0.5 rounded uppercase ${
                          c.type === 'call' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
                          c.type === 'whatsapp' ? 'bg-[#10B981]/10 text-[#10B981]' :
                          c.type === 'email' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                        }`}>
                          {c.type}
                        </span>
                        <span className="text-[#4A6480] capitalize">{c.direction}</span>
                      </div>
                    </div>
                  );
                })}
                {comms.length === 0 && (
                  <div className="text-center py-8 text-xs text-[#4A6480] italic">No communication logs recorded yet.</div>
                )}
              </div>
            </div>

            {/* Pending Tickets Card */}
            <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-[#1E3352] pb-3">
                <h3 className="text-sm font-bold text-[#F0F4FF] flex items-center gap-1.5">
                  <AlertCircle size={16} className="text-[#F97316]" />
                  <span>Pending Support Tickets</span>
                </h3>
                <button
                  onClick={() => setActiveTab('tickets')}
                  className="text-[10px] font-bold text-[#4D90FE] hover:underline"
                >
                  Board View
                </button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {openTickets.slice(0, 5).map((t) => {
                  const client = clients.find((cl) => cl.id === t.client_id);
                  const assignee = team.find((p) => p.id === t.assigned_to);
                  return (
                    <div key={t.id} className="p-3 bg-[#060D1A] border border-[#1E3352] rounded-lg space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-[#8BA3C7]">{client?.name || 'Unknown Client'}</span>
                        <span className={`px-1.5 py-0.5 rounded uppercase font-semibold text-[8px] ${
                          t.priority === 'urgent' ? 'bg-[#EF4444]/10 text-[#EF4444]' :
                          t.priority === 'high' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                          t.priority === 'medium' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'bg-[#4B5563]/10 text-[#8BA3C7]'
                        }`}>
                          {t.priority}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-[#F0F4FF]">{t.subject}</h4>
                      <div className="flex justify-between items-center text-[9px] text-[#4A6480]">
                        <span>Assigned: {assignee?.full_name || 'Unassigned'}</span>
                        <span>Opened {formatDate(t.created_at)}</span>
                      </div>
                    </div>
                  );
                })}
                {openTickets.length === 0 && (
                  <div className="text-center py-8 text-xs text-[#4A6480] italic">All support tickets resolved!</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: COMMUNICATIONS LOG */}
        {activeTab === 'comms' && (
          <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 space-y-4 animate-in fade-in duration-200">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-[#4A6480]" />
                <input
                  type="text"
                  placeholder="Search communication text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input h-9 pl-9 text-xs"
                />
              </div>

              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="input h-9 text-xs"
              >
                <option value="">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={commsTypeFilter}
                onChange={(e) => setCommsTypeFilter(e.target.value)}
                className="input h-9 text-xs"
              >
                <option value="">All Channels</option>
                <option value="call">Calls</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Emails</option>
                <option value="note">Notes</option>
              </select>
            </div>

            {/* List */}
            <div className="space-y-3">
              {comms
                .filter((c) => {
                  const client = clients.find((cl) => cl.id === c.client_id);
                  const clientMatches = !clientFilter || c.client_id === clientFilter;
                  const typeMatches = !commsTypeFilter || c.type === commsTypeFilter;
                  const searchMatches =
                    !searchQuery ||
                    c.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    client?.name.toLowerCase().includes(searchQuery.toLowerCase());
                  return clientMatches && typeMatches && searchMatches;
                })
                .map((c) => {
                  const client = clients.find((cl) => cl.id === c.client_id);
                  const creator = team.find((p) => p.id === c.created_by);
                  return (
                    <div key={c.id} className="p-4 bg-[#060D1A] border border-[#1E3352] rounded-[8px] flex justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#F0F4FF]">{client?.name}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            c.type === 'call' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
                            c.type === 'whatsapp' ? 'bg-[#10B981]/10 text-[#10B981]' :
                            c.type === 'email' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                          }`}>
                            {c.type}
                          </span>
                          <span className="text-[9px] text-[#4A6480] capitalize">({c.direction})</span>
                        </div>
                        <p className="text-xs text-[#8BA3C7] leading-relaxed max-w-2xl whitespace-pre-wrap">{c.body}</p>
                        <div className="text-[9px] text-[#4A6480] font-semibold">
                          Logged by: {creator?.full_name || 'System'} on {formatDate(c.created_at)}
                        </div>
                      </div>

                      <button
                        onClick={() => setDeleteCommId(c.id)}
                        className="text-[#4A6480] hover:text-[#EF4444] self-start p-1 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}

              {comms.length === 0 && (
                <div className="text-center py-10 text-xs text-[#4A6480] italic">No matching communication logs.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB: SUPPORT TICKETS BOARD */}
        {activeTab === 'tickets' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
            {/* Columns */}
            {(['open', 'in_progress', 'resolved'] as const).map((status) => {
              const statusTickets = tickets.filter((t) => t.status === status);
              return (
                <div
                  key={status}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status)}
                  className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-4 flex flex-col min-h-[450px] space-y-4"
                >
                  <div className="flex justify-between items-center border-b border-[#1E3352] pb-2">
                    <h3 className="text-xs font-bold text-[#F0F4FF] uppercase tracking-wider flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        status === 'open' ? 'bg-[#EF4444]' :
                        status === 'in_progress' ? 'bg-[#F59E0B]' : 'bg-[#22C55E]'
                      }`} />
                      <span>{status.replace('_', ' ')}</span>
                      <span className="font-mono text-[#8BA3C7]">({statusTickets.length})</span>
                    </h3>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[450px]">
                    {statusTickets.map((t) => {
                      const client = clients.find((cl) => cl.id === t.client_id);
                      const assignee = team.find((p) => p.id === t.assigned_to);
                      return (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, t.id)}
                          className="bg-[#060D1A] border border-[#1E3352] rounded-[8px] p-3 space-y-2 cursor-grab active:cursor-grabbing hover:border-[#4D90FE] transition-colors"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[10px] font-bold text-[#8BA3C7] truncate max-w-[120px]">{client?.name}</span>
                            <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded uppercase ${
                              t.priority === 'urgent' ? 'bg-[#EF4444]/10 text-[#EF4444]' :
                              t.priority === 'high' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                              t.priority === 'medium' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'bg-[#4B5563]/10 text-[#8BA3C7]'
                            }`}>
                              {t.priority}
                            </span>
                          </div>

                          <h4 className="text-xs font-semibold text-[#F0F4FF] leading-snug">{t.subject}</h4>

                          {status === 'resolved' && t.resolution && (
                            <p className="text-[10px] text-[#22C55E] bg-[#22C55E]/5 border border-[#22C55E]/10 rounded p-1.5 italic">
                              Resolved: &quot;{t.resolution}&quot;
                            </p>
                          )}

                          <div className="flex justify-between items-center pt-1 text-[9px] text-[#4A6480] border-t border-[#1E3352]/40">
                            <span className="flex items-center gap-1 font-semibold">
                              <User size={10} />
                              {assignee ? assignee.full_name : 'Unassigned'}
                            </span>
                            <div className="flex items-center gap-1">
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
                      );
                    })}

                    {statusTickets.length === 0 && (
                      <div className="text-center py-12 text-[10px] text-[#4A6480] italic">Drag tickets here.</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB: NPS & FEEDBACK */}
        {activeTab === 'nps' && (
          <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-[#F0F4FF] border-b border-[#1E3352] pb-2">NPS Response History</h3>

            <div className="space-y-3">
              {npsList.map((n) => {
                const client = clients.find((cl) => cl.id === n.client_id);
                return (
                  <div key={n.id} className="p-4 bg-[#060D1A] border border-[#1E3352] rounded-[8px] flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#F0F4FF]">{client?.name}</span>
                        <span className="text-[10px] text-[#4A6480]">{formatDate(n.created_at)}</span>
                      </div>
                      {n.feedback ? (
                        <p className="text-xs text-[#8BA3C7] leading-relaxed italic">&quot;{n.feedback}&quot;</p>
                      ) : (
                        <p className="text-xs text-[#4A6480] italic">No feedback comments submitted.</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-base font-black font-mono w-10 h-10 rounded-full flex items-center justify-center border ${
                        n.score >= 9 ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]' :
                        n.score >= 7 ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]' : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                      }`}>
                        {n.score}
                      </span>
                      <button
                        onClick={() => setDeleteNpsId(n.id)}
                        className="text-[#4A6480] hover:text-[#EF4444] transition-colors p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {npsList.length === 0 && (
                <div className="text-center py-10 text-xs text-[#4A6480] italic">No NPS surveys recorded yet.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CHURN RISK PANEL */}
        {activeTab === 'risk' && (
          <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-[#1E3352] pb-2">
              <h3 className="text-sm font-bold text-[#F0F4FF]">At-Risk Clients</h3>
              <span className="text-[10px] font-semibold text-[#EF4444] bg-[#EF4444]/10 rounded-full px-2.5 py-0.5">
                {riskClients.length} clients flagged
              </span>
            </div>

            <div className="space-y-4">
              {riskClients.map((c) => {
                // Find last communication
                const clientComms = comms.filter((co) => co.client_id === c.id);
                const lastCommDate = clientComms.length ? formatDate(clientComms[0].created_at) : 'Never';

                return (
                  <div key={c.id} className="p-4 bg-[#060D1A] border border-[#1E3352] rounded-[8px] grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-[#F0F4FF]">{c.name}</h4>
                        <a href={`/dashboard/clients/${c.id}`} className="text-[#4D90FE] hover:underline">
                          <ExternalLink size={10} />
                        </a>
                      </div>
                      <span className="text-[10px] text-[#4A6480] block">{c.company || 'Private Business'}</span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] text-[#4A6480] uppercase tracking-wider block font-semibold">Health score</span>
                      <span className={`text-xs font-bold ${
                        c.health_score >= 60 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                      }`}>
                        {c.health_score}% Health
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] text-[#4A6480] uppercase tracking-wider block font-semibold">Last communication</span>
                      <span className="text-xs font-medium text-[#8BA3C7]">
                        {lastCommDate}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-[#4A6480] uppercase tracking-wider block font-semibold">Risk signals</span>
                      <div className="flex flex-wrap gap-1">
                        {c.health_score <= 50 && (
                          <span className="text-[8px] font-bold bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 rounded px-1.5 py-0.5 uppercase">
                            Critical Health
                          </span>
                        )}
                        {clientComms.length === 0 && (
                          <span className="text-[8px] font-bold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 rounded px-1.5 py-0.5 uppercase">
                            No recent comms
                          </span>
                        )}
                        {c.status === 'paused' && (
                          <span className="text-[8px] font-bold bg-[#4B5563]/10 text-[#8BA3C7] border border-[#4B5563]/20 rounded px-1.5 py-0.5 uppercase">
                            Paused Account
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {riskClients.length === 0 && (
                <div className="text-center py-10 text-xs text-[#22C55E] bg-[#22C55E]/5 border border-[#22C55E]/10 rounded-[8px] font-medium flex items-center justify-center gap-1.5">
                  <CheckCircle size={14} />
                  <span>All clients are currently healthy and active!</span>
                </div>
              )}
            </div>
          </div>
        )}
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
        clients={clients}
        onSuccess={refreshComms}
      />

      <TicketModal
        open={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        clients={clients}
        team={team}
        ticket={selectedTicket}
        onSuccess={refreshTickets}
      />

      <NpsModal
        open={npsModalOpen}
        onClose={() => setNpsModalOpen(false)}
        clients={clients}
        onSuccess={() => {
          refreshNps();
          // Reload clients page state if needed
          window.location.reload();
        }}
      />
    </div>
  );
}
export default ClientRelationsDashboard;
