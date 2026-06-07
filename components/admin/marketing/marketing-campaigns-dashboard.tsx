'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Client, EmailCampaign, WhatsappCampaign, MessageTemplate } from '@/types';
import { toast } from 'sonner';
import {
  Mail,
  MessageSquare,
  Calendar,
  Layout,
  PlusCircle,
  Search,
  Filter,
  Trash2,
  Edit2,
  ExternalLink,
  Code,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

// Modals
import { LogEmailCampaignModal } from './modals/log-email-campaign-modal';
import { LogWhatsAppCampaignModal } from './modals/log-whatsapp-campaign-modal';
import { TemplateModal } from './modals/template-modal';

interface MarketingCampaignsDashboardProps {
  clients: Client[];
  initialEmailCampaigns: EmailCampaign[];
  initialWhatsappCampaigns: WhatsappCampaign[];
  initialTemplates: MessageTemplate[];
}

export function MarketingCampaignsDashboard({
  clients,
  initialEmailCampaigns,
  initialWhatsappCampaigns,
  initialTemplates,
}: MarketingCampaignsDashboardProps) {
  const supabase = createClient();

  // State
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>(initialEmailCampaigns);
  const [whatsappCampaigns, setWhatsappCampaigns] = useState<WhatsappCampaign[]>(initialWhatsappCampaigns);
  const [templates, setTemplates] = useState<MessageTemplate[]>(initialTemplates);
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'templates' | 'webhooks'>('overview');

  // Modal Visibility
  const [logEmailOpen, setLogEmailOpen] = useState(false);
  const [logWhatsAppOpen, setLogWhatsAppOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all'); // 'all', 'email', 'whatsapp'

  // Delete Confirmations
  const [deleteEmailId, setDeleteEmailId] = useState<string | null>(null);
  const [deleteWhatsappId, setDeleteWhatsappId] = useState<string | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  // Refresh Handlers
  const refreshEmailCampaigns = async () => {
    const { data } = await supabase
      .from('agency_email_campaigns')
      .select('*, clients(name)')
      .order('created_at', { ascending: false });
    if (data) setEmailCampaigns(data);
  };

  const refreshWhatsappCampaigns = async () => {
    const { data } = await supabase
      .from('agency_whatsapp_campaigns')
      .select('*, clients(name)')
      .order('created_at', { ascending: false });
    if (data) setWhatsappCampaigns(data);
  };

  const refreshTemplates = async () => {
    const { data } = await supabase
      .from('message_templates')
      .select('*')
      .order('name', { ascending: true });
    if (data) setTemplates(data);
  };

  // Delete campaigns/templates
  const handleDeleteEmail = async () => {
    if (!deleteEmailId) return;
    try {
      const { error } = await supabase
        .from('agency_email_campaigns')
        .delete()
        .eq('id', deleteEmailId);

      if (error) throw error;
      toast.success('Email campaign deleted successfully');
      refreshEmailCampaigns();
    } catch {
      toast.error('Failed to delete email campaign');
    } finally {
      setDeleteEmailId(null);
    }
  };

  const handleDeleteWhatsapp = async () => {
    if (!deleteWhatsappId) return;
    try {
      const { error } = await supabase
        .from('agency_whatsapp_campaigns')
        .delete()
        .eq('id', deleteWhatsappId);

      if (error) throw error;
      toast.success('WhatsApp campaign deleted successfully');
      refreshWhatsappCampaigns();
    } catch {
      toast.error('Failed to delete WhatsApp campaign');
    } finally {
      setDeleteWhatsappId(null);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTemplateId) return;
    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', deleteTemplateId);

      if (error) throw error;
      toast.success('Template deleted successfully');
      refreshTemplates();
    } catch {
      toast.error('Failed to delete template');
    } finally {
      setDeleteTemplateId(null);
    }
  };

  // Combined campaigns helper
  const allCampaigns = [
    ...emailCampaigns.map((c) => ({
      ...c,
      channel: 'email' as const,
      recipientCount: c.emails_sent,
      successRate: c.open_rate || 0,
      successLabel: 'Open Rate'
    })),
    ...whatsappCampaigns.map((c) => ({
      ...c,
      channel: 'whatsapp' as const,
      recipientCount: c.messages_sent,
      successRate: c.reply_rate || 0,
      successLabel: 'Reply Rate'
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Filtered campaigns
  const filteredCampaigns = allCampaigns.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.channel === 'email' && c.subject?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesClient = clientFilter === 'all' 
      ? true 
      : clientFilter === 'agency' 
        ? c.client_id === null 
        : c.client_id === clientFilter;
    
    const matchesChannel = channelFilter === 'all' ? true : c.channel === channelFilter;

    return matchesSearch && matchesClient && matchesChannel;
  });

  // Calculate Overview Stats
  const totalEmailsSent = emailCampaigns.reduce((sum, c) => sum + (c.emails_sent || 0), 0);
  const totalEmailsDelivered = emailCampaigns.reduce((sum, c) => sum + (c.delivered || 0), 0);
  const totalEmailsOpened = emailCampaigns.reduce((sum, c) => sum + (c.opened || 0), 0);
  const avgEmailOpenRate = totalEmailsDelivered > 0 
    ? Number(((totalEmailsOpened / totalEmailsDelivered) * 100).toFixed(2)) 
    : 0;

  const totalWASent = whatsappCampaigns.reduce((sum, c) => sum + (c.messages_sent || 0), 0);
  const totalWAReplied = whatsappCampaigns.reduce((sum, c) => sum + (c.replied || 0), 0);
  const avgWAReplyRate = totalWASent > 0 
    ? Number(((totalWAReplied / totalWASent) * 100).toFixed(2)) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-border/30 space-x-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'overview'
              ? 'border-blue-500 text-blue-400 font-bold bg-bg-elevated/45'
              : 'border-transparent text-text-secondary hover:text-white hover:bg-bg-elevated/20'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'campaigns'
              ? 'border-blue-500 text-blue-400 font-bold bg-bg-elevated/45'
              : 'border-transparent text-text-secondary hover:text-white hover:bg-bg-elevated/20'
          }`}
        >
          Campaigns Log
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'templates'
              ? 'border-blue-500 text-blue-400 font-bold bg-bg-elevated/45'
              : 'border-transparent text-text-secondary hover:text-white hover:bg-bg-elevated/20'
          }`}
        >
          Template Library
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'webhooks'
              ? 'border-blue-500 text-blue-400 font-bold bg-bg-elevated/45'
              : 'border-transparent text-text-secondary hover:text-white hover:bg-bg-elevated/20'
          }`}
        >
          Webhooks / API
        </button>
      </div>

      {/* ━━━ TAB CONTENTS ━━━ */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Stat 1 */}
            <div className="bg-bg-card border border-border/30 rounded-lg p-5 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Email Campaigns</span>
                <span className="p-1.5 bg-blue-950 text-blue-400 border border-blue-900 rounded-md">
                  <Mail className="w-4 h-4" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{emailCampaigns.length} logged</h3>
                <p className="text-xs text-text-secondary mt-1">{totalEmailsSent.toLocaleString()} emails sent total</p>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-bg-card border border-border/30 rounded-lg p-5 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Avg Email Open Rate</span>
                <span className="p-1.5 bg-green-950 text-green-400 border border-green-900 rounded-md">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-green-400">{avgEmailOpenRate}%</h3>
                <p className="text-xs text-text-secondary mt-1">Based on Resend Webhooks</p>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-bg-card border border-border/30 rounded-lg p-5 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">WhatsApp Campaigns</span>
                <span className="p-1.5 bg-purple-950 text-purple-400 border border-purple-900 rounded-md">
                  <MessageSquare className="w-4 h-4" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{whatsappCampaigns.length} logged</h3>
                <p className="text-xs text-text-secondary mt-1">{totalWASent.toLocaleString()} messages sent</p>
              </div>
            </div>

            {/* Stat 4 */}
            <div className="bg-bg-card border border-border/30 rounded-lg p-5 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">WA Response Rate</span>
                <span className="p-1.5 bg-yellow-950 text-yellow-400 border border-yellow-900 rounded-md">
                  <BarChart3 className="w-4 h-4" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-yellow-400">{avgWAReplyRate}%</h3>
                <p className="text-xs text-text-secondary mt-1">Avg customer reply rate</p>
              </div>
            </div>
          </div>

          {/* Recent Activity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Latest Campaigns */}
            <div className="bg-bg-card border border-border/30 rounded-lg p-5 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-blue-400" />
                Latest Campaigns
              </h3>
              <div className="divide-y divide-border/50 space-y-3">
                {allCampaigns.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex justify-between items-center pt-3 first:pt-0">
                    <div className="flex items-center space-x-3">
                      <div className={`p-1.5 rounded-md ${
                        c.channel === 'email' ? 'bg-blue-950/70 text-blue-400' : 'bg-purple-950/70 text-purple-400'
                      }`}>
                        {c.channel === 'email' ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{c.name}</h4>
                        <p className="text-xs text-text-secondary">
                          {c.clients?.name || 'Veloxis (Agency Own)'} • {c.month_year}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-text-secondary block">
                        {c.recipientCount} sent
                      </span>
                      <span className={`text-xs ${c.successRate > 30 ? 'text-green-400' : 'text-yellow-500'}`}>
                        {c.successLabel}: {c.successRate}%
                      </span>
                    </div>
                  </div>
                ))}
                {allCampaigns.length === 0 && (
                  <div className="text-sm text-text-muted py-6 text-center">No campaigns logged yet.</div>
                )}
              </div>
            </div>

            {/* Quick Templates Overview */}
            <div className="bg-bg-card border border-border/30 rounded-lg p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white flex items-center">
                  <Layout className="w-4 h-4 mr-2 text-blue-400" />
                  Popular Templates
                </h3>
                <Button
                  onClick={() => setActiveTab('templates')}
                  variant="link"
                  className="text-xs text-blue-400 hover:text-blue-300 p-0 h-auto"
                >
                  View All Templates
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {templates.slice(0, 4).map((t) => (
                  <div key={t.id} className="bg-bg-elevated/45 border border-border/30/70 rounded-md p-3 flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{t.name}</h4>
                      <p className="text-xs text-text-secondary truncate max-w-[280px] font-mono mt-1">
                        {t.body}
                      </p>
                    </div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                      t.type === 'email' ? 'bg-blue-950 text-blue-400' : 'bg-purple-950 text-purple-400'
                    }`}>
                      {t.type}
                    </span>
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="text-sm text-text-muted py-6 text-center">No templates added yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CAMPAIGNS LOG TAB */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg-card border border-border/30 rounded-lg p-4">
            <div className="flex flex-1 flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1 md:flex-none">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  className="w-full bg-bg-elevated border border-border/30 rounded-md pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-text-muted"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Client Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-text-secondary" />
                <select
                  className="bg-bg-elevated border border-border/30 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                >
                  <option value="all">All Clients/Agency</option>
                  <option value="agency">Veloxis (Agency Own)</option>
                  {clients.filter(c => !c.is_agency_self).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Channel Filter */}
              <select
                className="bg-bg-elevated border border-border/30 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
              >
                <option value="all">All Channels</option>
                <option value="email">Email Only</option>
                <option value="whatsapp">WhatsApp Only</option>
              </select>
            </div>

            {/* CTA Buttons */}
            <div className="flex space-x-2">
              <Button
                onClick={() => setLogEmailOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white flex items-center space-x-1"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Log Email</span>
              </Button>
              <Button
                onClick={() => setLogWhatsAppOpen(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white flex items-center space-x-1"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Log WhatsApp</span>
              </Button>
            </div>
          </div>

          {/* Campaigns Data Table */}
          <div className="bg-bg-card border border-border/30 rounded-lg overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/30 text-text-secondary text-xs font-semibold uppercase bg-bg-elevated/20">
                  <th className="py-3.5 px-4">Channel</th>
                  <th className="py-3.5 px-4">Campaign Name</th>
                  <th className="py-3.5 px-4">Target Client</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Volume</th>
                  <th className="py-3.5 px-4">Performance</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm text-text-primary">
                {filteredCampaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-bg-elevated/25 transition-colors">
                    {/* Channel */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded ${
                        c.channel === 'email' ? 'bg-blue-950 text-blue-400' : 'bg-purple-950 text-purple-400'
                      }`}>
                        {c.channel === 'email' ? <Mail className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                        <span className="capitalize">{c.channel}</span>
                      </span>
                    </td>

                    {/* Campaign Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{c.name}</div>
                      {c.channel === 'email' && c.subject && (
                        <div className="text-xs text-text-secondary truncate max-w-[200px]">
                          Subject: {c.subject}
                        </div>
                      )}
                      {c.notes && (
                        <div className="text-xs text-text-secondary/80 truncate max-w-[250px]">
                          {c.notes}
                        </div>
                      )}
                    </td>

                    {/* Client */}
                    <td className="py-3.5 px-4 font-medium">
                      {c.clients?.name || (
                        <span className="text-text-secondary italic">Veloxis (Agency Own)</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-xs font-mono text-text-secondary">
                      {c.month_year}
                    </td>

                    {/* Volume */}
                    <td className="py-3.5 px-4 font-mono font-medium">
                      {c.recipientCount}
                    </td>

                    {/* Performance */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs text-text-secondary">
                        {c.successLabel}: <span className="font-bold text-white">{c.successRate}%</span>
                      </div>
                      {c.channel === 'email' && (
                        <div className="text-[10px] text-text-secondary/70">
                          {c.opened || 0} Open • {c.clicked || 0} Click
                        </div>
                      )}
                      {c.channel === 'whatsapp' && (
                        <div className="text-[10px] text-text-secondary/70">
                          {c.delivered || 0} Deliv • {c.read_count || 0} Read
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        c.status === 'sent' || c.status === 'completed'
                          ? 'bg-green-950 text-green-400 border border-green-900'
                          : c.status === 'active' || c.status === 'scheduled'
                            ? 'bg-blue-950 text-blue-400 border border-blue-900'
                            : 'bg-yellow-950 text-yellow-400 border border-yellow-900'
                      }`}>
                        {c.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          if (c.channel === 'email') {
                            setDeleteEmailId(c.id);
                          } else {
                            setDeleteWhatsappId(c.id);
                          }
                        }}
                        className="text-text-secondary hover:text-red-400 p-1.5 hover:bg-bg-card-hover rounded-md transition-colors"
                        title="Delete log"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCampaigns.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-text-secondary">
                      No campaigns match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TEMPLATE LIBRARY TAB */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-bg-card border border-border/30 rounded-lg p-4">
            <h3 className="text-base font-bold text-white">Reusable Message Templates</h3>
            <Button
              onClick={() => {
                setSelectedTemplate(null);
                setTemplateModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white flex items-center space-x-1"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Template</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((t) => (
              <div
                key={t.id}
                className="bg-bg-card border border-border/30 rounded-lg p-5 flex flex-col justify-between hover:border-blue-500/50 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-base font-bold text-white">{t.name}</h4>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                      t.type === 'email' ? 'bg-blue-950 text-blue-400' : 'bg-purple-950 text-purple-400'
                    }`}>
                      {t.type}
                    </span>
                  </div>

                  {t.type === 'email' && t.subject && (
                    <p className="text-xs text-text-secondary">
                      <span className="font-semibold text-white">Subject:</span> {t.subject}
                    </p>
                  )}

                  <div className="bg-bg-elevated/50 border border-border/30/40 rounded-md p-3 font-mono text-xs text-text-secondary max-h-[120px] overflow-y-auto whitespace-pre-wrap">
                    {t.body}
                  </div>
                </div>

                <div className="flex justify-end items-center space-x-2 border-t border-border/30/50 mt-4 pt-3">
                  <button
                    onClick={() => {
                      setSelectedTemplate(t);
                      setTemplateModalOpen(true);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1 px-2.5 py-1.5 hover:bg-bg-elevated rounded-md transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteTemplateId(t.id)}
                    className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center space-x-1 px-2.5 py-1.5 hover:bg-bg-elevated rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}

            {templates.length === 0 && (
              <div className="col-span-2 bg-bg-card border border-border/30 rounded-lg py-12 text-center text-text-secondary">
                No templates saved yet. Create templates to standardize email and WhatsApp copy.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. WEBHOOKS & INTEGRATIONS INFO */}
      {activeTab === 'webhooks' && (
        <div className="bg-bg-card border border-border/30 rounded-lg p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center">
              <Code className="w-5 h-5 mr-2 text-blue-400" />
              Webhook Integration Guide
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Configure external webhook services to update campaign stats automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Resend Webhook */}
            <div className="space-y-4 bg-bg-elevated/45 border border-border/30/70 rounded-lg p-5">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-blue-950 text-blue-400 border border-blue-900 rounded-md">
                  <Mail className="w-4 h-4" />
                </span>
                <h4 className="text-base font-bold text-white">Resend Event Webhooks</h4>
              </div>
              <p className="text-xs text-text-secondary">
                Configure Resend webhooks to track delivery, open, bounce, and click states on campaign logs.
              </p>
              
              <div className="space-y-2">
                <span className="text-xs font-semibold text-white block">Webhook URL (Vercel Production)</span>
                <div className="bg-bg-card border border-border/30 rounded px-3 py-2 text-xs font-mono text-blue-400 select-all overflow-x-auto flex justify-between items-center">
                  <span>https://ops.veloxisglobal.com/api/webhooks/resend</span>
                  <ExternalLink className="w-3.5 h-3.5 text-text-secondary" />
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-text-secondary">
                <span className="font-semibold text-white block">Supported Webhook Events:</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-bg-card px-2 py-0.5 rounded border border-border/30/50 text-white">email.sent</span>
                  <span className="bg-bg-card px-2 py-0.5 rounded border border-border/30/50 text-white">email.delivered</span>
                  <span className="bg-bg-card px-2 py-0.5 rounded border border-border/30/50 text-white">email.opened</span>
                  <span className="bg-bg-card px-2 py-0.5 rounded border border-border/30/50 text-white">email.clicked</span>
                </div>
              </div>
            </div>

            {/* WhatsApp Webhook */}
            <div className="space-y-4 bg-bg-elevated/45 border border-border/30/70 rounded-lg p-5">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-purple-950 text-purple-400 border border-purple-900 rounded-md">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <h4 className="text-base font-bold text-white">WhatsApp (Meta Cloud API) Webhooks</h4>
              </div>
              <p className="text-xs text-text-secondary">
                Sync campaign status receipts (delivery reports, read counters, customer replies).
              </p>
              
              <div className="space-y-2">
                <span className="text-xs font-semibold text-white block">Callback Webhook URL</span>
                <div className="bg-bg-card border border-border/30 rounded px-3 py-2 text-xs font-mono text-purple-400 select-all overflow-x-auto flex justify-between items-center">
                  <span>https://ops.veloxisglobal.com/api/webhooks/whatsapp</span>
                  <ExternalLink className="w-3.5 h-3.5 text-text-secondary" />
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-text-secondary">
                <span className="font-semibold text-white block">Meta Verification Tokens:</span>
                <p>
                  Verify Token: <code className="bg-bg-card px-1.5 py-0.5 rounded text-white font-mono text-[11px]">WHATSAPP_WEBHOOK_VERIFY_TOKEN</code> in your environment parameters.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ━━━ CONFIRM DIALOGS ━━━ */}
      <ConfirmDialog
        open={deleteEmailId !== null}
        title="Delete Email Campaign Log?"
        description="This will permanently delete this email campaign log and all its metrics. This action is irreversible."
        onClose={() => setDeleteEmailId(null)}
        onConfirm={handleDeleteEmail}
      />

      <ConfirmDialog
        open={deleteWhatsappId !== null}
        title="Delete WhatsApp Campaign Log?"
        description="This will permanently delete this WhatsApp campaign log and all its metrics. This action is irreversible."
        onClose={() => setDeleteWhatsappId(null)}
        onConfirm={handleDeleteWhatsapp}
      />

      <ConfirmDialog
        open={deleteTemplateId !== null}
        title="Delete Template?"
        description="This will permanently delete this message template from the library. You cannot undo this."
        onClose={() => setDeleteTemplateId(null)}
        onConfirm={handleDeleteTemplate}
      />

      {/* ━━━ LOG/CREATE MODALS ━━━ */}
      <LogEmailCampaignModal
        open={logEmailOpen}
        onClose={() => setLogEmailOpen(false)}
        clients={clients}
        onSuccess={refreshEmailCampaigns}
      />

      <LogWhatsAppCampaignModal
        open={logWhatsAppOpen}
        onClose={() => setLogWhatsAppOpen(false)}
        clients={clients}
        onSuccess={refreshWhatsappCampaigns}
      />

      <TemplateModal
        open={templateModalOpen}
        onClose={() => {
          setTemplateModalOpen(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        onSuccess={refreshTemplates}
      />
    </div>
  );
}
