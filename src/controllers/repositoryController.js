// File: src/controllers/repositoryController.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs").promises;
const path = require("path");

// --- FUNGSI UNTUK HALAMAN PUBLIK ---
const getPublicRepositoryItems = async (req, res, next) => {
  try {
    const { year, studyProgram, search } = req.query;
    const whereClause = {
      visibility: "PUBLISHED",
      approvalStatus: "APPROVED",
    };

    if (year) whereClause.year = parseInt(year);
    if (studyProgram) whereClause.studyProgram = studyProgram;
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { author: { contains: search, mode: "insensitive" } },
        { keywords: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.repositoryItem.findMany({
      where: whereClause,
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        author: true,
        year: true,
        studyProgram: true,
        showDownloadsToPublic: true,
        publishedAt: true,
        createdAt: true,
        views: true,
        abstract: true,
        files: {
          select: {
            id: true,
            alias: true,
            fileUrl: true,
            downloads: true,
          },
        },
      },
    });

    const formattedItems = items.map((item) => ({
      ...item,
      fileUrl: item.files.length > 0 ? item.files[0].fileUrl : null,
      fileId: item.files.length > 0 ? item.files[0].id : null,
      totalDownloads: item.files.reduce((sum, f) => sum + f.downloads, 0),
      files: undefined,
    }));

    res.status(200).json(formattedItems);
  } catch (error) {
    next(error);
  }
};

// --- FUNGSI UNTUK DASBOR ADMIN ---
const getAllRepositoryItemsForAdmin = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    const whereClause = search
      ? { title: { contains: search, mode: "insensitive" } }
      : {};

    const items = await prisma.repositoryItem.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        uploader: { select: { name: true } },
        advisor: { select: { name: true } },
      },
    });

    const totalItems = await prisma.repositoryItem.count({
      where: whereClause,
    });

    res.json({
      items,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
    });
  } catch (error) {
    next(error);
  }
};

