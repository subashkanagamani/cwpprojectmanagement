import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALL_EMPLOYEES = [
  { email: "bpaul@consultwithprofessionals.com",        full_name: "B Paul",          id: "48e8c8dd-72ae-4751-8f6c-dd71f36b097d" },
  { email: "bharani@consultwithprofessionals.com",      full_name: "Bharani",          id: "25a982ea-218d-44f9-b2c7-529c8f30641d" },
  { email: "divya@consultwithprofessionals.com",        full_name: "Divya",            id: "c4fc92ed-5a7c-45db-805c-4001e6f305ed" },
  { email: "ganesh@consultwithprofessionals.com",       full_name: "Ganesh",           id: null }, // deleted - will get new id
  { email: "gokul@consultwithprofessionals.com",        full_name: "Gokul",            id: "55207491-768a-46e7-90c6-24dead0febda" },
  { email: "kdharshini@consultwithprofessionals.com",   full_name: "K Dharshini",      id: "c8062038-4ecd-48b5-8ead-fb18be5f1bed" },
  { email: "manikandan@consultwithprofessionals.com",   full_name: "Manikandan",       id: "054086ad-4d70-45a6-a610-8612932c0ab2" },
  { email: "manoj@consultwithprofessionals.com",        full_name: "Manoj",            id: "1b686bbe-8c4f-437a-a2f4-3887fcd24b93" },
  { email: "meenakshi@consultwithprofessionals.com",    full_name: "Meenakshi",        id: "8e357ba2-ece0-41b2-ad35-04832597b8b2" },
  { email: "mohamed@consultwithprofessionals.com",      full_name: "Mohamed",          id: "7d2e5d3f-9b61-4ae7-a75c-31a314543a3d" },
  { email: "mohan@consultwithprofessionals.com",        full_name: "Mohan",            id: "bb212671-3f56-4b5d-ba72-272e3750413e" },
  { email: "narenethiraj@consultwithprofessionals.com", full_name: "Narenethiraj",     id: "915f2774-c271-4313-9111-85d7c210d7b3" },
  { email: "nilavan@consultwithprofessionals.com",      full_name: "Nilavan",          id: "02a07545-20b4-40ee-8e1c-acf802474db0" },
  { email: "sparathraj@gmail.com",                      full_name: "S Parath Raj",     id: "65e1f95a-c336-48e2-bc00-e86d56a23456" },
  { email: "roopesh@consultwithprofessionals.com",      full_name: "Roopesh",          id: "52690ca6-e6b1-45e4-b3a8-599b85e2f5ec" },
  { email: "spriyanka@consultwithprofessionals.com",    full_name: "S Priyanka",       id: "d8ee9a60-0cf1-4aee-b35a-5aa949a61af5" },
  { email: "smukherjee@consultwithprofessionals.com",   full_name: "S Mukherjee",      id: "8bb2489d-870b-4e21-9e5b-3082c8d7fb49" },
  { email: "subash@consultwithprofessionals.com",       full_name: "Subash",           id: "92ef4a34-1322-44df-a20a-be580f126ee3" },
  { email: "vasuthaarini@consultwithprofessionals.com", full_name: "Vasuthaarini",     id: "7c6d0f6c-a9a2-47f0-b990-7986dc38905c" },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authAdminUrl = `${supabaseUrl}/auth/v1/admin/users`;

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${serviceRoleKey}`,
    "apikey": serviceRoleKey,
  };

  const results: Array<{ email: string; action: string; status: number; newId?: string; error?: string }> = [];

  for (const emp of ALL_EMPLOYEES) {
    // Delete via SQL first (GoTrue can't load these manually-inserted users)
    // We skip employees that already went through this process (ganesh was already deleted)
    // For the rest: delete from auth via the GoTrue admin DELETE
    // But since GoTrue fails to load them, we need to delete via SQL directly
    // We'll use the GoTrue createUser (POST) which doesn't need to load first

    // Try createUser - if it fails with "already exists", we need SQL delete first
    const createRes = await fetch(authAdminUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: emp.email,
        password: "Welcome@123",
        email_confirm: true,
        user_metadata: { full_name: emp.full_name },
      }),
    });
    const createBody = await createRes.text();

    if (createRes.ok) {
      const created = JSON.parse(createBody);
      results.push({ email: emp.email, action: "created", status: createRes.status, newId: created.id });
    } else {
      results.push({ email: emp.email, action: "create_attempted", status: createRes.status, error: createBody.slice(0, 200) });
    }
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
