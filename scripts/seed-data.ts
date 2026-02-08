import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const EMPLOYEES = [
  { full_name: "Banasree", email: "bpaul@consultwithprofessionals.com", role: "employee" as const },
  { full_name: "Bharani", email: "bharani@consultwithprofessionals.com", role: "employee" as const },
  { full_name: "Divya", email: "divya@consultwithprofessionals.com", role: "employee" as const },
  { full_name: "Ganesh", email: "ganesh@consultwithprofessionals.com", role: "employee" as const },
  { full_name: "Gokul", email: "gokul@consultwithprofessionals.com", role: "employee" as const },
  { full_name: "Kavya", email: "kdharshini@consultwithprofessionals.com", role: "employee" as const },
  { full_name: "Manikandan", email: "manikandan@consultwithprofessionals.com", role: "employee" as const },
  { full_name: "Manoj Kumar U", email: "manoj@consultwithprofessionals.com", role: "employee" as const },
  { full_name: "Meenakshi", email: "meenakshi@consultwithprofessionals.com", role: "employee" as const },
  { full_name: "Mohan", email: "mohan@consultwithprofessionals.com", role: "employee" as const },
  { full_name: "Naren", email: "narenethiraj@consultwithprofessionals.com", role: "employee" as const },
  { full_name: "Nilavan", email: "nilavan@consultwithprofessionals.com", role: "employee" as const },
  { full_name: "Raj", email: "sparathraj@gmail.com", role: "employee" as const },
  { full_name: "Roopesh", email: "roopesh@consultwithprofessionals.com", role: "employee" as const },
  { full_name: "Sethu Priyanka", email: "spriyanka@consultwithprofessionals.com", role: "employee" as const },
  { full_name: "Shatabdi", email: "smukherjee@consultwithprofessionals.com", role: "employee" as const },
  { full_name: "Subash", email: "subash@consultwithprofessionals.com", role: "admin" as const },
  { full_name: "Vasuthaarini S R", email: "vasuthaarini@consultwithprofessionals.com", role: "employee" as const },
  { full_name: "Mohammed Ali", email: "mohamed@consultwithprofessionals.com", role: "employee" as const },
];

const CLIENTS = [
  "Amanstra", "BD Soft", "Simitri HR – Vinisha Jayaswal", "Lambodara Group",
  "Chennai Beach Wedding", "Marsdev", "Reinvent", "Zenius IT", "Leonstride",
  "Rajneethi", "Smarten", "Implemify", "Fly Nava", "Corefactors",
  "Gold Standaran Wealth", "Qblu – Senthil", "Nerdiamond", "Infodot",
  "Go Desk", "Mahiruho", "VKH Enterprises", "Blooprint", "Blaqlaitz",
  "Meta Source", "BeyondSure", "Yolo Works", "IDC", "Tech Labs", "Valuehub",
  "Wylo", "Pneumatic Motion", "Bala Events", "Spark", "Bookappdesign",
];

const SERVICES = [
  { name: "Account Manager", slug: "account-manager" },
  { name: "LinkedIn Outreach", slug: "linkedin-outreach" },
  { name: "Email", slug: "email" },
  { name: "Content Creation", slug: "content-creation" },
  { name: "Lead Sourcing", slug: "lead-sourcing" },
  { name: "Social Media", slug: "social-media" },
  { name: "SEO", slug: "seo" },
  { name: "Paid Ads", slug: "paid-ads" },
  { name: "Designer", slug: "designer" },
  { name: "Lead Filtration", slug: "lead-filtration" },
];

