const fs = require('fs');
const path = require('path');
const supabase = require('../lib/supabase');

const BUCKET = process.env.SUPABASE_BUCKET || 'uploads';

function isVercel() {
  return !!process.env.VERCEL;
}

async function uploadToSupabase(buffer, filename, mimetype) {
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(`public/${filename}`, buffer, {
      contentType: mimetype,
      upsert: false,
    });

  if (error) throw error;

  const { data: publicUrl } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(`public/${filename}`);

  return publicUrl.publicUrl;
}

async function deleteFromSupabase(fileUrl) {
  if (!supabase) return;
  const match = fileUrl.match(/\/public\/([^?]+)/);
  if (match) {
    await supabase.storage.from(BUCKET).remove([`public/${match[1]}`]);
  }
}

async function deleteLocally(fileUrl) {
  const match = fileUrl.match(/^uploads\/(.+)/);
  if (match) {
    const filePath = path.join(process.cwd(), 'public', fileUrl);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {}
  }
}

module.exports = { uploadToSupabase, deleteFromSupabase, deleteLocally, isVercel, BUCKET };
