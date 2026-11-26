-- NEXORA Idempotent Seed Script
-- System templates are seeded cleanly via migration 202611260004_seed_templates.sql.
-- This file can be re-run safely anytime to refresh system template definitions.

select count(*) as system_template_count
from public.topic_templates
where is_system = true;
