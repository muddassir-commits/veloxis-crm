import { Resend } from 'resend';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
  }>;
}

/**
 * Shared utility to send emails via Resend.
 * Supports a global safety redirect to prevent accidental emails to real clients during testing.
 * 
 * CRITICAL PRODUCTION SAFETY WARNING:
 * The environment variable `TEST_EMAIL_REDIRECT` MUST remain empty/unset in production (e.g. Vercel env settings)
 * so that real clients receive reports, invoices, and invites. It should only be set in local/development configs.
 */
export async function sendEmail({
  to,
  subject,
  html,
  from,
  attachments,
}: SendEmailParams) {
  const resendKey = process.env.RESEND_API_KEY || '';
  const isMockResend = !resendKey || resendKey.startsWith('re_your_');
  
  // Safety Guard: Check if redirect address is configured for local testing/staging checks
  const redirectAddress = process.env.TEST_EMAIL_REDIRECT;
  
  let finalTo = Array.isArray(to) ? to : [to];
  let finalSubject = subject;

  if (redirectAddress) {
    // Override recipient and tag the subject line to prevent sending to production contacts
    finalTo = [redirectAddress];
    finalSubject = `[TEST] ${subject} (Originally to: ${Array.isArray(to) ? to.join(', ') : to})`;
  }

  // 1. Mock Mode (used if Resend key is missing or is dummy/mock key)
  if (isMockResend) {
    console.log(`[MOCK EMAIL] To: ${finalTo.join(', ')} | Subject: ${finalSubject}`);
    return { success: true, id: 'mock_id' };
  }

  // 2. Real Send via Resend client
  const resend = new Resend(resendKey);
  const { data, error } = await resend.emails.send({
    from: from || `${process.env.RESEND_FROM_NAME || 'Veloxis Global'} <${process.env.RESEND_FROM_EMAIL || 'ops@veloxisglobal.com'}>`,
    to: finalTo,
    subject: finalSubject,
    html,
    attachments,
  });

  if (error) {
    throw new Error(`Resend Error: ${error.message}`);
  }

  return { success: true, id: data?.id };
}
