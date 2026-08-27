const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function addPhotosLockedColumn() {
  try {
    // Execute raw SQL using Supabase RPC
    const { data, error } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE players ADD COLUMN IF NOT EXISTS photos_locked BOOLEAN DEFAULT false;'
    });

    if (error) {
      console.log('Note: RPC method not available, which is expected.');
      console.log('Please run this SQL manually in Supabase Dashboard:');
      console.log('');
      console.log('ALTER TABLE players ADD COLUMN IF NOT EXISTS photos_locked BOOLEAN DEFAULT false;');
      console.log('');
      console.log('Then run the migration to add a fake player.');
    } else {
      console.log('Column added successfully!');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nPlease run this SQL manually in Supabase Dashboard > SQL Editor:');
    console.log('ALTER TABLE players ADD COLUMN IF NOT EXISTS photos_locked BOOLEAN DEFAULT false;');
  }
}

addPhotosLockedColumn();