// --- FUNGSI UNTUK DETAIL ITEM ---
const getRepositoryItemById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const item = await prisma.repositoryItem.findUnique({
      where: { id },
      include: {
        files: { select: { id: true, alias: true, fileUrl: true, downloads: true } },
        uploader: { select: { name: true } },
        advisor: { select: { name: true } },
      },
    });
    if (!item) {
      return res.status(404).json({ message: "Item tidak ditemukan" });
    }

    const isPubliclyVisible =
      item.visibility === "PUBLISHED" && item.approvalStatus === "APPROVED";

    // Cek otorisasi untuk item yang tidak publik
    if (!isPubliclyVisible && (!req.user || req.user.role !== "ADMIN")) {
      return res
        .status(403)
        .json({ message: "Anda tidak memiliki akses untuk melihat item ini." });
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/repository-items/:id/views
const incrementRepositoryViews = async (req, res, next) => {
  const { id } = req.params;
  console.log("📥 PATCH view diterima untuk ID:", id);

  try {
    const updated = await prisma.repositoryItem.update({
      where: { id },
      data: { views: { increment: 1 } },
      select: { views: true },
    });

    console.log("✅ View berhasil ditambah jadi:", updated.views);
    res.status(200).json({ views: updated.views });
  } catch (error) {
    console.error("❌ ERROR saat update views:", error.message);
    next(error);
  }
};

// --- FUNGSI UNTUK MEMBUAT ITEM ---
const createRepositoryItem = async (req, res, next) => {
  const {
    title,
    author,
    year,
    studyProgram,
    abstract,
    keywords,
    advisorId,
    filesMetadata,
  } = req.body;
  const files = req.files;
  if (!req.user?.userId)
    return res.status(401).json({ message: "Otentikasi gagal." });
  if (!files || files.length === 0)
    return res
      .status(400)
      .json({ message: "Minimal satu file harus diunggah" });

  try {
    const parsedFilesMetadata = JSON.parse(filesMetadata);
    const parsedYear = parseInt(year);
    if (isNaN(parsedYear))
      return res.status(400).json({ message: "Tahun harus berupa angka." });

    const newItem = await prisma.repositoryItem.create({
      data: {
        title,
        author,
        abstract,
        keywords,
        year: parsedYear,
        studyProgram,
        visibility: "PRIVATE",
        approvalStatus: "PENDING",
        advisorId: advisorId || null,
        uploaderId: req.user.userId,
        files: {
          create: files.map((file) => ({
            alias:
              parsedFilesMetadata.find(
                (m) => m.originalName === file.originalname
              )?.alias || file.originalname,
            fileName: file.filename,
            fileUrl: `uploads/${file.filename}`,
          })),
        },
      },
      include: { files: true },
    });
    res.status(201).json(newItem);
  } catch (error) {
    next(error);
  }
};

// --- FUNGSI UNTUK MEMPERBARUI ITEM ---
const updateRepositoryItem = async (req, res, next) => {
  const { id } = req.params;
  const {
    title,
    author,
    year,
    studyProgram,
    abstract,
    keywords,
    advisorId,
    visibility,
    status, // ✅
    approvalStatus,
    rejectionReason,
    showDownloadsToPublic,
  } = req.body;

  try {
    const dataToUpdate = {
      title,
      author,
      studyProgram,
      abstract,
      keywords,
      advisorId,
      visibility: status || visibility, // ✅ FIX DISINI
      approvalStatus,
      rejectionReason,
      showDownloadsToPublic,
      year: year !== undefined ? parseInt(year) : undefined,
      publishedAt: (status || visibility) === "PUBLISHED" ? new Date() : null,
    };

    // Hapus key yang nilainya undefined (jaga-jaga)
    Object.keys(dataToUpdate).forEach(
      (key) => dataToUpdate[key] === undefined && delete dataToUpdate[key]
    );

    const item = await prisma.repositoryItem.update({
      where: { id },
      data: dataToUpdate,
    });

    res.json(item);
  } catch (error) {
    next(error);
  }
};

// --- FUNGSI UNTUK MENGHAPUS ITEM ---
const deleteRepositoryItem = async (req, res, next) => {
  const { id } = req.params;
  try {
    await prisma.$transaction(async (tx) => {
      const itemToDelete = await tx.repositoryItem.findUnique({
        where: { id },
        include: { files: true },
      });
      if (!itemToDelete) throw new Error("Item tidak ditemukan.");
      for (const file of itemToDelete.files) {
        if (!file.fileUrl.startsWith("http")) {
          const filePath = path.join(process.cwd(), "public", file.fileUrl);
          try {
            await fs.unlink(filePath);
          } catch (unlinkError) {
            console.warn(
              `File tidak ditemukan saat mencoba menghapus: ${filePath}`
            );
          }
        }
      }
      await tx.repositoryItem.delete({ where: { id } });
    });
    res.json({ message: "Item dan file terkait berhasil dihapus" });
  } catch (error) {
    next(error);
  }
};

console.log("?? Mencoba ambil statistik repo");

const getRepositoryStats = async (req, res, next) => {
  try {
    console.log("?? Querying data...");
    const [totalRepositories, totalFiles, totalUsers, items] =
      await Promise.all([
        prisma.repositoryItem.count({
          where: {
            visibility: "PUBLISHED",
            approvalStatus: "APPROVED",
          },
        }),
        prisma.fileItem.count(),
        prisma.user.count(),
        prisma.repositoryItem.findMany({
          where: {
            visibility: "PUBLISHED",
            approvalStatus: "APPROVED",
          },
          select: { author: true },
        }),
      ]);

    console.log("?? totalRepositories:", totalRepositories);
    console.log("?? totalFiles:", totalFiles);
    console.log("?? totalUsers:", totalUsers);
    console.log("?? totalItems:", items.length);

    const authorsSet = new Set(
      items.map((item) =>
        typeof item.author === "string"
          ? item.author.trim()
          : item.author?.name?.trim()
      ).filter(Boolean)
    );

    const totalAuthors = authorsSet.size;

    return res.status(200).json({
      totalRepositories,
      totalFiles,
      totalUsers,
      totalAuthors,
    });
  } catch (error) {
    console.error("? Gagal ambil statistik:", error);
    next(error);
  }
};

// --- FUNGSI UNTUK MENAMBAH & MENGHAPUS FILE ---
const addFilesToRepositoryItem = async (req, res, next) => {
  const { id } = req.params;
  const files = req.files;
  const { filesMetadata } = req.body;
  if (!files || files.length === 0)
    return res.status(400).json({ message: "Tidak ada file yang dipilih." });
  try {
    const parsedFilesMetadata = JSON.parse(filesMetadata);
    const filesToCreate = files.map((file) => ({
      alias:
        parsedFilesMetadata.find((m) => m.originalName === file.originalname)
          ?.alias || file.originalname,
      fileName: file.filename,
      fileUrl: `uploads/${file.filename}`,
      repositoryItemId: id,
    }));
    await prisma.fileItem.createMany({ data: filesToCreate });
    res
      .status(201)
      .json({ message: `${files.length} file berhasil ditambahkan.` });
  } catch (error) {
    next(error);
  }
};

const deleteFileItem = async (req, res, next) => {
  const { fileId } = req.params;
  try {
    const fileToDelete = await prisma.fileItem.findUnique({
      where: { id: fileId },
    });
    if (!fileToDelete)
      return res.status(404).json({ message: "File tidak ditemukan." });
    if (!fileToDelete.fileUrl.startsWith("http")) {
      const filePath = path.join(process.cwd(), "public", fileToDelete.fileUrl);
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.warn(`File di disk tidak ditemukan: ${filePath}`);
      }
    }
    await prisma.fileItem.delete({ where: { id: fileId } });
    res.json({ message: "File berhasil dihapus." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicRepositoryItems,
  getAllRepositoryItemsForAdmin,
  getRepositoryItemById,
  createRepositoryItem,
  updateRepositoryItem,
  deleteRepositoryItem,
  addFilesToRepositoryItem,
  getRepositoryStats,
  deleteFileItem,
  incrementRepositoryViews, // ✅ TAMBAHKAN INI
};
