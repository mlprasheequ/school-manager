-- Dynamic Font System for Multilingual Library Support
CREATE TABLE IF NOT EXISTS school_fonts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  css_data TEXT NOT NULL, -- The font-face CSS or link
  font_family TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS library_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  font_id UUID REFERENCES school_fonts(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Initial default setting
INSERT INTO library_settings (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;
