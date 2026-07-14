const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

// --- FUNGSI MENGAMBIL SEMUA GAMBAR GALERI ---
const getGalleryImages = async (req, res, next) => {
    try {
        const images = await prisma.galleryImage.findMany({
            orderBy: { order: 'asc' }, // Tetap urutkan berdasarkan 'order' untuk konsistensi tampilan
            include: {
                post: {
                    select: { slug: true }
                }
            }
        });
        res.json(images);
    } catch (err) {
        next(err);
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
        // Ambil 'order' tertinggi dari gambar yang sudah ada
        // Ini penting agar gambar baru selalu ditambahkan di akhir urutan yang ada
        const lastImage = await prisma.galleryImage.findFirst({
            orderBy: { order: 'desc' },
        });
        // Tentukan 'order' awal untuk gambar baru
        // Jika tidak ada gambar, mulai dari 0. Jika ada, lanjutkan dari 'order' terakhir + 1.
        let currentOrder = lastImage ? lastImage.order + 1 : 0;

        const imagePromises = req.files.map((file, index) => {
            const imageUrl = `/uploads/${file.filename}`; // Path relatif ke file di direktori public
            return prisma.galleryImage.create({
                data: {
                    title: file.originalname.split('.').slice(0, -1).join('.'), // Judul default dari nama file tanpa ekstensi
                    description: '', // Deskripsi default kosong
                    imageUrl: imageUrl,
                    order: currentOrder + index, // Berikan 'order' yang berurutan untuk setiap gambar yang diunggah
                },
            });
        });

        // Jalankan semua operasi pembuatan gambar secara paralel
        await Promise.all(imagePromises);

        res.status(201).json({ message: `${req.files.length} gambar berhasil diunggah.` });
    } catch (error) {
        // Tangani error jika terjadi masalah saat mengunggah atau menyimpan ke database
        next(error);
    }
};

// --- FUNGSI MEMPERBARUI JUDUL/DESKRIPSI GAMBAR ---
const updateGalleryImage = async (req, res, next) => {
    const { id } = req.params; // Ambil ID gambar dari parameter URL
    const { title, description } = req.body; // Ambil judul dan deskripsi dari body request

    try {
        const updatedImage = await prisma.galleryImage.update({
            where: { id }, // Cari gambar berdasarkan ID
            data: { title, description }, // Update judul dan deskripsi
        });
        res.status(200).json(updatedImage); // Kirim kembali data gambar yang sudah diperbarui
    } catch (error) {
        // Tangani error jika terjadi masalah saat memperbarui
        next(error);
    }
};

// --- FUNGSI MENGHAPUS GAMBAR ---
const deleteGalleryImage = async (req, res, next) => {
    const { id } = req.params; // Ambil ID gambar dari parameter URL
    try {
        // 1. Ambil data gambar dari database untuk mendapatkan path filenya
        const imageToDelete = await prisma.galleryImage.findUnique({
            where: { id },
        });

        if (!imageToDelete) {
            return res.status(404).json({ message: 'Gambar tidak ditemukan.' });
        }

        // 2. Tentukan path lengkap file fisik di server dan hapus
        // path.join(__dirname, '..', '..', 'public') akan mengarahkan ke direktori 'public'
        const filePath = path.join(__dirname, '..', '..', 'public', imageToDelete.imageUrl);
        if (fs.existsSync(filePath)) { // Periksa apakah file benar-benar ada sebelum dihapus
            fs.unlinkSync(filePath); // Hapus file secara sinkron
        }

        // 3. Hapus record gambar dari database
        await prisma.galleryImage.delete({
            where: { id },
        });

        res.status(200).json({ message: 'Gambar berhasil dihapus.' }); // Beri respons sukses
    } catch (error) {
        // Tangani error jika terjadi masalah saat menghapus
        next(error);
    }
};

// --- FUNGSI MENGURUTKAN ULANG GAMBAR ---
// FUNGSI INI DIHAPUS KARENA FITUR DRAG AND DROP TIDAK DIGUNAKAN LAGI DI FRONTEND ADMIN
// const reorderGalleryImages = async (req, res, next) => {
//     const { items } = req.body;

//     if (!items || !Array.isArray(items)) {
//         return res.status(400).json({ message: 'Data urutan tidak valid.' });
//     }

//     try {
//         const updatePromises = items.map(item =>
//             prisma.galleryImage.update({
//                 where: { id: item.id },
//                 data: { order: item.order },
//             })
//         );
//         await prisma.$transaction(updatePromises);
//         res.status(200).json({ message: 'Urutan galeri berhasil diperbarui.' });
//     } catch (error) {
//         next(error);
//     }
// };

module.exports = {
    getGalleryImages,
    uploadGalleryImages,
    updateGalleryImage,
    deleteGalleryImage,
    // Pastikan `reorderGalleryImages` tidak diexport lagi
    // reorderGalleryImages,
};