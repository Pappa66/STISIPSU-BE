const express = require('express');
const router = express.Router();
const { protect } = require('../../src/middleware/authMiddleware');
const upload = require('../upload');
const { uploadToSupabase } = require('../../src/utils/storage');
const { generateFilename, optimizeImage } = require('../upload');
const { getMyItems } = require('../../src/controllers/myRepositoryController');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.use(protect);

router.get('/', getMyItems);

router.post('/', upload.array('files', 10), async (req, res, next) => {
  const { title, author, year, studyProgram, abstract, keywords, category, gdriveLink, filesMetadata } = req.body;
  const files = req.files;
  const uploaderId = req.user.id;

  if ((!files || files.length === 0) && !gdriveLink) {
    return res.status(400).json({
      message: 'Unggah minimal satu file atau sediakan satu Link Google Drive.',
    });
  }

  try {
    const bimbingan = await prisma.bimbingan.findFirst({ where: { mahasiswaId: uploaderId } });
    if (!bimbingan) return res.status(400).json({ message: 'Anda belum memiliki dosen pembimbing.' });

    const parsedYear = parseInt(year);
    if (isNaN(parsedYear)) return res.status(400).json({ message: 'Tahun harus berupa angka.' });

    let filesToCreate = [];
    if (gdriveLink) {
      filesToCreate.push({
        alias: 'Link Google Drive',
        fileName: 'gdrive_link',
        fileUrl: gdriveLink,
      });
    }

    if (files && files.length > 0) {
      const parsedFilesMetadata = JSON.parse(filesMetadata || '[]');
      const fileData = await Promise.all(
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
      filesToCreate = [...filesToCreate, ...fileData];
    }

    const newItem = await prisma.repositoryItem.create({
      data: {
        title, author, abstract, keywords, category: category || null,
        year: parsedYear, studyProgram,
        uploaderId, advisorId: bimbingan.dosenId,
        approvalStatus: 'PENDING', visibility: 'PRIVATE',
        files: { create: filesToCreate },
      },
    });

    res.status(201).json({
      message: 'Karya ilmiah berhasil diunggah dan dikirim untuk direview.',
      item: newItem,
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', upload.array('files', 10), async (req, res, next) => {
  const { id } = req.params;
  const { title, author, year, studyProgram, abstract, keywords, category, gdriveLink, filesMetadata } = req.body;
  const files = req.files;

  try {
    const item = await prisma.repositoryItem.findUnique({ where: { id }, include: { files: true } });
    if (!item || item.uploaderId !== req.user.id) return res.status(403).json({ message: 'Aksi tidak diizinkan.' });
    if (item.approvalStatus === 'APPROVED') {
      return res.status(403).json({ message: 'Tidak dapat mengubah karya ilmiah yang sudah disetujui.' });
    }

    const parsedYear = parseInt(year);
    if (isNaN(parsedYear)) return res.status(400).json({ message: 'Tahun harus berupa angka.' });

    let newFiles = [];
    if (gdriveLink) {
      newFiles.push({ alias: 'Link Google Drive', fileName: 'gdrive_link', fileUrl: gdriveLink });
    }

    if (files && files.length > 0) {
      const parsedFilesMetadata = JSON.parse(filesMetadata || '[]');
      const fileData = await Promise.all(
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
      newFiles = [...newFiles, ...fileData];
    }

    await prisma.fileItem.deleteMany({ where: { repositoryItemId: id } });

    const updatedItem = await prisma.repositoryItem.update({
      where: { id },
      data: {
        title, author, abstract, keywords, category: category || null,
        year: parsedYear, studyProgram,
        approvalStatus: 'PENDING', rejectionReason: null,
        files: { create: newFiles },
      },
      include: { files: true },
    });

    res.json({ message: 'Karya ilmiah berhasil diperbarui.', item: updatedItem });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
