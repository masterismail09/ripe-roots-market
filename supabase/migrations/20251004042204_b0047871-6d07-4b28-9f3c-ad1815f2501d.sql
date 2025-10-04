-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'delivery_partner', 'customer');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subscription_plan TEXT NOT NULL,
  subscription_status TEXT DEFAULT 'inactive',
  subscription_start_date DATE NOT NULL,
  subscription_end_date DATE NOT NULL,
  next_payment_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create delivery_partners table
CREATE TABLE public.delivery_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  vehicle_type TEXT,
  availability_status TEXT DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;

-- Create deliveries table
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  delivery_partner_id UUID REFERENCES public.delivery_partners(id),
  delivery_date DATE NOT NULL,
  delivery_status TEXT DEFAULT 'pending',
  delivery_address TEXT NOT NULL,
  items TEXT NOT NULL,
  notes TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for customers
CREATE POLICY "Customers can view their own data"
  ON public.customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all customers"
  ON public.customers FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert customers"
  ON public.customers FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update customers"
  ON public.customers FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete customers"
  ON public.customers FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for delivery_partners
CREATE POLICY "Delivery partners can view their own data"
  ON public.delivery_partners FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all delivery partners"
  ON public.delivery_partners FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage delivery partners"
  ON public.delivery_partners FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for deliveries
CREATE POLICY "Customers can view their own deliveries"
  ON public.deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = deliveries.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Delivery partners can view their assigned deliveries"
  ON public.deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_partners
      WHERE delivery_partners.id = deliveries.delivery_partner_id
      AND delivery_partners.user_id = auth.uid()
    )
  );

CREATE POLICY "Delivery partners can update their assigned deliveries"
  ON public.deliveries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_partners
      WHERE delivery_partners.id = deliveries.delivery_partner_id
      AND delivery_partners.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all deliveries"
  ON public.deliveries FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_partners_updated_at
  BEFORE UPDATE ON public.delivery_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();