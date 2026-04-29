-- Add RLS policies for products storage bucket
-- Fix: "new row violates row-level security policy" when uploading product photos

-- Allow anyone to view product photos (public bucket)
CREATE POLICY "Anyone can view product photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

-- Allow authenticated users to upload product photos to their business folder
CREATE POLICY "Users can upload product photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'products'
  AND (storage.foldername(name))[1] IN (
    SELECT b.id::text FROM businesses b
    JOIN business_users bu ON b.id = bu.business_id
    WHERE bu.user_id = auth.uid()
  )
);

-- Allow authenticated users to update/replace product photos
CREATE POLICY "Users can update product photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'products')
WITH CHECK (
  bucket_id = 'products'
  AND (storage.foldername(name))[1] IN (
    SELECT b.id::text FROM businesses b
    JOIN business_users bu ON b.id = bu.business_id
    WHERE bu.user_id = auth.uid()
  )
);

-- Allow authenticated users to delete product photos
CREATE POLICY "Users can delete product photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'products'
  AND (storage.foldername(name))[1] IN (
    SELECT b.id::text FROM businesses b
    JOIN business_users bu ON b.id = bu.business_id
    WHERE bu.user_id = auth.uid()
  )
);