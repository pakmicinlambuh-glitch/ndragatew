-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for transaction status
CREATE TYPE public.transaction_status AS ENUM ('pending', 'paid', 'expired', 'failed');

-- Create enum for payment method
CREATE TYPE public.payment_method AS ENUM ('qris', 'va', 'retail');

-- Create enum for fee type
CREATE TYPE public.fee_type AS ENUM ('fixed', 'percent');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create api_settings table (singleton for sanpay.site credentials)
CREATE TABLE public.api_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key TEXT NOT NULL,
    merchant_code TEXT NOT NULL,
    callback_url TEXT,
    is_validated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create fee_settings table
CREATE TABLE public.fee_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_code TEXT NOT NULL UNIQUE,
    channel_name TEXT NOT NULL,
    channel_type TEXT NOT NULL, -- 'va' or 'retail' or 'qris'
    base_fee_type fee_type NOT NULL DEFAULT 'fixed',
    base_fee_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    markup_fee_type fee_type NOT NULL DEFAULT 'fixed',
    markup_fee_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    min_amount INTEGER DEFAULT 10000,
    max_amount INTEGER DEFAULT 50000000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    partner_reference_no TEXT NOT NULL UNIQUE,
    external_id TEXT,
    amount INTEGER NOT NULL,
    admin_fee INTEGER DEFAULT 0,
    total_amount INTEGER NOT NULL,
    payment_method payment_method NOT NULL,
    channel_code TEXT,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    status transaction_status DEFAULT 'pending',
    qr_content TEXT,
    va_number TEXT,
    payment_code TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    callback_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- API settings policies (admin only)
CREATE POLICY "Admins can view api settings" ON public.api_settings
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage api settings" ON public.api_settings
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Fee settings policies
CREATE POLICY "Anyone authenticated can view fee settings" ON public.fee_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage fee settings" ON public.fee_settings
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON public.transactions
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all transactions" ON public.transactions
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_settings_updated_at
    BEFORE UPDATE ON public.api_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fee_settings_updated_at
    BEFORE UPDATE ON public.fee_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile and default role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;