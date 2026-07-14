const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const path = require("path");

const getActiveBanners = async (req, res, next) => {
  try {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    res.json(banners);
  } catch (error) {
    next(error);
  }
};

const getAllBanners = async (req, res, next) => {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: { order: "asc" },
    });
    res.json(banners);
  } catch (error) {
    next(error);
  }
};

const createBanner = async (req, res, next) => {
  const { title, subtitle, linkUrl } = req.body;
  const file = req.file;

  if (!title || title.trim() === "") {
    return res.status(400).json({ message: "Judul banner wajib diisi." });
  }
  if (!file) {
    return res.status(400).json({ message: "Gambar banner wajib diupload." });
  }

  try {
    const lastBanner = await prisma.banner.findFirst({
      orderBy: { order: "desc" },
    });
    const nextOrder = lastBanner ? lastBanner.order + 1 : 0;

    const banner = await prisma.banner.create({
      data: {
        title,
        subtitle: subtitle || null,
        imageUrl: `uploads/${file.filename}`,
        linkUrl: linkUrl || null,
        order: nextOrder,
      },
    });

    res.status(201).json(banner);
  } catch (error) {
    next(error);
  }
};

const updateBanner = async (req, res, next) => {
  const { id } = req.params;
  const { title, subtitle, linkUrl, isActive, order } = req.body;
  const file = req.file;

  try {
    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Banner tidak ditemukan." });
    }

    const dataToUpdate = {};
    if (title !== undefined) dataToUpdate.title = title;
    if (subtitle !== undefined) dataToUpdate.subtitle = subtitle;
    if (linkUrl !== undefined) dataToUpdate.linkUrl = linkUrl;
    if (isActive !== undefined) dataToUpdate.isActive = isActive;
    if (order !== undefined) dataToUpdate.order = order;

    if (file) {
      dataToUpdate.imageUrl = `uploads/${file.filename}`;
      if (existing.imageUrl && !existing.imageUrl.startsWith("http")) {
        const filePath = path.join(__dirname, "..", "..", "public", existing.imageUrl);
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
      }
    }

    const updated = await prisma.banner.update({
      where: { id },
      data: dataToUpdate,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteBanner = async (req, res, next) => {
  const { id } = req.params;
  try {
    const banner = await prisma.banner.findUnique({ where: { id } });
    if (!banner) {
      return res.status(404).json({ message: "Banner tidak ditemukan." });
    }

    if (banner.imageUrl && !banner.imageUrl.startsWith("http")) {
      const filePath = path.join(__dirname, "..", "..", "public", banner.imageUrl);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
    }

    await prisma.banner.delete({ where: { id } });
    res.json({ message: "Banner berhasil dihapus." });
  } catch (error) {
    next(error);
  }
};

const reorderBanners = async (req, res, next) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ message: "Data urutan tidak valid." });
  }

  try {
    await Promise.all(
      items.map((item) =>
        prisma.banner.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );
    res.json({ message: "Urutan banner berhasil diperbarui." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
};
