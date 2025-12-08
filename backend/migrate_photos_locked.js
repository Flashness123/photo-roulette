const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jovuumvoqvpdjupqwaze.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdnV1bXZvcXZwZGp1cHF3YXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjM5MDgsImV4cCI6MjA4MDQzOTkwOH0.IjBS6xeP5yNdx-17wDR8H4e50UGCYTD114QKOc8yq70'
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
