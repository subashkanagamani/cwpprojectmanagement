INSERT INTO services (id, name, slug, description, is_active) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Account Manager', 'account-manager', 'Account management and client relationship services', true),
  ('11111111-0000-0000-0000-000000000002', 'LinkedIn Outreach', 'linkedin-outreach', 'Professional LinkedIn connection and outreach campaigns', true),
  ('11111111-0000-0000-0000-000000000003', 'Email Marketing', 'email-marketing', 'Email campaign management and automation', true),
  ('11111111-0000-0000-0000-000000000004', 'Content Creation', 'content-creation', 'Blog posts, articles, and content writing services', true),
  ('11111111-0000-0000-0000-000000000005', 'Social Media Management', 'social-media', 'Social media strategy and content management', true),
  ('11111111-0000-0000-0000-000000000006', 'SEO Services', 'seo-services', 'Search engine optimization and website audits', true),
  ('11111111-0000-0000-0000-000000000007', 'PPC Advertising', 'ppc-advertising', 'Pay-per-click advertising campaign management', true),
  ('11111111-0000-0000-0000-000000000008', 'Lead Sourcing', 'lead-sourcing', 'Lead generation and filtration services', true),
  ('11111111-0000-0000-0000-000000000009', 'Web Development', 'web-development', 'Website design and development services', true),
  ('11111111-0000-0000-0000-000000000010', 'Graphic Design', 'graphic-design', 'Logo design, branding, and graphic design services', true)
ON CONFLICT (slug) DO UPDATE SET id = EXCLUDED.id, name = EXCLUDED.name;