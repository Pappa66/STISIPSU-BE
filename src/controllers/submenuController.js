const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createSubMenuItem = async (req, res, next) => {
  const { menuItemId, name } = req.body;
  const authorId = req.user?.userId;

  if (!authorId) {
    return res
      .status(401)
      .json({ message: "Otentikasi gagal, ID user tidak ditemukan." });
  }

  if (!menuItemId || !name) {
    return res
      .status(400)
      .json({ message: "Nama submenu dan ID menu utama diperlukan." });
  }

  try {
    const newSubMenuItem = await prisma.$transaction(async (tx) => {
      const newPost = await tx.post.create({
        data: {
          title: name,
          authorId: authorId,
          type: "PAGE",
          blocks: [
            { id: `heading-${Date.now()}`, type: "heading", content: name },
            {
              id: `paragraph-${Date.now()}`,
              type: "paragraph",
              content: "Silakan isi konten halaman di sini...",
            },
          ],
        },
      });

      const lastSubMenuItem = await tx.subMenuItem.findFirst({
        where: { menuItemId: menuItemId },
        orderBy: { order: "desc" },
      });
      const newOrder = lastSubMenuItem ? lastSubMenuItem.order + 1 : 0;

      const subMenuItem = await tx.subMenuItem.create({
        data: {
          name: name,
          order: newOrder,
          menuItemId: menuItemId,
          postId: newPost.id,
        },
      });

      return subMenuItem;
    });

    res.status(201).json(newSubMenuItem);
  } catch (error) {
    console.error("DETAIL ERROR CREATE SUBMENU:", error);
    next(error); // Teruskan ke error handler terpusat
  }
};

const updateSubMenuItem = async (req, res, next) => {
  const { id } = req.params;
  // Ambil data yang relevan dari body request
  const { name, type, href, postId } = req.body;

  try {
    const dataToUpdate = { name, type };

    // Logika untuk membersihkan data berdasarkan tipe link
    if (type === "INTERNAL") {
      // Jika link internal, pastikan href dihapus dan postId ada
      dataToUpdate.href = null;
      if (postId) {
        dataToUpdate.postId = postId;
      }
    } else if (type === "EXTERNAL" || type === "STATIC_PATH") {
      // Jika link eksternal atau statis, hapus postId dan set href
      dataToUpdate.href = href;
      dataToUpdate.postId = null;
    }

    const updatedItem = await prisma.subMenuItem.update({
      where: { id: id },
      data: dataToUpdate,
    });

    res.json(updatedItem);
  } catch (error) {
    console.error("Error saat memperbarui submenu:", error);
    next(error);
  }
};

const deleteSubMenuItem = async (req, res, next) => {
  const { id } = req.params;
  try {
    await prisma.$transaction(async (tx) => {
      const subMenuItemToDelete = await tx.subMenuItem.findUnique({
        where: { id },
      });
      if (subMenuItemToDelete?.postId) {
        await tx.post.delete({ where: { id: subMenuItemToDelete.postId } });
      }
      await tx.subMenuItem.delete({ where: { id } });
    });
    res.json({ message: "Submenu dan halaman terkait berhasil dihapus" });
  } catch (error) {
    console.error("Error saat menghapus submenu:", error);
    next(error);
  }
};

const reorderSubMenuItems = async (req, res, next) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ message: "Data urutan tidak valid." });
  }

  try {
    await prisma.$transaction(
      items.map((item) =>
        prisma.subMenuItem.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );
    res.status(200).json({ message: "Urutan submenu berhasil diperbarui." });
  } catch (error) {
    console.error("Error saat mengurutkan submenu:", error);
    next(error);
  }
};

module.exports = {
  createSubMenuItem,
  updateSubMenuItem,
  deleteSubMenuItem,
  reorderSubMenuItems,
};
