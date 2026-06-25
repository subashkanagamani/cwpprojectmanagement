
-- Remap all employee data from old @clientflow.local profile IDs
-- to the new real employee profile IDs (created via GoTrue).
-- Mapping derived by matching full_name between old and new profiles.

DO $$
DECLARE
  pairs uuid[][] := ARRAY[
    -- old_id, new_id  (matched by name)
    ARRAY['564d1e7e-39e6-4681-aafe-7616773c78ef'::uuid, '2b4cca57-24f6-4dd7-b2c2-37e81d4a25b0'::uuid],  -- Bharani
    ARRAY['0cc8e55d-9b4e-49c8-9bf4-e590e96ec4d4'::uuid, '48e61707-375a-4cd3-80ec-249b38c4fe9f'::uuid],  -- Divya
    ARRAY['0a7da3c6-8c44-4b99-9eeb-989c5c1cd049'::uuid, '9336feaf-1902-4f0c-b732-35577c18bad5'::uuid],  -- Ganesh
    ARRAY['b122ccca-0a0f-4a03-aeb7-91734823e416'::uuid, 'e4a2c31f-82ee-48eb-978b-8b382dd9bf07'::uuid],  -- Gokul
    ARRAY['fb21fc57-c832-4f5b-ac0c-51226e455617'::uuid, '8684c9bc-edf8-4012-bbe9-b08eab247be5'::uuid],  -- Manikandan
    ARRAY['84099125-1735-4e2e-a288-a4ddf1baaf9e'::uuid, '6b900df2-2c9d-4d9f-ba08-586adc198120'::uuid],  -- Manoj
    ARRAY['e7a7da01-d859-4664-b2b5-104f27a70805'::uuid, 'f86e79bc-0eef-41f0-a54b-213db5bd7882'::uuid],  -- Meenakshi
    ARRAY['b7c83e60-79a8-492f-acd2-da0ef5f48986'::uuid, 'dd122b14-90f1-42e3-926e-940814313c87'::uuid],  -- Mohan
    ARRAY['adec519a-3810-49ad-83a0-1700e1dc0cea'::uuid, '33de8802-8e39-41d7-b1ca-f011519deb8b'::uuid],  -- Naren -> Narenethiraj
    ARRAY['ed8e2ab9-2af4-4a29-b13d-9bcbcedb3091'::uuid, '51fcb823-7205-44aa-ad47-17180439b1ae'::uuid],  -- Nilavan
    ARRAY['7441df7e-abf3-44c9-9775-14447cfca52f'::uuid, 'e8507430-2b9f-4199-ab03-461f13180bc3'::uuid],  -- Roopesh
    ARRAY['8c490ea8-7641-4120-86b5-42bc4ca48169'::uuid, 'b82ae06b-c6d6-4720-82cd-1c04b6bea020'::uuid],  -- Subash (employee, not admin)
    ARRAY['ca851d6e-47b4-41b5-903a-6d0e003a3ae8'::uuid, '97d4e7ed-2585-44c8-949a-291493c74b7b'::uuid]   -- Vasu -> Vasuthaarini
  ];
  pair uuid[];
  old_id uuid;
  new_id uuid;
BEGIN
  FOREACH pair SLICE 1 IN ARRAY pairs
  LOOP
    old_id := pair[1];
    new_id := pair[2];

    UPDATE client_assignments      SET employee_id  = new_id WHERE employee_id  = old_id;
    UPDATE client_notes            SET employee_id  = new_id WHERE employee_id  = old_id;
    UPDATE daily_task_logs         SET employee_id  = new_id WHERE employee_id  = old_id;
    UPDATE employee_tasks          SET employee_id  = new_id WHERE employee_id  = old_id;
    UPDATE employee_tasks          SET created_by   = new_id WHERE created_by   = old_id;
    UPDATE manager_hierarchy       SET employee_id  = new_id WHERE employee_id  = old_id;
    UPDATE report_drafts           SET employee_id  = new_id WHERE employee_id  = old_id;
    UPDATE resource_allocations    SET employee_id  = new_id WHERE employee_id  = old_id;
    UPDATE tasks                   SET assigned_to  = new_id WHERE assigned_to  = old_id;
    UPDATE tasks                   SET created_by   = new_id WHERE created_by   = old_id;
    UPDATE time_entries            SET employee_id  = new_id WHERE employee_id  = old_id;
    UPDATE time_off_requests       SET employee_id  = new_id WHERE employee_id  = old_id;
    UPDATE time_off_requests       SET approved_by  = new_id WHERE approved_by  = old_id;
    UPDATE timesheets              SET employee_id  = new_id WHERE employee_id  = old_id;
    UPDATE timesheets              SET approved_by  = new_id WHERE approved_by  = old_id;
    UPDATE weekly_reports          SET employee_id  = new_id WHERE employee_id  = old_id;
    UPDATE calendar_events         SET created_by   = new_id WHERE created_by   = old_id;
    UPDATE client_credentials      SET created_by   = new_id WHERE created_by   = old_id;
    UPDATE communications          SET created_by   = new_id WHERE created_by   = old_id;
    UPDATE email_templates         SET created_by   = new_id WHERE created_by   = old_id;
    UPDATE goals                   SET created_by   = new_id WHERE created_by   = old_id;
    UPDATE internal_comments       SET user_id      = new_id WHERE user_id      = old_id;
    UPDATE meeting_notes           SET created_by   = new_id WHERE created_by   = old_id;
    UPDATE notifications           SET user_id      = new_id WHERE user_id      = old_id;
    UPDATE projects                SET created_by   = new_id WHERE created_by   = old_id;
    UPDATE report_comments         SET user_id      = new_id WHERE user_id      = old_id;
    UPDATE report_templates        SET created_by   = new_id WHERE created_by   = old_id;
    UPDATE saved_filters           SET user_id      = new_id WHERE user_id      = old_id;
    UPDATE user_preferences        SET user_id      = new_id WHERE user_id      = old_id;
    UPDATE dashboard_widgets       SET user_id      = new_id WHERE user_id      = old_id;
    UPDATE notification_preferences SET user_id     = new_id WHERE user_id      = old_id;
    UPDATE activity_logs           SET user_id      = new_id WHERE user_id      = old_id;
  END LOOP;
END $$;
