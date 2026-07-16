
CREATE POLICY "Authenticated read assets" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rei-filtros-assets');
CREATE POLICY "Authenticated upload assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rei-filtros-assets');
CREATE POLICY "Authenticated update assets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'rei-filtros-assets');
CREATE POLICY "Authenticated delete assets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'rei-filtros-assets');
