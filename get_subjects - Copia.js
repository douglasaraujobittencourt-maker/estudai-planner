import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://mgautqihsuhotairpmmt.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYXV0cWloc3Vob3RhaXJwbW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MTE0MDQsImV4cCI6MjA5OTA4NzQwNH0.bIYQNiuDV9GbM8jrzuY0v3e7zakXkT54ZyVUo1le6hU";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: subjects, error } = await supabase.from('subjects').select('*');
  if (error) {
    console.error(error);
    return;
  }
  console.log(JSON.stringify(subjects, null, 2));
}

run();
