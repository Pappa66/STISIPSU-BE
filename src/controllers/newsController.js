const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- FUNGSI MEMBUAT BERITA BARU ---
const createNews = async (req, res, next) => {
    const { title } = req.body;
    const authorId = req.user?.userId;

    if (!authorId) {
        return res.status(401).json({ message: "Otentikasi gagal." });
    }
    if (!title || title.trim() === '') {
        return res.status(400).json({ message: "Judul tidak boleh kosong." });
    }

    try {
        // Buat post baru dengan tipe 'NEWS'
        const newNewsPost = await prisma.post.create({
            data: {
                title,
                authorId: authorId,
                type: 'NEWS', // Filter utama: Tandai sebagai Berita
                blocks: [
                    { id: `heading-${Date.now()}`, type: 'heading', content: title }
                ]
            }
        });
        res.status(201).json(newNewsPost);
    } catch (error) {
        next(error);
    }
};

// --- FUNGSI MENGAMBIL SEMUA BERITA ---
const getAllNews = async (req, res, next) => {
    try {
        const { search } = req.query;
        const whereClause = {
            type: 'NEWS', // Filter utama: hanya ambil Berita
            ...(search && { title: { contains: search, mode: 'insensitive' } })
        };

        const newsItems = await prisma.post.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                author: { select: { name: true } },
            }
        });
        
        // Kirim dengan nama 'news' agar lebih jelas di frontend
        res.json({ news: newsItems }); 
    } catch (error) { 
        next(error); 
    }
};

module.exports = { createNews, getAllNews };