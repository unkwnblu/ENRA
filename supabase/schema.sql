-- ERNA Admin Dashboard — Full Supabase Schema
-- Run this in the Supabase SQL Editor

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  email       text,
  phone       text,
  role        text DEFAULT 'user' CHECK (role IN ('user', 'responder', 'admin')),
  suspended   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- INCIDENTS
-- ============================================
CREATE TABLE IF NOT EXISTS incidents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  victim_id       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  emergency_type  text NOT NULL CHECK (emergency_type IN ('medical', 'fire', 'security', 'accident')),
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'cancelled')),
  latitude        double precision NOT NULL,
  longitude       double precision NOT NULL,
  address         text,
  responder_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  resolved_at     timestamptz
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read incidents"
  ON incidents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert incidents"
  ON incidents FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins and responders can update incidents"
  ON incidents FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'responder')
    )
  );

-- Enable realtime for the incidents table
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;

-- ============================================
-- INCIDENT UPDATES
-- ============================================
CREATE TABLE IF NOT EXISTS incident_updates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  actor_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  message      text NOT NULL,
  status       text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE incident_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read incident updates"
  ON incident_updates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and responders can insert updates"
  ON incident_updates FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'responder')
    )
  );

-- ============================================
-- RESPONDERS
-- ============================================
CREATE TABLE IF NOT EXISTS responders (
  id                 uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_on_duty         boolean DEFAULT false,
  total_handled      int DEFAULT 0,
  avg_response_time  double precision DEFAULT 0
);

ALTER TABLE responders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read responders"
  ON responders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert responders"
  ON responders FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins and self can update responders"
  ON responders FOR UPDATE TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Enable realtime for the responders table
ALTER PUBLICATION supabase_realtime ADD TABLE responders;

-- ============================================
-- EMERGENCY CONTACTS
-- ============================================
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          text NOT NULL,
  phone         text NOT NULL,
  relationship  text
);

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read emergency contacts"
  ON emergency_contacts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage their own contacts"
  ON emergency_contacts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own contacts"
  ON emergency_contacts FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own contacts"
  ON emergency_contacts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- SEED: Make existing user an admin (update email below)
-- ============================================
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
