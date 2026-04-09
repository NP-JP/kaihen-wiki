
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://meraycnjnzcivsoldyvr.supabase.co'
const supabaseKey = 'sb_publishable_hMDFKnzg-AW874qw-HmIEQ_dEAdWDow'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkData() {
  const { data, error } = await supabase.from('wiki_pages').select('title, category')
  if (error) {
    console.error(error)
    return
  }
  console.log(JSON.stringify(data, null, 2))
}

checkData()
