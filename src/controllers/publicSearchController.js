const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const searchAll = async (req, res, next) => {
    const q = req.query.q;
    if (!q || q.trim().length === 0) {
        return res.status(400).json({ message: "Query pencarian tidak boleh kosong" });
    }

    const keyword = q.trim();

    try {
        // Cari juga dari konten blocks via raw SQL (JSONB text search)
        const blockMatches = await prisma.$queryRaw`
            SELECT id FROM "Post"
            WHERE blocks IS NOT NULL
              AND blocks::text ILIKE ${'%' + keyword + '%'}
              AND "isPublished" = true
        `;
        const blockIds = blockMatches.map(b => b.id);

        const [posts, repositories, galleries] = await Promise.all([
            prisma.post.findMany({
                where: {
                    isPublished: true,
                    OR: [
                        { title: { contains: keyword, mode: "insensitive" } },
                        { tags: { has: keyword.toLowerCase() } },
                        { id: { in: blockIds } },
                    ],
                },
                select: { id: true, title: true, slug: true, createdAt: true, type: true },
                take: 10,
            }),
            prisma.repositoryItem.findMany({
                where: {
                    visibility: "PUBLISHED",
                    approvalStatus: "APPROVED",
                    OR: [
                        { title: { contains: keyword, mode: "insensitive" } },
                        { author: { contains: keyword, mode: "insensitive" } },
                        { keywords: { contains: keyword, mode: "insensitive" } },
                        { studyProgram: { contains: keyword, mode: "insensitive" } },
                    ],
                },
                select: { id: true, title: true, author: true, year: true },
                take: 10,
            }),
            prisma.galleryImage.findMany({
                where: {
                    OR: [
                        { title: { contains: keyword, mode: "insensitive" } },
                        { description: { contains: keyword, mode: "insensitive" } },
                    ],
                },
                select: { id: true, title: true, imageUrl: true },
                take: 10,
            }),
        ]);

        res.json({ posts, repositories, galleries });
    } catch (error) {
        next(error);
    }
};

module.exports = { searchAll };
