'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const emailInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus email input on mount
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 1. Authenticate user credentials
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        setErrorMsg('Invalid email or password');
        setIsLoading(false);
        return;
      }

      // 2. Fetch user profile to retrieve role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        setErrorMsg('User profile configuration error. Access denied.');
        setIsLoading(false);
        return;
      }

      const role = profile.role;

      // 3. Role-based redirects
      if (role === 'admin') {
        router.push('/dashboard');
      } else if (role === 'employee') {
        router.push('/team');
      } else if (role === 'client') {
        router.push('/portal');
      } else {
        setErrorMsg('Unauthorized role category.');
        setIsLoading(false);
      }
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#060D1A] px-4 py-12">
      <div className="w-full max-w-[400px] rounded-xl border border-[#1E3352] bg-[#0D1829] p-8 shadow-2xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center text-2xl font-bold tracking-tight">
            <span className="text-[#1B4FD8]">Veloxis</span>
            <span className="text-[#F97316]">Global</span>
          </div>
          
          <Badge className="mt-2 bg-[#1B4FD820] text-[#4D90FE] hover:bg-[#1B4FD830] border border-[#1E3352] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            CRM
          </Badge>
          
          <span className="mt-3 text-[13px] font-medium text-[#8BA3C7] tracking-wide">
            Operations Hub
          </span>
        </div>

        {/* Separator */}
        <hr className="my-6 border-[#1E3352]" />

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold text-[#8BA3C7] uppercase tracking-wider">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              ref={emailInputRef}
              disabled={isLoading}
              required
              placeholder="name@veloxisglobal.com"
              className="h-10 border-[#1E3352] bg-[#060D1A] text-[#F0F4FF] placeholder-[#4A6480] focus:border-[#1B4FD8] focus:ring-1 focus:ring-[#1B4FD8]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold text-[#8BA3C7] uppercase tracking-wider">
                Password
              </Label>
              <a href="#" className="text-xs font-medium text-[#4D90FE] hover:underline hover:text-[#2563EB]">
                Forgot password?
              </a>
            </div>
            
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                placeholder="••••••••"
                className="h-10 pr-10 border-[#1E3352] bg-[#060D1A] text-[#F0F4FF] placeholder-[#4A6480] focus:border-[#1B4FD8] focus:ring-1 focus:ring-[#1B4FD8]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#4A6480] hover:text-[#8BA3C7] focus:outline-none"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Inline Error Message */}
          {errorMsg && (
            <div className="rounded-md bg-[#EF444415] border border-[#EF444430] p-3 text-center text-xs font-medium text-[#EF4444]">
              {errorMsg}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 bg-[#1B4FD8] font-semibold text-white hover:bg-[#2563EB] focus:ring-2 focus:ring-[#1B4FD8] focus:ring-offset-2 focus:ring-offset-[#0D1829] active:scale-[0.98] transition-transform"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Signing In...
              </span>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}
