const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

// --- FUNGSI MENGAMBIL SEMUA GAMBAR GALERI ---
const getGalleryImages = async (req, res, next) => {
    try {
        const images = await prisma.galleryImage.findMany({
            orderBy: { order: 'asc' },
        });
        res.status(200).json(images);
    } catch (error) {
        next(error);
    }
};

// --- FUNGSI UPLOAD GAMBAR BARU (BISA BANYAK) ---
const uploadGalleryImages = async (req, res, next) => {
    // Diasumsikan middleware 'upload' (dari multer) sudah menangani file
    // dan menyimpannya di req.files
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    try {
        const lastImage = await prisma.galleryImage.findFirst({
            orderBy: { order: 'desc' },
        });
        let currentOrder = lastImage ? lastImage.order + 1 : 0;

        const imagePromises = req.files.map((file, index) => {
            const imageUrl = `/uploads/${file.filename}`; // Path relatif ke file
            return prisma.galleryImage.create({
                data: {
                    title: file.originalname.split('.').slice(0, -1).join('.'), // Judul default dari nama file
                    description: '',
                    imageUrl: imageUrl,
                    order: currentOrder + index,
                },
            });
        });

        await Promise.all(imagePromises);

        res.status(201).json({ message: `${req.files.length} gambar berhasil diunggah.` });
    } catch (error) {
        next(error);
    }
};

// --- FUNGSI MEMPERBARUI JUDUL/DESKRIPSI GAMBAR ---
const updateGalleryImage = async (req, res, next) => {
    const { id } = req.params;
    const { title, description } = req.body;

    try {
        const updatedImage = await prisma.galleryImage.update({
            where: { id },
            data: { title, description },
        });
        res.status(200).json(updatedImage);
    } catch (error) {
        next(error);
    }
};

// --- FUNGSI MENGHAPUS GAMBAR ---
const deleteGalleryImage = async (req, res, next) => {
    const { id } = req.params;
    try {
        // 1. Ambil data gambar untuk mendapatkan path filenya
        const imageToDelete = await prisma.galleryImage.findUnique({
            where: { id },
        });

        if (!imageToDelete) {
            return res.status(404).json({ message: 'Gambar tidak ditemukan.' });
        }

        // 2. Hapus file fisik dari server
        const filePath = path.join(__dirname, '..', '..', 'public', imageToDelete.imageUrl);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // 3. Hapus record dari database
        await prisma.galleryImage.delete({
            where: { id },
        });

        res.status(200).json({ message: 'Gambar berhasil dihapus.' });
    } catch (error) {
        next(error);
    }
};

// --- FUNGSI MENGURUTKAN ULANG GAMBAR ---
const reorderGalleryImages = async (req, res, next) => {
    const { items } = req.body; // Menerima array of { id, order }

    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: 'Data urutan tidak valid.' });
    }

    try {
        const updatePromises = items.map(item =>
            prisma.galleryImage.update({
                where: { id: item.id },
                data: { order: item.order },
            })
        );
        await prisma.$transaction(updatePromises);
        res.status(200).json({ message: 'Urutan galeri berhasil diperbarui.' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getGalleryImages,
    uploadGalleryImages,
    updateGalleryImage,
    deleteGalleryImage,
    reorderGalleryImages,
};