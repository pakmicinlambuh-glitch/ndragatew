-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for kyc-documents bucket
CREATE POLICY "Users can upload own KYC documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own KYC documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all KYC documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat-attachments bucket
CREATE POLICY "Users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');

-- Create storage bucket for widget images
INSERT INTO storage.buckets (id, name, public) VALUES ('widget-images', 'widget-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload widget images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'widget-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view widget images"
ON storage.objects FOR SELECT
USING (bucket_id = 'widget-images');