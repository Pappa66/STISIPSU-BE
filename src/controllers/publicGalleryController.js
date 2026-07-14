const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getPublicGallery = async (req, res, next) => {
  try {
    console.log("Mencoba mengambil data untuk galeri publik...");

    // --- PERBAIKAN DI SINI: Mengubah galleryItem menjadi galleryImage ---
    const galleryItems = await prisma.galleryImage.findMany({
      orderBy: { 
        order: 'asc' 
      },
      include: {
        post: {
          select: { slug: true }
        }
      }
    });

    console.log(`Berhasil menemukan ${galleryItems.length} item galeri.`);
    console.log("Data galeri yang ditemukan:", JSON.stringify(galleryItems, null, 2));

    res.json(galleryItems);
  } catch (error) {
    console.error("Error saat mengambil galeri publik:", error);
    next(error);
  }
};

module.exports = { getPublicGallery };