const ASSIGNMENTS: Record<string, Record<string, string[]>> = {
  "Meenakshi": {
    "Amanstra": ["Account Manager", "LinkedIn Outreach", "Email"],
    "BD Soft": ["LinkedIn Outreach"],
    "Simitri HR – Vinisha Jayaswal": ["Account Manager", "Content Creation"],
    "Lambodara Group": ["LinkedIn Outreach"],
    "Chennai Beach Wedding": ["Lead Filtration"],
  },
  "Naren": {
    "Marsdev": ["Account Manager"],
    "Reinvent": ["Account Manager"],
    "BD Soft": ["Account Manager"],
    "Zenius IT": ["Account Manager"],
    "Leonstride": ["Account Manager"],
    "Rajneethi": ["Account Manager"],
    "Smarten": ["Account Manager"],
    "Implemify": ["Account Manager"],
    "Fly Nava": ["Account Manager", "Content Creation"],
    "Corefactors": ["Content Creation"],
    "Gold Standaran Wealth": ["Content Creation"],
    "Qblu – Senthil": ["Account Manager"],
    "Nerdiamond": ["Account Manager"],
    "Infodot": ["Account Manager", "Content Creation"],
  },
  "Ganesh": {
    "Amanstra": ["Lead Sourcing", "Content Creation"],
    "Marsdev": ["Lead Sourcing"],
    "BD Soft": ["Lead Sourcing", "Content Creation"],
    "Zenius IT": ["Lead Sourcing"],
    "Go Desk": ["Account Manager", "Lead Sourcing", "Content Creation"],
    "Leonstride": ["Lead Sourcing"],
    "Mahiruho": ["Account Manager", "Lead Sourcing", "Content Creation"],
    "VKH Enterprises": ["Account Manager", "Lead Sourcing"],
    "Blooprint": ["Lead Sourcing"],
    "Implemify": ["Lead Sourcing"],
    "Corefactors": ["Lead Sourcing"],
    "Blaqlaitz": ["Lead Sourcing"],
    "Meta Source": ["Lead Sourcing"],
    "Gold Standaran Wealth": ["Lead Sourcing"],
    "Qblu – Senthil": ["Lead Sourcing"],
    "Infodot": ["Lead Sourcing"],
    "Lambodara Group": ["Lead Sourcing"],
    "Bookappdesign": ["Account Manager"],
  },
  "Roopesh": {
    "Reinvent": ["Lead Sourcing", "LinkedIn Outreach"],
    "BeyondSure": ["Lead Sourcing", "LinkedIn Outreach"],
    "Go Desk": ["LinkedIn Outreach", "Email"],
    "Rajneethi": ["Lead Sourcing", "LinkedIn Outreach"],
    "Smarten": ["LinkedIn Outreach", "Email"],
    "Nerdiamond": ["Lead Sourcing"],
    "Infodot": ["Lead Sourcing"],
    "Yolo Works": ["Account Manager", "LinkedIn Outreach"],
    "IDC": ["Account Manager", "LinkedIn Outreach"],
    "Tech Labs": ["LinkedIn Outreach"],
    "Simitri HR – Vinisha Jayaswal": ["Lead Sourcing"],
    "Valuehub": ["Lead Sourcing"],
  },
  "Manikandan": {
    "Marsdev": ["LinkedIn Outreach"],
    "Leonstride": ["LinkedIn Outreach"],
    "Qblu – Senthil": ["LinkedIn Outreach"],
  },
  "Gokul": {
    "Zenius IT": ["LinkedIn Outreach"],
    "Mahiruho": ["LinkedIn Outreach"],
    "Blooprint": ["LinkedIn Outreach", "Email"],
    "Meta Source": ["LinkedIn Outreach"],
    "Pneumatic Motion": ["LinkedIn Outreach"],
  },
  "Manoj Kumar U": {
    "Reinvent": ["LinkedIn Outreach"],
    "Fly Nava": ["Lead Sourcing", "LinkedIn Outreach", "Email", "Social Media"],
    "Corefactors": ["Account Manager", "LinkedIn Outreach", "Email"],
    "Blaqlaitz": ["Account Manager", "Email", "Social Media"],
    "Pneumatic Motion": ["Account Manager", "Social Media"],
    "Yolo Works": ["LinkedIn Outreach"],
  },
  "Divya": {
    "Nerdiamond": ["LinkedIn Outreach", "Social Media"],
    "IDC": ["Account Manager", "LinkedIn Outreach"],
    "Lambodara Group": ["Account Manager"],
  },
  "Mohan": {
    "Go Desk": ["Social Media"],
    "Wylo": ["Lead Sourcing", "LinkedIn Outreach", "SEO"],
    "Blaqlaitz": ["Social Media", "SEO"],
    "Infodot": ["LinkedIn Outreach", "Email", "Paid Ads"],
  },
  "Kavya": {
    "Blaqlaitz": ["Content Creation"],
    "Valuehub": ["LinkedIn Outreach", "Email", "SEO"],
  },
  "Vasuthaarini S R": {
    "Reinvent": ["LinkedIn Outreach"],
    "VKH Enterprises": ["Social Media"],
    "Blooprint": ["Email"],
    "Valuehub": ["Account Manager", "Social Media"],
  },
  "Mohammed Ali": {
    "Zenius IT": ["Content Creation"],
    "Mahiruho": ["Social Media"],
    "Bala Events": ["Account Manager", "Content Creation", "Social Media", "SEO", "Paid Ads"],
    "Meta Source": ["Account Manager", "Content Creation", "Social Media", "SEO", "Paid Ads"],
    "Yolo Works": ["Paid Ads"],
    "Chennai Beach Wedding": ["Social Media", "Paid Ads"],
  },
  "Bharani": {
    "Amanstra": ["Paid Ads"],
    "BeyondSure": ["Paid Ads"],
    "Zenius IT": ["Paid Ads"],
    "Go Desk": ["SEO", "Paid Ads"],
    "Leonstride": ["Paid Ads"],
    "Wylo": ["Paid Ads"],
    "Mahiruho": ["Paid Ads"],
    "VKH Enterprises": ["Social Media", "Paid Ads"],
    "Gold Standaran Wealth": ["Account Manager", "SEO", "Paid Ads"],
    "Qblu – Senthil": ["Social Media", "Paid Ads"],
    "Spark": ["Account Manager", "Paid Ads"],
    "Nerdiamond": ["Paid Ads"],
    "Valuehub": ["Paid Ads"],
    "Lambodara Group": ["Paid Ads"],
    "Bookappdesign": ["SEO", "Paid Ads"],
  },
  "Nilavan": {
    "Amanstra": ["SEO"],
    "BD Soft": ["SEO"],
    "BeyondSure": ["SEO"],
    "Zenius IT": ["SEO"],
    "Go Desk": ["SEO"],
    "Leonstride": ["SEO"],
    "Wylo": ["SEO"],
    "Mahiruho": ["SEO"],
    "VKH Enterprises": ["SEO"],
    "Bala Events": ["SEO"],
    "Fly Nava": ["SEO"],
    "Blaqlaitz": ["SEO"],
    "Gold Standaran Wealth": ["SEO"],
    "Qblu – Senthil": ["SEO"],
    "Spark": ["SEO"],
    "Infodot": ["SEO"],
    "Tech Labs": ["SEO"],
    "Valuehub": ["SEO"],
    "Bookappdesign": ["SEO"],
    "Chennai Beach Wedding": ["SEO"],
  },
  "Raj": {
    "Meta Source": ["Designer"],
    "Yolo Works": ["Designer"],
    "Simitri HR – Vinisha Jayaswal": ["Designer"],
    "Valuehub": ["Designer"],
    "Lambodara Group": ["Designer"],
  },
  "Shatabdi": {
    "BD Soft": ["LinkedIn Outreach"],
    "Zenius IT": ["LinkedIn Outreach"],
    "Simitri HR – Vinisha Jayaswal": ["LinkedIn Outreach", "Email"],
  },
  "Subash": {
    "Implemify": ["LinkedIn Outreach"],
  },
  "Banasree": {
    "BeyondSure": ["Account Manager"],
    "Tech Labs": ["Account Manager"],
    "Chennai Beach Wedding": ["Account Manager"],
  },
};

