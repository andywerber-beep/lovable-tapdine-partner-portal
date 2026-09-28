DROP POLICY IF EXISTS "Anyone reads offer photos" ON storage.objects;
CREATE POLICY "Venue owners read own offer photos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'offer-photos' AND EXISTS (SELECT 1 FROM public.venues v WHERE v.id::text = (storage.foldername(name))[1] AND v.owner_id = auth.uid()));