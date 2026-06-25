-- Fix employee auth accounts: set instance_id and re-hash passwords with cost factor 10
-- (same as accounts created via Supabase dashboard)

UPDATE auth.users
SET
  instance_id        = '00000000-0000-0000-0000-000000000000',
  encrypted_password = crypt('Welcome@123', gen_salt('bf', 10))
WHERE email IN (
  'bpaul@consultwithprofessionals.com',
  'bharani@consultwithprofessionals.com',
  'divya@consultwithprofessionals.com',
  'ganesh@consultwithprofessionals.com',
  'gokul@consultwithprofessionals.com',
  'kdharshini@consultwithprofessionals.com',
  'manikandan@consultwithprofessionals.com',
  'manoj@consultwithprofessionals.com',
  'meenakshi@consultwithprofessionals.com',
  'mohan@consultwithprofessionals.com',
  'narenethiraj@consultwithprofessionals.com',
  'nilavan@consultwithprofessionals.com',
  'sparathraj@gmail.com',
  'roopesh@consultwithprofessionals.com',
  'spriyanka@consultwithprofessionals.com',
  'smukherjee@consultwithprofessionals.com',
  'subash@consultwithprofessionals.com',
  'vasuthaarini@consultwithprofessionals.com',
  'mohamed@consultwithprofessionals.com'
);

-- Also fix the old @clientflow.local seeded accounts
UPDATE auth.users
SET instance_id = '00000000-0000-0000-0000-000000000000'
WHERE instance_id IS NULL AND email LIKE '%clientflow.local%';
