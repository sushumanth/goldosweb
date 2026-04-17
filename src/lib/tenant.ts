import { supabase } from '@/lib/supabase';

type TenantRow = Record<string, unknown>;

export type TenantIdentity = {
  id: string;
  name: string | null;
  slug: string | null;
  websiteLink: string | null;
  phoneNum1: string | null;
  phoneNum2: string | null;
};

let tenantPromise: Promise<TenantIdentity> | null = null;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeHostname(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    const hostname = parsed.hostname.trim().toLowerCase().replace(/^www\./, '');
    return hostname || null;
  } catch {
    const withoutProtocol = trimmed.replace(/^[a-z][a-z\d+.-]*:\/\//i, '');
    const hostAndPort = withoutProtocol.split('/')[0]?.trim() ?? '';
    const hostname = hostAndPort.split(':')[0]?.trim().toLowerCase().replace(/^www\./, '') ?? '';
    return hostname || null;
  }
}

function getTenantWebsiteLink(row: TenantRow): string | null {
  return asNonEmptyString(row.website_link)
    ?? asNonEmptyString(row['website link'])
    ?? null;
}

function mapTenant(row: TenantRow): TenantIdentity | null {
  const id = asNonEmptyString(row.id);
  if (!id) {
    return null;
  }

  return {
    id,
    name: asNonEmptyString(row.name),
    slug: asNonEmptyString(row.slug),
    websiteLink: getTenantWebsiteLink(row),
    phoneNum1: asNonEmptyString(row.phone_num1),
    phoneNum2: asNonEmptyString(row.phone_num2),
  };
}

function getHostCandidates(): string[] {
  const hostValues: string[] = [];

  if (typeof window !== 'undefined') {
    hostValues.push(window.location.hostname, window.location.host, window.location.origin);
  }

  const envWebsite = asNonEmptyString(import.meta.env.VITE_TENANT_WEBSITE);
  if (envWebsite) {
    hostValues.push(envWebsite);
  }

  return Array.from(
    new Set(
      hostValues
        .map((value) => normalizeHostname(value))
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function getSlugCandidateFromHost(hostname: string | null): string | null {
  if (!hostname || hostname === 'localhost') {
    return null;
  }

  const parts = hostname.split('.').filter(Boolean);
  if (parts.length < 3) {
    return null;
  }

  const candidate = parts[0]?.trim().toLowerCase();
  if (!candidate || candidate === 'www') {
    return null;
  }

  return candidate;
}

async function resolveTenant(): Promise<TenantIdentity> {
  const hostCandidates = getHostCandidates();
  const primaryHost = hostCandidates[0] ?? null;
  const hostSlugCandidate = getSlugCandidateFromHost(primaryHost);
  const envSlug = asNonEmptyString(import.meta.env.VITE_TENANT_SLUG)?.toLowerCase() ?? null;

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: true, nullsFirst: true })
    .limit(500);

  if (error) {
    throw error;
  }

  const tenants = (data ?? []) as TenantRow[];

  if (tenants.length === 0) {
    throw new Error('No tenants are configured in the database.');
  }

  const hostMatches = tenants.find((tenant) => {
    const websiteLink = getTenantWebsiteLink(tenant);
    const normalizedWebsiteHost = websiteLink ? normalizeHostname(websiteLink) : null;

    return Boolean(normalizedWebsiteHost && hostCandidates.includes(normalizedWebsiteHost));
  });

  if (hostMatches) {
    const mapped = mapTenant(hostMatches);
    if (mapped) {
      return mapped;
    }
  }

  const slugCandidate = envSlug ?? hostSlugCandidate;
  if (slugCandidate) {
    const slugMatch = tenants.find((tenant) => {
      const slug = asNonEmptyString(tenant.slug)?.toLowerCase();
      return slug === slugCandidate;
    });

    if (slugMatch) {
      const mapped = mapTenant(slugMatch);
      if (mapped) {
        return mapped;
      }
    }
  }

  // Testing fallback: use the next tenant (second row), then fall back to the first.
  const testingFallbackTenant = mapTenant(tenants[1] ?? tenants[0]);
  if (testingFallbackTenant) {
    return testingFallbackTenant;
  }

  const hostInfo = hostCandidates.join(', ') || 'unknown host';
  throw new Error(`Unable to resolve tenant for host: ${hostInfo}. Configure tenants.website_link (or "website link") for this domain.`);
}

export async function getCurrentTenant(): Promise<TenantIdentity> {
  if (!tenantPromise) {
    tenantPromise = resolveTenant().catch((error) => {
      tenantPromise = null;
      throw error;
    });
  }

  return tenantPromise;
}

export async function getCurrentTenantId(): Promise<string> {
  const tenant = await getCurrentTenant();
  return tenant.id;
}

export function getTenantStorageNamespace(): string {
  const explicit = asNonEmptyString(import.meta.env.VITE_TENANT_STORAGE_KEY);
  if (explicit) {
    return explicit;
  }

  if (typeof window !== 'undefined') {
    const normalizedHost = normalizeHostname(window.location.hostname);
    if (normalizedHost) {
      return normalizedHost;
    }
  }

  return 'default';
}

export function resetTenantCache() {
  tenantPromise = null;
}
