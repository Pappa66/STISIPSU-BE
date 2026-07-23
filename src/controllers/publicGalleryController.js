const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getPublicGallery = async (req, res, next) => {
  try {
    const galleryItems = await prisma.galleryImage.findMany({
      orderBy: { 
        order: 'asc' 
      },
      include: {
        post: {
          select: { slug: true }
        }
      }
    });

    res.json(galleryItems);
  } catch (error) {
    next(error);
  }
};

module.exports = { getPublicGallery };
