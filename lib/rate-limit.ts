import { createAdminClient } from './supabase/admin';

export async function checkRateLimit(
  ip: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  try {
    const supabase = createAdminClient();
    
    // Call database-backed rate limiter RPC
    // windowMs is in milliseconds, RPC expects window in seconds
    const windowSeconds = Math.ceil(windowMs / 1000);
    
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: ip,
      p_limit: limit,
      p_window_seconds: windowSeconds
    });
    
    if (error || !data) {
      console.error('Database rate limiter error, falling back to allow:', error);
      return { success: true, limit, remaining: 1, reset: Date.now() + windowMs };
    }
    
    return {
      success: !!data.success,
      limit: Number(data.limit || limit),
      remaining: Number(data.remaining ?? 0),
      reset: Number(data.reset || (Date.now() + windowMs))
    };
  } catch (err) {
    console.error('Rate limiter exception, falling back to allow:', err);
    return { success: true, limit, remaining: 1, reset: Date.now() + windowMs };
  }
}

