
-- 1) Create private schema and move has_role there
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_staff(uuid) FROM PUBLIC, anon, authenticated;

-- Revoke EXECUTE on remaining SECURITY DEFINER functions in public
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- 2) Drop existing over-permissive policies and recreate scoped ones

-- clients
DROP POLICY IF EXISTS "Authenticated manage clients" ON public.clients;
CREATE POLICY "Staff view clients" ON public.clients FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff insert clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Staff update clients" ON public.clients FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Admins delete clients" ON public.clients FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- products
DROP POLICY IF EXISTS "Authenticated manage products" ON public.products;
CREATE POLICY "Staff view products" ON public.products FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff insert products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Staff update products" ON public.products FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Admins delete products" ON public.products FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- machines
DROP POLICY IF EXISTS "Authenticated manage machines" ON public.machines;
CREATE POLICY "Staff view machines" ON public.machines FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff insert machines" ON public.machines FOR INSERT TO authenticated
  WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Staff update machines" ON public.machines FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Admins delete machines" ON public.machines FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- company_settings: rewrite admin policies to use private schema
DROP POLICY IF EXISTS "Admins manage company" ON public.company_settings;
DROP POLICY IF EXISTS "All authenticated can view company" ON public.company_settings;
CREATE POLICY "Staff view company" ON public.company_settings FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));
CREATE POLICY "Admins manage company" ON public.company_settings FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- quotes: vendedor scoped by vendedor_id, admins full access
DROP POLICY IF EXISTS "Authenticated manage quotes" ON public.quotes;
CREATE POLICY "View own or admin quotes" ON public.quotes FOR SELECT TO authenticated
  USING (vendedor_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Staff insert own quotes" ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (vendedor_id = auth.uid() AND private.is_staff(auth.uid()));
CREATE POLICY "Update own or admin quotes" ON public.quotes FOR UPDATE TO authenticated
  USING (vendedor_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (vendedor_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Delete own or admin quotes" ON public.quotes FOR DELETE TO authenticated
  USING (vendedor_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- quote_items: follow parent quote ownership
DROP POLICY IF EXISTS "Authenticated manage quote items" ON public.quote_items;
CREATE POLICY "View quote items via quote" ON public.quote_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id
      AND (q.vendedor_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))
  ));
CREATE POLICY "Insert quote items via quote" ON public.quote_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id
      AND (q.vendedor_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))
  ));
CREATE POLICY "Update quote items via quote" ON public.quote_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id
      AND (q.vendedor_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id
      AND (q.vendedor_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))
  ));
CREATE POLICY "Delete quote items via quote" ON public.quote_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id
      AND (q.vendedor_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))
  ));

-- profiles: users see own, admins see all
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "View own profile or admin" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete profiles" ON public.profiles FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- user_roles: users see own, admins manage all
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "View own role or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Drop old public.has_role now that policies use private.has_role
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- Update handle_new_user to use private.has_role reference no longer needed; keep as-is but ensure security
-- Nothing else to change on trigger functions

-- 3) Storage policies: only admins can write; any staff can read
DROP POLICY IF EXISTS "Authenticated read assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete assets" ON storage.objects;

CREATE POLICY "Staff read rei-filtros-assets" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rei-filtros-assets' AND private.is_staff(auth.uid()));
CREATE POLICY "Admins upload rei-filtros-assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rei-filtros-assets' AND private.has_role(auth.uid(), 'admin'::public.app_role) AND owner = auth.uid());
CREATE POLICY "Admins update rei-filtros-assets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'rei-filtros-assets' AND private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'rei-filtros-assets' AND private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete rei-filtros-assets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'rei-filtros-assets' AND private.has_role(auth.uid(), 'admin'::public.app_role));
