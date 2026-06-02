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
    console.error('Employee Portal Error Boundary caught:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-6">
      <div className="bg-[#0D1829] border border-[#1E3352] rounded-lg p-8 max-w-md w-full shadow-sm text-center space-y-5">
        <div className="w-12 h-12 bg-[#EF444415] border border-[#EF444430] text-[#EF4444] rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1.5 select-none">
          <h2 className="text-lg font-bold text-white">Something Went Wrong</h2>
          <p className="text-xs text-[#8BA3C7] leading-relaxed">
            An unexpected error occurred in your employee portal workspace. Try resetting the cache or go home.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={() => reset()}
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try Again
          </Button>
          <Link href="/team" passHref legacyBehavior>
            <Button
              variant="outline"
              className="border-[#1E3352] bg-[#0D1829] hover:bg-[#1E335230] text-white text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
            >
              <Home className="h-3.5 w-3.5 text-[#4B6B94]" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
