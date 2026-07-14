const express = require("express");
const router = express.Router();
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.get("/:fileId", async (req, res, next) => {
  const { fileId } = req.params;
  try {
    const file = await prisma.fileItem.findUnique({ where: { id: fileId } });
    if (!file) return res.status(404).json({ message: "File tidak ditemukan" });

    await prisma.fileItem.update({
      where: { id: fileId },
      data: { downloads: { increment: 1 } },
    });

    const filePath = path.join(process.cwd(), "public", file.fileUrl);
    res.download(filePath, file.fileName || file.alias);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
