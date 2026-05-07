/**
 * Thin wrapper around the `send-sms` Edge Function. Keeps Semaphore/HTTP
 * details out of components and centralises error handling.
 */
import { supabase } from '@/integrations/supabase/client';

export type OtpPurpose = 'registration' | 'phone_change' | 'password_reset';

export interface OtpResponse {
  ok: boolean;
  error?: string;
  expiresAt?: string;
}

async function call(action: string, body: Record<string, unknown>): Promise<OtpResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: { action, ...body },
    });
    if (error) {
      // Try to surface the JSON error payload Supabase wraps for non-2xx.
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        try {
          const parsed = await ctx.json();
          return { ok: false, error: parsed?.error || error.message };
        } catch {/* fall through */}
      }
      return { ok: false, error: error.message || 'SMS service unavailable' };
    }
    return (data as OtpResponse) || { ok: false, error: 'No response from SMS service' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { ok: false, error: msg };
  }
}

export const smsAPI = {
  /** Send a 6-digit OTP via Semaphore. Code valid 5 minutes. */
  sendOtp(phone: string, purpose: OtpPurpose = 'registration') {
    return call('send_otp', { phone, purpose });
  },
  /** Verify the OTP. Marks it consumed on success. */
  verifyOtp(phone: string, code: string, purpose: OtpPurpose = 'registration') {
    return call('verify_otp', { phone, code, purpose });
  },
  /**
   * Fire-and-forget appointment / lifecycle SMS. Failures are logged but
   * never thrown so they cannot block the booking flow.
   */
  async sendNotification(phone: string, message: string): Promise<void> {
    if (!phone) return;
    try {
      await supabase.functions.invoke('send-sms', {
        body: { action: 'send_message', phone, message },
      });
    } catch (err) {
      console.warn('SMS notification failed:', err);
    }
  },
};
