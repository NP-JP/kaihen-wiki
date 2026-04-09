import { createClient } from '@supabase/supabase-js'
import { writeFile } from 'fs/promises';

const supabaseUrl = 'https://meraycnjnzcivsoldyvr.supabase.co'
const supabaseKey = 'sb_publishable_hMDFKnzg-AW874qw-HmIEQ_dEAdWDow'
const supabase = createClient(supabaseUrl, supabaseKey)

async function pullData() {
    try {
        const { data, error } = await supabase.from('wiki_pages').select('*');
        if (error) throw error;

        const wikiData = {};
        data.forEach(row => {
            wikiData[row.title] = {
                title: row.title,
                category: row.category,
                content: row.content
            };
        });

        await writeFile('src/data/wiki-data.json', JSON.stringify(wikiData, null, 2), 'utf8');
        console.log('SUCCESS: Pulled cloud data to local JSON');
    } catch (err) {
        console.error('ERROR:', err.message);
    }
}

pullData();