const PASSWORD = "Hellohi23!";

async function seed() {
  console.log("Starting seed process...\n");

  // Step 1: Create employees in Supabase Auth + profiles
  console.log("=== Creating Employee Accounts ===");
  const employeeMap: Record<string, string> = {};

  for (const emp of EMPLOYEES) {
    // Check if user already exists by trying to get them
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === emp.email);

    if (existingUser) {
      console.log(`  [SKIP] ${emp.full_name} (${emp.email}) - already exists`);
      employeeMap[emp.full_name] = existingUser.id;

      // Ensure profile exists
      await supabase.from('profiles').upsert({
        id: existingUser.id,
        email: emp.email,
        full_name: emp.full_name,
        role: emp.role,
        status: 'active',
      }, { onConflict: 'id' });
      continue;
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: emp.email,
      password: PASSWORD,
      email_confirm: true,
    });

    if (authError) {
      console.error(`  [FAIL] ${emp.full_name} (${emp.email}): ${authError.message}`);
      continue;
    }

    const userId = authData.user.id;
    employeeMap[emp.full_name] = userId;

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      email: emp.email,
      full_name: emp.full_name,
      role: emp.role,
      status: 'active',
    }, { onConflict: 'id' });

    if (profileError) {
      console.error(`  [FAIL] Profile for ${emp.full_name}: ${profileError.message}`);
    } else {
      console.log(`  [OK] ${emp.full_name} (${emp.email})`);
    }
  }

  console.log(`\nCreated ${Object.keys(employeeMap).length} employees\n`);

  // Step 2: Create clients
  console.log("=== Creating Clients ===");
  const clientMap: Record<string, string> = {};

  for (const clientName of CLIENTS) {
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('name', clientName)
      .maybeSingle();

    if (existing) {
      console.log(`  [SKIP] ${clientName} - already exists`);
      clientMap[clientName] = existing.id;
      continue;
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: clientName,
        status: 'active',
        priority: 'medium',
        health_status: 'healthy',
        industry: 'Marketing',
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  [FAIL] Client ${clientName}: ${error.message}`);
    } else {
      clientMap[clientName] = data.id;
      console.log(`  [OK] ${clientName}`);
    }
  }

  console.log(`\nCreated ${Object.keys(clientMap).length} clients\n`);

  // Step 3: Create services
  console.log("=== Creating Services ===");
  const serviceMap: Record<string, string> = {};

  for (const svc of SERVICES) {
    const { data: existing } = await supabase
      .from('services')
      .select('id')
      .eq('slug', svc.slug)
      .maybeSingle();

    if (existing) {
      console.log(`  [SKIP] ${svc.name} - already exists`);
      serviceMap[svc.name] = existing.id;
      continue;
    }

    const { data, error } = await supabase
      .from('services')
      .insert({ name: svc.name, slug: svc.slug, is_active: true })
      .select('id')
      .single();

    if (error) {
      console.error(`  [FAIL] Service ${svc.name}: ${error.message}`);
    } else {
      serviceMap[svc.name] = data.id;
      console.log(`  [OK] ${svc.name}`);
    }
  }

  console.log(`\nCreated ${Object.keys(serviceMap).length} services\n`);

  // Step 4: Create client_services links
  console.log("=== Linking Services to Clients ===");
  const clientServicePairs = new Set<string>();

  for (const [, clientAssignments] of Object.entries(ASSIGNMENTS)) {
    for (const [clientName, services] of Object.entries(clientAssignments)) {
      for (const serviceName of services) {
        const key = `${clientName}::${serviceName}`;
        if (!clientServicePairs.has(key) && clientMap[clientName] && serviceMap[serviceName]) {
          clientServicePairs.add(key);
        }
      }
    }
  }

  for (const pair of clientServicePairs) {
    const [clientName, serviceName] = pair.split("::");
    const clientId = clientMap[clientName];
    const serviceId = serviceMap[serviceName];

    const { data: existing } = await supabase
      .from('client_services')
      .select('id')
      .eq('client_id', clientId)
      .eq('service_id', serviceId)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase
        .from('client_services')
        .insert({ client_id: clientId, service_id: serviceId });

      if (error) {
        console.error(`  [FAIL] ${clientName} <-> ${serviceName}: ${error.message}`);
      }
    }
  }
  console.log(`  Linked ${clientServicePairs.size} client-service pairs`);

  // Step 5: Create client_assignments
  console.log("\n=== Creating Client Assignments ===");
  let assignmentCount = 0;
  let skipCount = 0;

  for (const [empName, clientAssignments] of Object.entries(ASSIGNMENTS)) {
    const employeeId = employeeMap[empName];
    if (!employeeId) {
      console.error(`  [SKIP] No employee found for "${empName}"`);
      continue;
    }

    for (const [clientName, services] of Object.entries(clientAssignments)) {
      const clientId = clientMap[clientName];
      if (!clientId) {
        console.error(`  [SKIP] No client found for "${clientName}"`);
        continue;
      }

      for (const serviceName of services) {
        const serviceId = serviceMap[serviceName];
        if (!serviceId) {
          console.error(`  [SKIP] No service found for "${serviceName}"`);
          continue;
        }

        const { data: existing } = await supabase
          .from('client_assignments')
          .select('id')
          .eq('client_id', clientId)
          .eq('employee_id', employeeId)
          .eq('service_id', serviceId)
          .maybeSingle();

        if (existing) {
          skipCount++;
          continue;
        }

        const { error } = await supabase
          .from('client_assignments')
          .insert({
            client_id: clientId,
            employee_id: employeeId,
            service_id: serviceId,
          });

        if (error) {
          console.error(`  [FAIL] ${empName} -> ${clientName} (${serviceName}): ${error.message}`);
        } else {
          assignmentCount++;
        }
      }
    }
  }

  console.log(`\n  Created ${assignmentCount} assignments (${skipCount} skipped as existing)`);
  console.log("\n=== Seed Complete ===");
}

seed().catch(console.error);
