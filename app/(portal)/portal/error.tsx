'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Client Portal Error Boundary caught:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-6 theme-light bg-[#F8FAFF]">
      <div className="bg-white border border-[#E2E8F4] rounded-[10px] p-8 max-w-md w-full shadow-sm text-center space-y-5">
        <div className="w-12 h-12 bg-amber-50 border border-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1.5 select-none text-[#0A1628]">
          <h2 className="text-lg font-bold">Something Went Wrong</h2>
          <p className="text-xs text-[#475569] leading-relaxed">
            An unexpected error occurred in your client portal workspace. Please try again or contact support if the issue persists.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={() => reset()}
            className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try Again
          </Button>
          <Link href="/portal" passHref legacyBehavior>
            <Button
              variant="outline"
              className="border-[#E2E8F4] bg-white hover:bg-slate-50 text-[#0A1628] text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
            >
              <Home className="h-3.5 w-3.5 text-[#475569]" />
              Go Portal
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
