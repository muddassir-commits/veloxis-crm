/* eslint-disable */
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle2, MessageSquare, ExternalLink, Calendar, User, RefreshCw } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { PostWithClient } from './social-dashboard';

interface SocialReviewQueueProps {
  posts: PostWithClient[];
  onRefresh: () => void;
}

export function SocialReviewQueue({ posts, onRefresh }: SocialReviewQueueProps) {
  const supabase = createClient();
  const [selectedPost, setSelectedPost] = useState<PostWithClient | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComments, setRejectComments] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApprove = async (post: PostWithClient) => {
    try {
      const nextStatus = post.scheduled_for ? 'scheduled' : 'approved';
      const { error } = await supabase
        .from('social_posts')
        .update({
          status: nextStatus,
          // Clear any old rejection comments
          reach: null, // Let's keep it clean
        })
        .eq('id', post.id);

      if (error) throw error;

      toast.success(`Post approved & set to ${nextStatus}!`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve post');
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('social_posts')
        .update({
          status: 'draft',
          caption: `${selectedPost.caption}\n\n[Revision Request: ${rejectComments}]`
        })
        .eq('id', selectedPost.id);

      if (error) throw error;

      toast.success('Changes requested. Post returned to Draft.');
      setRejectOpen(false);
      setRejectComments('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit changes request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 select-none">
      {posts.length === 0 ? (
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-lg p-12 text-center text-xs text-[#8BA3C7] space-y-2">
          <p className="font-semibold text-slate-500">Review queue is empty</p>
          <p className="text-[10px] text-[#4A6480]">No student post submissions are currently pending approval.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-[#0D1829] border border-[#1E3352] rounded-lg p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-[#F0F4FF]">
                      {post.clients?.name} {post.clients?.is_agency_self && '🏢'}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-[#1B4FD8]/15 text-[#4D90FE] border border-[#1B4FD8]/20">
                        {post.platform}
                      </span>
                      <span className="text-[9px] text-[#8BA3C7] capitalize">{post.content_type || 'Post'}</span>
                    </div>
                  </div>

                  {post.profiles?.full_name && (
                    <span className="text-[9px] text-[#8BA3C7] flex items-center gap-1 font-semibold bg-[#132035] px-2 py-0.5 rounded">
                      <User size={10} className="text-[#1B4FD8]" /> {post.profiles.full_name.split(' ')[0]}
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#8BA3C7] leading-relaxed line-clamp-3 bg-[#060D1A]/50 p-2.5 rounded border border-[#1E3352]/40 italic">
                  {post.caption || <span className="text-[#4A6480]">No caption copy set</span>}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#1E3352]/40">
                <div className="flex items-center gap-1 text-[10px] text-[#8BA3C7]">
                  <Calendar size={12} className="text-[#4A6480]" />
                  <span>{post.scheduled_for ? formatDate(post.scheduled_for) : 'No date set'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedPost(post);
                      setRejectOpen(true);
                    }}
                    className="border-[#EF4444]/30 hover:bg-[#EF4444]/10 text-[#EF4444] text-[10px] h-7 px-2.5 font-bold"
                  >
                    <MessageSquare size={10} className="mr-1.5" /> Request Changes
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(post)}
                    className="bg-[#22C55E] hover:bg-[#16A34A] text-white text-[10px] h-7 px-2.5 font-bold"
                  >
                    <CheckCircle2 size={10} className="mr-1.5" /> Approve
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject/Request Changes Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#F0F4FF]">Request Post Changes</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRejectSubmit} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-[#8BA3C7] text-[11px] font-medium">Rejection / Revision Instructions</Label>
              <Textarea
                required
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                placeholder="Detail what needs to be changed in the creative design or caption copy..."
                className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs min-h-[90px]"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectOpen(false)}
                className="border-[#1E3352] hover:bg-[#132035] text-[#8BA3C7] text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs h-8"
              >
                {loading ? 'Submitting...' : 'Send Back'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default SocialReviewQueue;
