const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../../src/middleware/authMiddleware');
const upload = require('../upload');
const { uploadToSupabase } = require('../../src/utils/storage');
const { generateFilename, optimizeImage } = require('../upload');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const {
  getPublicRepositoryItems,
  getAllRepositoryItemsForAdmin,
  getRepositoryItemById,
  updateRepositoryItem,
  deleteRepositoryItem,
  deleteFileItem,
  getRepositoryStats,
  incrementRepositoryViews,
} = require('../../src/controllers/repositoryController');

const createRepositoryItem = async (req, res, next) => {
  const { title, author, year, studyProgram, abstract, keywords, advisorId, filesMetadata } = req.body;
  const files = req.files;
  if (!req.user?.userId) return res.status(401).json({ message: 'Otentikasi gagal.' });
  if (!files || files.length === 0)
    return res.status(400).json({ message: 'Minimal satu file harus diunggah' });

  try {
    const parsedFilesMetadata = JSON.parse(filesMetadata || '[]');
    const parsedYear = parseInt(year);
    if (isNaN(parsedYear)) return res.status(400).json({ message: 'Tahun harus berupa angka.' });

    const filesToCreate = await Promise.all(
      files.map(async (file) => {
        const { buffer, mimetype } = await optimizeImage(file.buffer, file.mimetype);
        const fname = generateFilename(file.originalname);
        const url = await uploadToSupabase(buffer, fname, mimetype);
        const meta = parsedFilesMetadata.find((m) => m.originalName === file.originalname);
        return {
          alias: meta?.alias || file.originalname,
          fileName: file.originalname,
          fileUrl: url,
        };
      })
    );

    const newItem = await prisma.repositoryItem.create({
      data: {
        title, author, abstract, keywords,
        year: parsedYear, studyProgram,
        visibility: 'PRIVATE', approvalStatus: 'PENDING',
        advisorId: advisorId || null,
        uploaderId: req.user.userId,
        files: { create: filesToCreate },
      },
      include: { files: true },
    });
    res.status(201).json(newItem);
  } catch (error) {
    next(error);
  }
};

const addFilesToRepositoryItem = async (req, res, next) => {
  const { id } = req.params;
  const files = req.files;
  const { filesMetadata } = req.body;
  if (!files || files.length === 0) return res.status(400).json({ message: 'Tidak ada file yang dipilih.' });

  try {
    const parsedFilesMetadata = JSON.parse(filesMetadata || '[]');
    const filesToCreate = await Promise.all(
      files.map(async (file) => {
        const { buffer, mimetype } = await optimizeImage(file.buffer, file.mimetype);
        const fname = generateFilename(file.originalname);
        const url = await uploadToSupabase(buffer, fname, mimetype);
        const meta = parsedFilesMetadata.find((m) => m.originalName === file.originalname);
        return {
          alias: meta?.alias || file.originalname,
          fileName: file.originalname,
          fileUrl: url,
          repositoryItemId: id,
        };
      })
    );
    await prisma.fileItem.createMany({ data: filesToCreate });
    res.status(201).json({ message: `${files.length} file berhasil ditambahkan.` });
  } catch (error) {
    next(error);
  }
};

router.get('/stats', getRepositoryStats);
router.patch('/:id/views', incrementRepositoryViews);

router.route('/')
  .get(getPublicRepositoryItems)
  .post(protect, isAdmin, upload.array('files', 10), createRepositoryItem);

router.route('/admin/all')
  .get(protect, isAdmin, getAllRepositoryItemsForAdmin);

router.route('/:id/files')
  .post(protect, isAdmin, upload.array('files', 10), addFilesToRepositoryItem);

router.route('/files/:fileId')
  .delete(protect, isAdmin, deleteFileItem);

router.route('/:id')
  .get(getRepositoryItemById)
  .put(protect, isAdmin, updateRepositoryItem)
  .delete(protect, isAdmin, deleteRepositoryItem);

module.exports = router;
