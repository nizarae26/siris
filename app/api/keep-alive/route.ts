import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase'; // Gunakan instance supabase yang sudah ada di lib

export const dynamic = 'force-dynamic'; 

export async function GET() {
  try {
    // Membaca satu data kecil dari tabel settings
    const { data, error } = await supabase
      .from('settings') 
      .select('id')
      .limit(1);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      status: 'success', 
      message: 'Berhasil melakukan PING ke Supabase! Database tetap aktif.',
      time: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
  }
}
