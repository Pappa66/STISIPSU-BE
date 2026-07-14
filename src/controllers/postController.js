const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// --- FUNGSI BARU UNTUK MEMBUAT POSTINGAN ---
const createPost = async (req, res, next) => {
  const { title } = req.body; // Hanya butuh judul untuk membuat post awal
  const authorId = req.user?.userId;

  if (!authorId) {
    return res
      .status(401)
      .json({ message: "Otentikasi gagal, user tidak ditemukan." });
  }
  if (!title || title.trim() === "") {
    return res.status(400).json({ message: "Judul tidak boleh kosong." });
  }

  try {
    // Buat post baru dengan judul dan blok heading default
    const newPost = await prisma.post.create({
      data: {
        title,
        authorId: authorId,
        blocks: [
          { id: `heading-${Date.now()}`, type: "heading", content: title },
        ],
      },
    });
    res.status(201).json(newPost);
  } catch (error) {
    next(error);
  }
};

// --- MENGAMBIL SEMUA POST ---
const getPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    const whereClause = search
      ? {
          title: { contains: search, mode: "insensitive" },
        }
      : {};

    const posts = await prisma.post.findMany({
      skip,
      take: limit,
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true } },
        menuItem: { select: { name: true } },
        submenuItem: {
          select: { name: true, menuItem: { select: { name: true } } },
        },
      },
    });

    const totalPosts = await prisma.post.count({ where: whereClause });
    res.json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
    });
  } catch (error) {
    next(error);
  }
};

// --- MENGAMBIL SATU POST BERDASARKAN ID ---
const getPostById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return res.status(404).json({ message: "Postingan tidak ditemukan" });
    }
    // Jika tidak dipublish, hanya admin yang bisa lihat
    if (!post.isPublished && (!req.user || req.user.role !== "ADMIN")) {
      return res.status(404).json({ message: "Postingan tidak ditemukan" });
    }
    res.json(post);
  } catch (error) {
    next(error);
  }
};

// --- MENGAMBIL SATU POST BERDASARKAN SLUG ---
const getPostBySlug = async (req, res, next) => {
  const { slug } = req.params;
  try {
    // Cari post berdasarkan field 'slug' yang unique
    const post = await prisma.post.findUnique({
      where: { slug },
    });

    if (!post) {
      return res.status(404).json({ message: "Konten tidak ditemukan" });
    }
    res.json(post);
  } catch (error) {
    next(error);
  }
};

// --- MEMPERBARUI POST ---
const updatePost = async (req, res, next) => {
  const { id } = req.params;
  const { title, blocks, slug, featuredImageUrl, isPublished } = req.body;

  try {
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        title,
        blocks,
        slug,
        featuredImageUrl,
        isPublished, // ✅ tambahkan ini
      },
    });
    res.json(updatedPost);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Postingan tidak ditemukan." });
    }
    next(error);
  }
};

// --- MENGHAPUS POST ---
const deletePost = async (req, res, next) => {
  const { id } = req.params;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.menuItem.updateMany({
        where: { postId: id },
        data: { postId: null },
      });
      await tx.subMenuItem.updateMany({
        where: { postId: id },
        data: { postId: null },
      });
      await tx.post.delete({ where: { id } });
    });
    res.json({ message: "Post berhasil dihapus." });
  } catch (error) {
    if (error.code === "P2025")
      return res.status(404).json({ message: "Post tidak ditemukan." });
    next(error);
  }
};

// --- PASTIKAN SEMUA FUNGSI DIEKSPOR ---
module.exports = {
  createPost,
  getPosts,
  getPostById,
  getPostBySlug,
  updatePost,
  deletePost,
};
