
-- Delete all manually-inserted employees so GoTrue can recreate them properly
-- Ganesh was already deleted; this covers the remaining 18
DO $$
DECLARE
  emp_emails text[] := ARRAY[
    'bpaul@consultwithprofessionals.com',
    'bharani@consultwithprofessionals.com',
    'divya@consultwithprofessionals.com',
    'gokul@consultwithprofessionals.com',
    'kdharshini@consultwithprofessionals.com',
    'manikandan@consultwithprofessionals.com',
    'manoj@consultwithprofessionals.com',
    'meenakshi@consultwithprofessionals.com',
    'mohamed@consultwithprofessionals.com',
    'mohan@consultwithprofessionals.com',
    'narenethiraj@consultwithprofessionals.com',
    'nilavan@consultwithprofessionals.com',
    'sparathraj@gmail.com',
    'roopesh@consultwithprofessionals.com',
    'spriyanka@consultwithprofessionals.com',
    'smukherjee@consultwithprofessionals.com',
    'subash@consultwithprofessionals.com',
    'vasuthaarini@consultwithprofessionals.com'
  ];
  emp_ids uuid[];
BEGIN
  -- Collect the UUIDs first
  SELECT ARRAY(
    SELECT id FROM auth.users WHERE email = ANY(emp_emails)
  ) INTO emp_ids;

  -- Delete profiles
  DELETE FROM public.profiles WHERE id = ANY(emp_ids);

  -- Delete identities
  DELETE FROM auth.identities WHERE user_id = ANY(emp_ids);

  -- Delete users
  DELETE FROM auth.users WHERE id = ANY(emp_ids);
END $$;
