-- Seed real employee credentials
-- Password: Welcome@123 for all accounts
-- subashkanagamani3107@gmail.com -> admin role; everyone else -> employee

DO $$
DECLARE
  v_emails text[] := ARRAY[
    'subashkanagamani3107@gmail.com',
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
  ];
  v_names text[] := ARRAY[
    'Subash Kanagamani',
    'B Paul',
    'Bharani',
    'Divya',
    'Ganesh',
    'Gokul',
    'K Dharshini',
    'Manikandan',
    'Manoj',
    'Meenakshi',
    'Mohan',
    'Narenethiraj',
    'Nilavan',
    'S Parath Raj',
    'Roopesh',
    'S Priyanka',
    'S Mukherjee',
    'Subash',
    'Vasuthaarini',
    'Mohamed'
  ];
  v_email text;
  v_name  text;
  v_uid   uuid;
  v_role  text;
  i       int;
BEGIN
  FOR i IN 1..array_length(v_emails, 1) LOOP
    v_email := v_emails[i];
    v_name  := v_names[i];
    v_role  := CASE WHEN v_email = 'subashkanagamani3107@gmail.com' THEN 'admin' ELSE 'employee' END;

    -- Skip if auth user already exists
    SELECT id INTO v_uid FROM auth.users WHERE email = v_email LIMIT 1;

    IF v_uid IS NULL THEN
      v_uid := gen_random_uuid();

      INSERT INTO auth.users (
        id, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        aud, role
      ) VALUES (
        v_uid, v_email, crypt('Welcome@123', gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', v_name),
        'authenticated', 'authenticated'
      );

      -- Create identity so login works
      INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      VALUES (
        v_uid::text, v_uid,
        jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true, 'provider', 'email'),
        'email', now(), now(), now()
      ) ON CONFLICT DO NOTHING;
    END IF;

    -- Upsert profile
    INSERT INTO public.profiles (user_id, email, full_name, role, status)
    VALUES (v_uid, v_email, v_name, v_role, 'active')
    ON CONFLICT (user_id) DO UPDATE
      SET role      = EXCLUDED.role,
          email     = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          status    = 'active';

  END LOOP;
END $$;
