const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- FUNGSI MEMBUAT MENU BARU ---
const createMenuItem = async (req, res, next) => {
    const { name } = req.body;
    const authorId = req.user?.userId;
    if (!authorId) {
        return res.status(401).json({ message: "Otentikasi gagal" });
    }

    try {
        const newMenuItem = await prisma.$transaction(async (tx) => {
            const newPost = await tx.post.create({
                data: {
                    title: name,
                    authorId: authorId,
                    type: 'PAGE',
                    blocks: [
                        { id: `heading-${Date.now()}`, type: 'heading', content: name },
                        { id: `paragraph-${Date.now()}`, type: 'paragraph', content: 'Silakan isi konten halaman di sini...' }
                    ]
                }
            });

            const lastMenuItem = await tx.menuItem.findFirst({ orderBy: { order: 'desc' } });
            const newOrder = lastMenuItem ? lastMenuItem.order + 1 : 0;

            const menuItem = await tx.menuItem.create({
                data: { name, order: newOrder, postId: newPost.id }
            });
            return menuItem;
        });
        res.status(201).json(newMenuItem);
    } catch (error) {
        next(error);
    }
};

// --- FUNGSI MENGAMBIL SEMUA MENU ---
const getMenuItems = async (req, res, next) => {
    try {
        const items = await prisma.menuItem.findMany({
            orderBy: { order: 'asc' },
            include: { 
                // PERBAIKAN: Tambahkan 'slug' di dalam select
                post: { select: { id: true, slug: true } }, 
                submenus: { 
                    orderBy: { order: 'asc' }, 
                    // PERBAIKAN: Tambahkan 'slug' di dalam select untuk submenu juga
                    include: { post: { select: { id: true, slug: true } } } 
                } 
            }
        });
        res.json(items);
    } catch (error) {
        next(error);
    }
};

// --- FUNGSI MENGAMBIL SATU MENU BERDASARKAN ID ---
const getMenuItemById = async (req, res, next) => {
    const { id } = req.params;
    try {
        // PERBAIKAN: Tambahkan 'slug' juga di sini
        let item = await prisma.menuItem.findUnique({ where: { id }, include: { post: { select: { id: true, slug: true } } } });
        if (!item) {
            item = await prisma.subMenuItem.findUnique({ where: { id }, include: { post: { select: { id: true, slug: true } } } });
        }
        if (!item) {
            return res.status(404).json({ message: 'Item menu tidak ditemukan' });
        }
        res.json(item);
    } catch (error) {
        next(error);
    }
};

// --- FUNGSI MEMPERBARUI MENU ---
const updateMenuItem = async (req, res, next) => {
    const { id } = req.params;
    const { name, type, href } = req.body;
    try {
        const dataToUpdate = { name, type, href };
        if (type === 'INTERNAL') dataToUpdate.href = null;
        else if (type === 'EXTERNAL' || type === 'STATIC_PATH') dataToUpdate.postId = null;

        const isSubmenu = await prisma.subMenuItem.findUnique({ where: { id } });
        const prismaModel = isSubmenu ? prisma.subMenuItem : prisma.menuItem;
        const updatedItem = await prismaModel.update({ where: { id }, data: dataToUpdate });
        res.json(updatedItem);
    } catch (error) {
        next(error);
    }
};

// --- FUNGSI MENGHAPUS MENU ---
const deleteMenuItem = async (req, res, next) => {
    const { id } = req.params;
    try {
        await prisma.$transaction(async (tx) => {
            const submenus = await tx.subMenuItem.findMany({ where: { menuItemId: id } });
            const submenuPostIds = submenus.map(sm => sm.postId).filter(Boolean);
            const mainMenuItem = await tx.menuItem.findUnique({ where: { id } });
            const allPostIdsToDelete = [...submenuPostIds];
            if (mainMenuItem?.postId) allPostIdsToDelete.push(mainMenuItem.postId);
            await tx.subMenuItem.deleteMany({ where: { menuItemId: id } });
            if (allPostIdsToDelete.length > 0) await tx.post.deleteMany({ where: { id: { in: allPostIdsToDelete } } });
            await tx.menuItem.delete({ where: { id } });
        });
        res.json({ message: 'Menu dan semua data terkait berhasil dihapus' });
    } catch (error) {
        next(error);
    }
};

// --- FUNGSI MENGURUTKAN ULANG MENU ---
const reorderMenuItems = async (req, res, next) => {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) return res.status(400).json({ message: 'Data urutan tidak valid.' });
    try {
        await prisma.$transaction(items.map(item => prisma.menuItem.update({ where: { id: item.id }, data: { order: item.order } })));
        res.status(200).json({ message: 'Urutan menu berhasil diperbarui.' });
    } catch (error) {
        next(error);
    }
};

module.exports = { 
    getMenuItems,
    getMenuItemById, 
    createMenuItem, 
    updateMenuItem, 
    deleteMenuItem, 
    reorderMenuItems 
};