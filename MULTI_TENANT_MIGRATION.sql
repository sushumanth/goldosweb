-- Multi-tenant migration (safe/idempotent)
-- Run this in Supabase SQL editor.

BEGIN;

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  slug varchar NOT NULL UNIQUE,
  owner_id uuid REFERENCES auth.users(id),
  created_at timestamp without time zone DEFAULT now(),
  website_link text,
  phone_num1 varchar(20),
  phone_num2 varchar(20)
);

-- Compatibility: if a legacy column with a space exists, rename it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tenants'
      AND column_name = 'website link'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tenants'
      AND column_name = 'website_link'
  ) THEN
    EXECUTE 'ALTER TABLE public.tenants RENAME COLUMN "website link" TO website_link';
  END IF;
END
$$;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS website_link text;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS phone_num1 varchar(20),
  ADD COLUMN IF NOT EXISTS phone_num2 varchar(20);

ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS "tenants_website link_key";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenants_website_link_key'
      AND conrelid = 'public.tenants'::regclass
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_website_link_key UNIQUE (website_link);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_tenants_website_link ON public.tenants (website_link);

COMMIT;
