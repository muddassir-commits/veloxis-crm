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
    // Log the error to console/analytics
    console.error('Admin Portal Error Boundary caught:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-6">
      <div className="bg-bg-darker border border-border rounded-lg p-8 max-w-md w-full shadow-sm text-center space-y-5">
        <div className="w-12 h-12 bg-error/10 border border-error/20 text-error rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1.5 select-none">
          <h2 className="text-lg font-bold text-white">Something Went Wrong</h2>
          <p className="text-xs text-text-muted leading-relaxed">
            An unexpected error occurred in your administration workspace. The system has automatically logged this event.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={() => reset()}
            className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try Again
          </Button>
          <Link href="/dashboard" passHref legacyBehavior>
            <Button
              variant="outline"
              className="border-border bg-bg-darker hover:bg-border/20 text-white text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
            >
              <Home className="h-3.5 w-3.5 text-text-muted" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
