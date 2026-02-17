/*
  # Initial Seed Data Migration
  
  This migration adds initial data to the database including:
  
  1. Services
    - LinkedIn Outreach
    - Email Marketing
    - Content Creation
    - Social Media Management
    - SEO Services
    - PPC Advertising
    - Web Development
    - Graphic Design
  
  2. Notes
    - Services are the core offerings that can be assigned to clients
    - This data is essential for the application to function properly
    - All services are active by default
*/

-- Insert initial services
INSERT INTO services (name, slug, description, is_active) VALUES
  ('LinkedIn Outreach', 'linkedin-outreach', 'Professional LinkedIn connection and outreach campaigns', true),
  ('Email Marketing', 'email-marketing', 'Email campaign management and automation', true),
  ('Content Creation', 'content-creation', 'Blog posts, articles, and content writing services', true),
  ('Social Media Management', 'social-media', 'Social media strategy and content management', true),
  ('SEO Services', 'seo-services', 'Search engine optimization and website audits', true),
  ('PPC Advertising', 'ppc-advertising', 'Pay-per-click advertising campaign management', true),
  ('Web Development', 'web-development', 'Website design and development services', true),
  ('Graphic Design', 'graphic-design', 'Logo design, branding, and graphic design services', true)
ON CONFLICT (slug) DO NOTHING;

-- Note: Admin users should be created through the signup flow
-- The first user to sign up can be manually promoted to admin if needed