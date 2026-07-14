const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Fungsi ini hampir sama dengan postController, tapi selalu menyertakan filter type: 'PAGE'

const createPage = async (req, res, next) => {
    const { title } = req.body;
    const authorId = req.user?.userId;
    if (!authorId) return res.status(401).json({ message: "Otentikasi gagal." });
    if (!title || title.trim() === '') return res.status(400).json({ message: "Judul tidak boleh kosong." });

    try {
        const newPage = await prisma.post.create({
            data: {
                title,
                authorId: authorId,
                type: 'PAGE', // Otomatis set tipenya sebagai Halaman
                blocks: [{ id: `heading-${Date.now()}`, type: 'heading', content: title }]
            }
        });
        res.status(201).json(newPage);
    } catch (error) { next(error); }
};

const getPages = async (req, res, next) => {
    try {
        const { search } = req.query;
        const whereClause = {
            type: 'PAGE', // Filter utama: hanya ambil Halaman
            ...(search && { title: { contains: search, mode: 'insensitive' } })
        };

        const pages = await prisma.post.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                author: { select: { name: true } },
                menuItem: { select: { name: true } },
                submenuItem: { select: { name: true, menuItem: { select: { name: true } } } }
            }
        });
        // Mengirim data dengan format yang sama seperti postController agar frontend mudah beradaptasi
        res.json({ posts: pages }); 
    } catch (error) { next(error); }
};

module.exports = { createPage, getPages };
