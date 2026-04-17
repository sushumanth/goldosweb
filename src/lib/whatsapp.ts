import { getCurrentTenant, getTenantStorageNamespace } from '@/lib/tenant';

const ROUND_ROBIN_KEY_PREFIX = 'tenant_whatsapp_rr:';

function asNonEmptyString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeWhatsappNumber(value: string | null | undefined): string | null {
  const normalized = asNonEmptyString(value)?.replace(/[^\d]/g, '') ?? '';
  return normalized.length > 0 ? normalized : null;
}

function getFallbackWhatsappNumbers(): string[] {
  const fromEnv = normalizeWhatsappNumber(import.meta.env.VITE_WHATSAPP_NUMBER);
  return fromEnv ? [fromEnv] : [];
}

export async function getTenantWhatsappNumbers(): Promise<string[]> {
  const tenant = await getCurrentTenant();

  const numbers = [tenant.phoneNum1, tenant.phoneNum2]
    .map((value) => normalizeWhatsappNumber(value))
    .filter((value): value is string => Boolean(value));

  if (numbers.length > 0) {
    return Array.from(new Set(numbers));
  }

  return getFallbackWhatsappNumbers();
}

export function pickTenantWhatsappNumber(numbers: string[]): string | null {
  if (numbers.length === 0) {
    return null;
  }

  if (numbers.length === 1 || typeof window === 'undefined') {
    return numbers[0] ?? null;
  }

  const key = `${ROUND_ROBIN_KEY_PREFIX}${getTenantStorageNamespace()}`;

  let currentIndex = 0;
  try {
    const stored = window.localStorage.getItem(key);
    const parsed = Number.parseInt(stored ?? '0', 10);
    currentIndex = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    currentIndex = 0;
  }

  const selectedIndex = currentIndex % numbers.length;

  try {
    window.localStorage.setItem(key, String(currentIndex + 1));
  } catch {
    // Ignore storage write failures and continue with current pick.
  }

  return numbers[selectedIndex] ?? numbers[0] ?? null;
}

export function buildWhatsappHref(phoneNumber: string, message: string): string {
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}

export async function buildTenantWhatsappHref(message: string): Promise<string | null> {
  const numbers = await getTenantWhatsappNumbers();
  const phoneNumber = pickTenantWhatsappNumber(numbers);

  if (!phoneNumber) {
    return null;
  }

  return buildWhatsappHref(phoneNumber, message);
}
