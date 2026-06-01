import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Styling concatenation helper
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Indian currency formatting (e.g. ₹1,35,000)
export function formatCurrency(amount: number | string): string {
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numeric)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numeric);
}

// Custom date formatter (e.g. 01 Jun 2026)
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

// Relative time-ago formatter (e.g. 2 hours ago)
export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 0) return 'just now';

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
}

// Retrieve custom month/year representation (e.g. Jun 2026)
export function getMonthYear(date?: string | Date | null): string {
  const d = date ? new Date(date) : new Date();
  if (isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${month} ${year}`;
}

// Auto-generate sequential invoice numbers (e.g. VG-2026-007)
export function generateInvoiceNumber(counter: number, year: number): string {
  const paddedCounter = String(counter).padStart(3, '0');
  return `VG-${year}-${paddedCounter}`;
}

// Safe encrypt helper using aes-256-gcm
export function encrypt(text: string): string {
  if (!text) return '';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto');
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

  if (ENCRYPTION_KEY.length !== 32) {
    throw new Error('Encryption key must be exactly 32 characters long');
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

// Safe decrypt helper using aes-256-gcm
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto');
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

  if (ENCRYPTION_KEY.length !== 32) {
    throw new Error('Encryption key must be exactly 32 characters long');
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Format bytes into human-readable representation
export function formatBytes(bytes: number | string | null | undefined): string {
  const numeric = typeof bytes === 'string' ? parseInt(bytes, 10) : Number(bytes);
  if (numeric === null || numeric === undefined || isNaN(numeric) || numeric === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(numeric) / Math.log(k));
  return parseFloat((numeric / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper to get initials from a full name (e.g. Muddassir Ali -> MA)
export function getInitials(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

