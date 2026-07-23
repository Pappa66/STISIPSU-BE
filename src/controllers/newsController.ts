const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('../utils/activityLog');

// --- FUNGSI MEMBUAT BERITA BARU ---
const createNews = async (req, res, next) => {
    const { title, blocks, slug, featuredImageUrl, tags } = req.body;
    const authorId = req.user?.userId;

    if (!authorId) return res.status(401).json({ message: "Otentikasi gagal." });
    if (!title || title.trim() === '') return res.status(400).json({ message: "Judul tidak boleh kosong." });

    try {
        const newNewsPost = await prisma.post.create({
            data: {
                title,
                authorId: authorId,
                slug,
                blocks: blocks || [{ id: `heading-${Date.now()}`, type: 'heading', content: title }],
                type: 'NEWS',
                isPublished: true,
                featuredImageUrl,
                tags
            }
        });

        // Jika ada gambar, langsung buat entri galeri
        if (featuredImageUrl) {
            await prisma.galleryImage.create({
                data: {
                    title,
                    imageUrl: featuredImageUrl,
                    postId: newNewsPost.id
                }
            });
        }

        await logActivity(req.user.id, 'CREATE', 'News', newNewsPost.id, { title: newNewsPost.title, type: newNewsPost.type });
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
