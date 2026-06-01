/* eslint-disable */
'use client';

import React, { useState } from 'react';
import { PageContainer } from '@/components/shared/page-container';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Plus, RefreshCw, FileText, CheckCircle2, AlertCircle, Edit } from 'lucide-react';
import { ContentKanban } from './content-kanban';
import { NewContentModal } from './new-content-modal';
import { ContentDetailDrawer } from './content-detail-drawer';
import { createClient } from '@/lib/supabase/client';
import { Client, ContentItem, Profile } from '@/types';
import { toast } from 'sonner';

interface ContentDashboardProps {
  initialClients: Client[];
  initialItems: ContentItem[];
  initialEmployees: Profile[];
}

export function ContentDashboard({
  initialClients,
  initialItems,
  initialEmployees,
}: ContentDashboardProps) {
  const supabase = createClient();
  const [clients] = useState<Client[]>(initialClients);
  const [employees] = useState<Profile[]>(initialEmployees);
  const [items, setItems] = useState<ContentItem[]>(initialItems);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Modal / Drawer States
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  const refreshData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      toast.error('Failed to reload content items');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (item: ContentItem) => {
    setSelectedItem(item);
    setDetailDrawerOpen(true);
  };

  // Filter the items list
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.keyword?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brief?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClient = selectedClient === 'all' || item.client_id === selectedClient;
    const matchesType = selectedType === 'all' || item.content_type === selectedType;

    return matchesSearch && matchesClient && matchesType;
  });

  // Calculate statistics
  const totalCount = filteredItems.length;
  const ideaCount = filteredItems.filter((i) => i.status === 'idea').length;
  const inProgressCount = filteredItems.filter((i) => i.status === 'writing' || i.status === 'brief').length;
  const reviewCount = filteredItems.filter((i) => i.status === 'review').length;
  const publishedCount = filteredItems.filter((i) => i.status === 'published').length;

  return (
    <PageContainer
      title="Content Department"
      description="Track copywriting pipeline, manage content briefs, track word progress, and run AI generation."
    >
      <div className="space-y-6 select-none">
        {/* 1. Mini Stats Panel */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-[#0D1829] border border-[#1E3352] p-3.5 rounded-lg flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-[#4A6480] tracking-wider block">Total Topics</span>
              <span className="text-xl font-bold font-mono text-[#F0F4FF]">{totalCount}</span>
            </div>
            <FileText size={20} className="text-[#1B4FD8] opacity-75" />
          </div>

          <div className="bg-[#0D1829] border border-[#1E3352] p-3.5 rounded-lg flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-[#4A6480] tracking-wider block">New Ideas</span>
              <span className="text-xl font-bold font-mono text-purple-400">{ideaCount}</span>
            </div>
            <AlertCircle size={20} className="text-purple-500 opacity-75" />
          </div>

          <div className="bg-[#0D1829] border border-[#1E3352] p-3.5 rounded-lg flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-[#4A6480] tracking-wider block">In Progress</span>
              <span className="text-xl font-bold font-mono text-amber-400">{inProgressCount}</span>
            </div>
            <Edit size={20} className="text-amber-500 opacity-75" />
          </div>

          <div className="bg-[#0D1829] border border-[#1E3352] p-3.5 rounded-lg flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-[#4A6480] tracking-wider block">Published / Live</span>
              <span className="text-xl font-bold font-mono text-[#22C55E]">{publishedCount}</span>
            </div>
            <CheckCircle2 size={20} className="text-[#22C55E] opacity-75" />
          </div>
        </div>

        {/* 2. Filters Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-[#0D1829] border border-[#1E3352] p-4 rounded-lg">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8BA3C7] pointer-events-none" />
              <Input
                type="text"
                placeholder="Search keywords or titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
              />
            </div>

            {/* Client Filter */}
            <Select value={selectedClient} onValueChange={(val) => setSelectedClient(val || 'all')}>
              <SelectTrigger className="w-[160px] bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent className="bg-[#0D1829] border-[#1E3352] text-[#F0F4FF]">
                <SelectItem value="all" className="text-xs">All Clients</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.name} {c.is_agency_self && '🏢'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Content Type Filter */}
            <Select value={selectedType} onValueChange={(val) => setSelectedType(val || 'all')}>
              <SelectTrigger className="w-[150px] bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-[#0D1829] border-[#1E3352] text-[#F0F4FF]">
                <SelectItem value="all" className="text-xs">All Types</SelectItem>
                <SelectItem value="blog" className="text-xs">Blog Article</SelectItem>
                <SelectItem value="landing_page" className="text-xs">Landing Page</SelectItem>
                <SelectItem value="case_study" className="text-xs">Case Study</SelectItem>
                <SelectItem value="email" className="text-xs">Email newsletter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={refreshData}
              disabled={loading}
              className="border-[#1E3352] hover:bg-[#132035] text-[#8BA3C7] h-9 w-9 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button
              onClick={() => setAddModalOpen(true)}
              className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-9 cursor-pointer"
            >
              <Plus size={14} className="mr-1" /> Add Content
            </Button>
          </div>
        </div>

        {/* 3. Kanban Board */}
        <div className="overflow-x-auto min-h-[500px]">
          <ContentKanban
            items={filteredItems}
            clients={clients}
            employees={employees}
            onItemUpdated={refreshData}
            onCardClick={handleCardClick}
          />
        </div>
      </div>

      {/* Add Content Modal */}
      <NewContentModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={refreshData}
        clients={clients}
      />

      {/* Details Sheet Drawer */}
      <ContentDetailDrawer
        item={selectedItem}
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
        onSuccess={refreshData}
        clients={clients}
        employees={employees}
      />
    </PageContainer>
  );
}

export default ContentDashboard;
