-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'partner');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing int;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT count(*) INTO existing FROM public.user_roles WHERE role = 'admin';
  IF existing > 0 THEN RETURN public.has_role(auth.uid(), 'admin'); END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
    ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

-- VENUES
CREATE TYPE public.venue_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Cafe',
  address text NOT NULL DEFAULT '',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  website_url text,
  menu_url text,
  phone text,
  status public.venue_status NOT NULL DEFAULT 'pending',
  hygiene_rating int,
  insurance_doc_path text,
  insurance_expiry date,
  insurance_verified_at timestamptz,
  insurance_verified_by uuid,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.venues TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venues TO authenticated;
GRANT ALL ON public.venues TO service_role;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads approved venues" ON public.venues
  FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "Owners read own venue" ON public.venues
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners create own venue" ON public.venues
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update own venue" ON public.venues
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Admins read all venues" ON public.venues
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update all venues" ON public.venues
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete venues" ON public.venues
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- OFFERS
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price_text text,
  image_url text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX offers_venue_idx ON public.offers (venue_id);
CREATE INDEX offers_expiry_idx ON public.offers (expires_at);
GRANT SELECT ON public.offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads live offers" ON public.offers
  FOR SELECT TO anon, authenticated USING (
    expires_at > now() AND EXISTS (
      SELECT 1 FROM public.venues v WHERE v.id = offers.venue_id AND v.status = 'approved'
    )
  );
CREATE POLICY "Owners manage own offers" ON public.offers
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.venues v WHERE v.id = offers.venue_id AND v.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.venues v WHERE v.id = offers.venue_id AND v.owner_id = auth.uid())
  );
CREATE POLICY "Admins manage all offers" ON public.offers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER venues_touch_updated_at BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- STORAGE OBJECT POLICIES
CREATE POLICY "Anyone reads offer photos" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'offer-photos');
CREATE POLICY "Partners upload offer photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'offer-photos' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Partners update own offer photos" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'offer-photos' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Partners upload compliance docs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'compliance-docs' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Partners read own compliance docs" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'compliance-docs' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Admins read compliance docs" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'compliance-docs' AND public.has_role(auth.uid(), 'admin')
  );

-- DEMO DATA
INSERT INTO public.venues (id, name, category, address, lat, lng, website_url, menu_url, status, hygiene_rating, insurance_expiry, insurance_verified_at)
VALUES
 ('11111111-1111-4111-8111-111111111111','The Copper Room','Coffee shop','12 Neal Street, London WC2H 9PU',51.51420,-0.12580,'https://example.com/copper','https://example.com/copper/menu','approved',5,'2027-03-31',now()),
 ('22222222-2222-4222-8222-222222222222','Sesame Deli','Sandwich bar','48 Berwick Street, London W1F 8SG',51.51380,-0.13480,'https://example.com/sesame','https://example.com/sesame/menu','approved',4,'2026-11-30',now()),
 ('33333333-3333-4333-8333-333333333333','Bramble Cafe','Cafe','7 Lamb''s Conduit St, London WC1N 3NG',51.52190,-0.11940,'https://example.com/bramble',NULL,'approved',5,'2027-01-15',now()),
 ('44444444-4444-4444-8444-444444444444','Kiln Bakehouse','Bakery','221 Old Street, London EC1V 9NR',51.52520,-0.08840,NULL,NULL,'approved',4,'2026-09-30',now()),
 ('55555555-5555-4555-8555-555555555555','Pier Fish Bar','Restaurant','3 Wapping High St, London E1W 1LA',51.50510,-0.06450,'https://example.com/pier','https://example.com/pier/menu','pending',3,NULL,NULL);

INSERT INTO public.offers (venue_id, title, description, price_text, expires_at)
VALUES
 ('11111111-1111-4111-8111-111111111111','10% off the lobster roll','Every lunchtime while stock lasts.','£12.60',now() + interval '4 hours'),
 ('22222222-2222-4222-8222-222222222222','Lunch box deal','Any sandwich, crisps and a drink.','£6.40',now() + interval '90 minutes'),
 ('33333333-3333-4333-8333-333333333333','Flat white + pastry','Morning combo, dine in or takeaway.','£4.50',now() + interval '6 hours');