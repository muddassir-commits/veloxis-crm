/* eslint-disable */
'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate, getInitials } from '@/lib/utils';
import { PostWithClient } from './social-dashboard';

interface SocialListViewProps {
  posts: PostWithClient[];
  onSelectPost: (post: PostWithClient) => void;
  onEditPost: (post: PostWithClient) => void;
  onDeletePost: (post: PostWithClient) => void;
}

export function SocialListView({
  posts,
  onSelectPost,
  onEditPost,
  onDeletePost
}: SocialListViewProps) {
  return (
    <div className="bg-[#0D1829] border border-[#1E3352] rounded-lg overflow-hidden select-none">
      {posts.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#8BA3C7] space-y-2">
          <p className="font-semibold text-slate-500">No scheduled posts found</p>
          <p className="text-[10px] text-[#4A6480]">Try selecting a different client or schedule a new post.</p>
        </div>
      ) : (
        <Table>
          <TableHeader className="bg-[#060D1A]/50">
            <TableRow className="border-b border-[#1E3352] hover:bg-transparent">
              <TableHead className="text-[10px] font-bold text-[#4A6480] uppercase tracking-wider pl-4">Client</TableHead>
              <TableHead className="text-[10px] font-bold text-[#4A6480] uppercase tracking-wider">Platform</TableHead>
              <TableHead className="text-[10px] font-bold text-[#4A6480] uppercase tracking-wider">Type</TableHead>
              <TableHead className="text-[10px] font-bold text-[#4A6480] uppercase tracking-wider">Caption Copy</TableHead>
              <TableHead className="text-[10px] font-bold text-[#4A6480] uppercase tracking-wider">Scheduled Date</TableHead>
              <TableHead className="text-[10px] font-bold text-[#4A6480] uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-[10px] font-bold text-[#4A6480] uppercase tracking-wider">Assignee</TableHead>
              <TableHead className="text-[10px] font-bold text-[#4A6480] uppercase tracking-wider text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {posts.map((post) => (
              <TableRow key={post.id} className="border-b border-[#1E3352]/50 hover:bg-[#132035]/30">
                <TableCell className="pl-4 font-bold text-[#F0F4FF]">
                  {post.clients?.name} {post.clients?.is_agency_self && '🏢'}
                </TableCell>
                <TableCell className="capitalize text-[#8BA3C7] font-medium">
                  {post.platform}
                </TableCell>
                <TableCell className="capitalize text-[#8BA3C7]">
                  {post.content_type || 'Post'}
                </TableCell>
                <TableCell className="text-[#8BA3C7] max-w-[200px] truncate">
                  {post.caption || <span className="text-[#4A6480] italic">No caption copy</span>}
                </TableCell>
                <TableCell className="font-mono text-[#8BA3C7]">
                  {post.scheduled_for ? formatDate(post.scheduled_for) : '—'}
                </TableCell>
                <TableCell>
                  <StatusBadge status={post.status} />
                </TableCell>
                <TableCell>
                  {post.profiles?.full_name ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-[#1B4FD8] flex items-center justify-center text-[9px] font-bold text-white uppercase shrink-0">
                        {getInitials(post.profiles.full_name)}
                      </div>
                      <span className="text-[#8BA3C7] text-[11px] truncate max-w-[80px]">
                        {post.profiles.full_name.split(' ')[0]}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[#4A6480] italic text-[10px]">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="text-right pr-4">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onSelectPost(post)}
                      className="h-7 w-7 rounded hover:bg-[#1A2D47] text-[#8BA3C7] hover:text-[#F0F4FF] transition-colors"
                      title="View Details"
                    >
                      <Eye size={12} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onEditPost(post)}
                      className="h-7 w-7 rounded hover:bg-[#1A2D47] text-[#8BA3C7] hover:text-[#F0F4FF] transition-colors"
                      title="Edit Post"
                    >
                      <Edit size={12} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDeletePost(post)}
                      className="h-7 w-7 rounded hover:bg-rose-950/30 text-[#4A6480] hover:text-rose-400 transition-colors"
                      title="Delete Post"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
export default SocialListView;
