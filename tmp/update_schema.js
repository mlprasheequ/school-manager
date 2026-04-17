import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xozeqlhusolthvzekyxu.supabase.co',
  'sb_secret_PywWz8Jjfn0zMS8AwjKTuA_Zeogtm-X'
)

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE books ADD COLUMN publisher TEXT, ADD COLUMN category TEXT, ADD COLUMN image_url TEXT;'
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log("Columns already exist.");
    } else {
      console.error("Error executing SQL:", error);
    }
  } else {
    console.log("SQL executed successfully.");
  }
}

run();
