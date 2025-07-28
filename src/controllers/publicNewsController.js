const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Fungsi untuk mengambil SEMUA berita (sudah ada)
const getPublicNews = async (req, res, next) => {
  try {
    const news = await prisma.post.findMany({
      where: {
        type: 'NEWS',
        isPublished: true
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { name: true } }
      }
    });
    res.json({ news });
  } catch (error) {
    next(error);
  }
};

// --- FUNGSI BARU: Mengambil SATU berita berdasarkan slug ---
const getPublicNewsBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const newsItem = await prisma.post.findFirst({
      where: {
        slug: slug,
        type: 'NEWS',
        isPublished: true, // Pastikan hanya berita yang sudah terbit yang bisa diakses
      },
      include: {
        author: { select: { name: true } },
      },
    });

    if (!newsItem) {
      // Jika tidak ditemukan, kirim 404
      return res.status(404).json({ message: 'Berita tidak ditemukan.' });
    }

    res.json(newsItem);
  } catch (error) {
    next(error);
  }
};

// Ekspor kedua fungsi
module.exports = { getPublicNews, getPublicNewsBySlug };
