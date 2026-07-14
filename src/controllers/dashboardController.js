const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalAdmins,
      totalLecturers,
      totalStudents,
      totalPosts,
      totalNews,
      totalPages,
      totalPublishedNews,
      totalRepository,
      totalApprovedRepo,
      totalPendingRepo,
      totalRejectedRepo,
      totalGallery,
      totalBanners,
      submissionsByMonth,
      recentItems,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "DOSEN" } }),
      prisma.user.count({ where: { role: "MAHASISWA" } }),
      prisma.post.count(),
      prisma.post.count({ where: { type: "NEWS" } }),
      prisma.post.count({ where: { type: "PAGE", isPublished: true } }),
      prisma.post.count({ where: { type: "NEWS", isPublished: true } }),
      prisma.repositoryItem.count(),
      prisma.repositoryItem.count({ where: { approvalStatus: "APPROVED", visibility: "PUBLISHED" } }),
      prisma.repositoryItem.count({ where: { approvalStatus: "PENDING" } }),
      prisma.repositoryItem.count({ where: { approvalStatus: "REJECTED" } }),
      prisma.galleryImage.count(),
      prisma.banner.count(),
      prisma.$queryRawUnsafe(`
        SELECT TO_CHAR("createdAt", 'YYYY-MM') as month, COUNT(*)::int as count
        FROM "RepositoryItem"
        WHERE "createdAt" >= NOW() - INTERVAL '6 months'
        GROUP BY month ORDER BY month ASC
      `),
      prisma.repositoryItem.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, approvalStatus: true, createdAt: true, uploader: { select: { name: true } } },
      }),
    ]);

    res.json({
      users: { total: totalUsers, admins: totalAdmins, lecturers: totalLecturers, students: totalStudents },
      content: { totalPosts, news: totalNews, publishedNews: totalPublishedNews, pages: totalPages },
      repository: { total: totalRepository, approved: totalApprovedRepo, pending: totalPendingRepo, rejected: totalRejectedRepo },
      gallery: totalGallery,
      banners: totalBanners,
      submissionsByMonth: submissionsByMonth || [],
      recentItems,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats };
