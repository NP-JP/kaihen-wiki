import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testColumn() {
  console.log('Checking columns for wiki_pages...');
  const { data, error } = await supabase
    .from('wiki_pages')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching data:', error.message);
  } else if (data && data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]));
    if (Object.keys(data[0]).includes('is_editing_status')) {
      console.log('SUCCESS: is_editing_status column exists in the data returned.');
    } else {
      console.log('FAILURE: is_editing_status column is MISSING from the data returned.');
    }
  } else {
    console.log('No data found in wiki_pages to check columns.');
  }
}

testColumn();
