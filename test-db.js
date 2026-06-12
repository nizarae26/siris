const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://xcjylignjcbdaoquqpkn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjanlsaWduamNiZGFvcXVxcGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMDIwNzcsImV4cCI6MjA5NjY3ODA3N30.m2n_vESI5sEUhqTDZjWUKimiwJKQMWhvHBIrz7lyQ1c');

async function check() {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 4);
  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));
}

check();
