-- Insert missing auth.identities records for all seeded employee accounts
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT
  au.id::text,
  au.id,
  jsonb_build_object(
    'sub', au.id::text,
    'email', au.email,
    'email_verified', true,
    'provider', 'email'
  ),
  'email',
  now(),
  now(),
  now()
FROM auth.users au
WHERE au.email LIKE '%clientflow.local%'
ON CONFLICT DO NOTHING;
