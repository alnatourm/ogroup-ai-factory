INSERT INTO permissions(id,key) VALUES
 ('00000000-0000-4000-8000-000000000101','factory.run.create'),
 ('00000000-0000-4000-8000-000000000102','factory.gate.design'),
 ('00000000-0000-4000-8000-000000000103','factory.gate.production'),
 ('00000000-0000-4000-8000-000000000104','factory.config.manage'),
 ('00000000-0000-4000-8000-000000000105','factory.byok.manage'),
 ('00000000-0000-4000-8000-000000000106','factory.billing.view')
ON CONFLICT (key) DO NOTHING;
