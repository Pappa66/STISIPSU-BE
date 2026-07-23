const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { uploadToSupabase } = require('../src/utils/storage');
const prisma = new PrismaClient();

router.get('/:fileId', async (req, res, next) => {
  const { fileId } = req.params;
  try {
    const file = await prisma.fileItem.findUnique({ where: { id: fileId } });
    if (!file) return res.status(404).json({ message: 'File tidak ditemukan' });

    await prisma.fileItem.update({
      where: { id: fileId },
      data: { downloads: { increment: 1 } },
    });

    if (file.fileUrl.startsWith('http')) {
      return res.redirect(file.fileUrl);
    }

    const supabase = require('../src/lib/supabase');
    if (supabase) {
      const match = file.fileUrl.match(/^uploads\/(.+)/);
      if (match) {
        const { data } = supabase.storage
          .from(process.env.SUPABASE_BUCKET || 'uploads')
          .getPublicUrl(`public/${match[1]}`);
        return res.redirect(data.publicUrl);
      }
    }

    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), 'public', file.fileUrl);
    if (fs.existsSync(filePath)) {
      return res.download(filePath, file.fileName || file.alias);
    }

    res.status(404).json({ message: 'File tidak ditemukan' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
