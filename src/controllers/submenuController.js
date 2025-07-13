const createSubMenuItem = async (req, res) => {
    const { menuItemId, name } = req.body;
    
    if (!req.user || !req.user.userId) {
        return res.status(401).json({ message: 'Otentikasi gagal, ID user tidak ditemukan.' });
    }
    const authorId = req.user.userId;

    if (!menuItemId || !name) {
        return res.status(400).json({ message: 'Nama submenu dan ID menu utama diperlukan.' });
    }

    try {
        const newSubMenuItem = await prisma.$transaction(async (tx) => {
            const newPost = await tx.post.create({
                data: {
                    title: name,
                    authorId: authorId,
                    type: 'PAGE', // Menandai post ini sebagai Halaman
                }
            });

            const subMenuItem = await tx.subMenuItem.create({
                data: {
                    name: name,
                    menuItemId: menuItemId,
                    postId: newPost.id,
                }
            });

            return subMenuItem;
        });

        res.status(201).json(newSubMenuItem);

    } catch (error) {
        console.error("DETAIL ERROR CREATE SUBMENU:", error); 
        res.status(500).json({ message: 'Gagal membuat submenu. Periksa log server untuk detail.' });
    }
};

const deleteSubMenuItem = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.$transaction(async (tx) => {
            const subMenuItemToDelete = await tx.subMenuItem.findUnique({ where: { id } });
            if (subMenuItemToDelete?.postId) {
                await tx.post.delete({ where: { id: subMenuItemToDelete.postId } });
            }
            await tx.subMenuItem.delete({ where: { id } });
        });
        res.json({ message: 'Submenu dan halaman terkait berhasil dihapus' });
    } catch (error) {
        console.error("Error saat menghapus submenu:", error);
        res.status(400).json({ message: 'Gagal menghapus submenu' });
    }
};

const reorderSubMenuItems = async (req, res) => {
    const { items } = req.body; // Menerima array of { id, order }

    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: 'Data urutan tidak valid.' });
    }

    try {
        await prisma.$transaction(
            items.map(item => 
                prisma.subMenuItem.update({
                    where: { id: item.id },
                    data: { order: item.order },
                })
            )
        );
        res.status(200).json({ message: 'Urutan submenu berhasil diperbarui.' });
    } catch (error) {
        console.error("Error saat mengurutkan submenu:", error);
        res.status(500).json({ message: 'Gagal menyimpan urutan submenu.' });
    }
};

module.exports = { createSubMenuItem, deleteSubMenuItem, reorderSubMenuItems };
