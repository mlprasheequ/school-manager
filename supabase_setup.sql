-- Run these queries in your Supabase SQL Editor:

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  roll_id TEXT UNIQUE NOT NULL,
  email_account TEXT UNIQUE NOT NULL,
  email_library TEXT UNIQUE NOT NULL,
  balance NUMERIC DEFAULT 0,
  grade TEXT,
  parent_phone TEXT,
  username TEXT UNIQUE,
  password TEXT,
  is_responsible BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE fund_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT CHECK (type IN ('deposit', 'withdrawal', 'distribution')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  category TEXT,
  image_url TEXT,
  shelf_location TEXT,
  rate NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'lost')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE library_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  borrow_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  due_date TIMESTAMP WITH TIME ZONE,
  return_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE library_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'fulfilled', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  approved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE school_finances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense', 'distribution')),
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE school_fonts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  font_family TEXT NOT NULL,
  css_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE library_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    font_id UUID REFERENCES school_fonts(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_fonts ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_settings ENABLE ROW LEVEL SECURITY;

-- Add basic "Allow All" policies for testing
CREATE POLICY "Allow All Public" ON students FOR ALL USING (true);
CREATE POLICY "Allow All Public" ON fund_transactions FOR ALL USING (true);
CREATE POLICY "Allow All Public" ON books FOR ALL USING (true);
CREATE POLICY "Allow All Public" ON library_logs FOR ALL USING (true);
CREATE POLICY "Allow All Public" ON school_finances FOR ALL USING (true);
CREATE POLICY "Allow All Public" ON library_reservations FOR ALL USING (true);
CREATE POLICY "Allow All Public" ON school_fonts FOR ALL USING (true);
CREATE POLICY "Allow All Public" ON library_settings FOR ALL USING (true);
