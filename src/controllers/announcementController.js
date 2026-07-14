const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

// --- FUNGSI UNTUK ADMIN ---

// Mengambil semua pengumuman untuk ditampilkan di tabel admin
const getAllAnnouncementsAdmin = async (req, res, next) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(announcements);
  } catch (error) {
    next(error);
  }
};

// Membuat pengumuman baru
const createAnnouncement = async (req, res, next) => {
  const { title, type, content, imageUrl, isActive, expiresAt } = req.body;
  try {
    const newAnnouncement = await prisma.announcement.create({
      data: {
        title,
        type,
        content: type === 'TEXT' ? content : null,
        imageUrl: type === 'IMAGE' ? imageUrl : null,
        isActive: isActive || false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    res.status(201).json(newAnnouncement);
  } catch (error) {
    next(error);
  }
};

// Memperbarui pengumuman
const updateAnnouncement = async (req, res, next) => {
  const { id } = req.params;
  const { title, type, content, imageUrl, isActive, expiresAt } = req.body;
  try {
    const updatedAnnouncement = await prisma.announcement.update({
      where: { id },
      data: {
        title,
        type,
        content: type === 'TEXT' ? content : null,
        imageUrl: type === 'IMAGE' ? imageUrl : null,
        isActive,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    res.status(200).json(updatedAnnouncement);
  } catch (error) {
    next(error);
  }
};

// Menghapus pengumuman
const deleteAnnouncement = async (req, res, next) => {
  const { id } = req.params;
  try {
    const announcementToDelete = await prisma.announcement.findUnique({
      where: { id },
    });

    if (announcementToDelete?.imageUrl) {
      const filePath = path.join(__dirname, '..', '..', 'public', announcementToDelete.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.announcement.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Pengumuman berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
};

// --- FUNGSI UNTUK PUBLIK ---

// Mengambil satu pengumuman aktif untuk PUBLIC
const getActiveAnnouncement = async (req, res, next) => {
  try {
    const announcement = await prisma.announcement.findFirst({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(announcement);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllAnnouncementsAdmin,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getActiveAnnouncement,
};
