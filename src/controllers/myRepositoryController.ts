const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const prisma = new PrismaClient();
const { logActivity } = require("../utils/activityLog");

/**
 * GET /api/my-repository
 */
const getMyItems = async (req, res, next) => {
  try {
    const items = await prisma.repositoryItem.findMany({
      where: { uploaderId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        advisor: { select: { name: true } },
        secondAdvisor: { select: { name: true } },
        files: { select: { id: true, alias: true, fileUrl: true } },
      },
    });
    res.status(200).json(items);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/my-repository
 */
const createMyItem = async (req, res, next) => {
  const {
    title,
    author,
    year,
    studyProgram,
    abstract,
    keywords,
    category,
    gdriveLink,
    filesMetadata,
  } = req.body;
  const files = req.files;
  const uploaderId = req.user.id;

  if ((!files || files.length === 0) && !gdriveLink) {
    return res.status(400).json({
      message: "Unggah minimal satu file atau sediakan satu Link Google Drive.",
    });
  }

  try {
    const bimbingan = await prisma.bimbingan.findFirst({
      where: { mahasiswaId: uploaderId },
    });
    if (!bimbingan) {
      return res
        .status(400)
        .json({ message: "Anda belum memiliki dosen pembimbing." });
    }

    const advisorId = bimbingan.dosenId;
    const parsedYear = parseInt(year);
    if (isNaN(parsedYear))
      return res.status(400).json({ message: "Tahun harus berupa angka." });

    let filesToCreate: any[] = [];
    if (gdriveLink) {
      filesToCreate.push({
        alias: "Link Google Drive",
        fileName: "gdrive_link",
        fileUrl: gdriveLink,
      });
    }

    if (files && files.length > 0) {
      const parsedFilesMetadata = JSON.parse(filesMetadata || "[]");
      const fileData = files.map((file) => ({
        alias:
          parsedFilesMetadata.find((m) => m.originalName === file.originalname)
            ?.alias || file.originalname,
        fileName: file.filename,
        fileUrl: `uploads/${file.filename}`,
      }));
      filesToCreate = [...filesToCreate, ...fileData];
    }

    const newItem = await prisma.repositoryItem.create({
      data: {
        title,
        author,
        abstract,
        keywords,
        category: category || null,
        year: parsedYear,
        studyProgram,
        uploaderId,
        advisorId,
        approvalStatus: "PENDING",
        visibility: "PRIVATE",
        files: {
          create: filesToCreate,
        },
      },
    });

    await logActivity(req.user.id, 'CREATE', 'RepositoryItem', newItem.id, { title: newItem.title });
    res.status(201).json({
      message: "Karya ilmiah berhasil diunggah dan dikirim untuk direview.",
      item: newItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/my-repository/:id
 */
const updateMyItem = async (req, res, next) => {
  const { id } = req.params;
  const {
    title,
    author,
    year,
    studyProgram,
    abstract,
    keywords,
    category,
    gdriveLink,
    filesMetadata,
  } = req.body;

  const files = req.files;

  try {
    const item = await prisma.repositoryItem.findUnique({
      where: { id },
      include: { files: true },
    });

    if (!item || item.uploaderId !== req.user.id) {
      return res.status(403).json({ message: "Aksi tidak diizinkan." });
    }

    if (item.approvalStatus === "APPROVED") {
      return res.status(403).json({
        message: "Tidak dapat mengubah karya ilmiah yang sudah disetujui.",
      });
    }

    const parsedYear = parseInt(year);
    if (isNaN(parsedYear)) {
      return res.status(400).json({ message: "Tahun harus berupa angka." });
    }

    let newFiles: any[] = [];
    if (gdriveLink) {
      newFiles.push({
        alias: "Link Google Drive",
        fileName: "gdrive_link",
        fileUrl: gdriveLink,
      });
    }

    if (files && files.length > 0) {
      const parsedFilesMetadata = JSON.parse(filesMetadata || "[]");
      const fileData = files.map((file) => ({
        alias:
          parsedFilesMetadata.find((m) => m.originalName === file.originalname)
            ?.alias || file.originalname,
        fileName: file.filename,
        fileUrl: `uploads/${file.filename}`,
      }));
      newFiles = [...newFiles, ...fileData];
    }

    // 🔥 Hapus file lama dari disk kalau lokal
    for (const oldFile of item.files) {
      if (oldFile.fileUrl && oldFile.fileUrl.startsWith("uploads/")) {
        const filePath = path.join(__dirname, "..", oldFile.fileUrl);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error(`Gagal hapus file lama: ${filePath}`, (err as any).message);
        }
      }
    }

    // 🔥 Hapus record file dari DB
    await prisma.fileItem.deleteMany({
      where: { repositoryItemId: id },
    });

    // 🔁 Update repositoryItem
    const updatedItem = await prisma.repositoryItem.update({
      where: { id },
      data: {
        title,
        author,
        abstract,
        keywords,
        category: category || null,
        year: parsedYear,
        studyProgram,
        approvalStatus: "PENDING",
        rejectionReason: null,
        files: {
          create: newFiles,
        },
      },
      include: {
        files: true,
      },
    });

    await logActivity(req.user.id, 'UPDATE', 'RepositoryItem', id, { title });
    res.json({
      message: "Karya ilmiah berhasil diperbarui.",
      item: updatedItem,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyItems,
  createMyItem,
  updateMyItem,
};
