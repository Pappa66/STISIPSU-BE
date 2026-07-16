const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FOOTER_LINKS_KEY = 'footer_links';

const getFooterLinks = async (req, res, next) => {
    try {
        const setting = await prisma.setting.findUnique({
            where: { key: FOOTER_LINKS_KEY },
        });

        if (!setting) {
            return res.status(200).json([]);
        }

        res.status(200).json(setting.value);
    } catch (error) {
        next(error);
    }
};

const updateFooterLinks = async (req, res, next) => {
    const { sections } = req.body;

    if (!Array.isArray(sections)) {
        return res.status(400).json({ message: 'Format data tidak valid. Harus berupa array sections.' });
    }

    try {
        const updatedSetting = await prisma.setting.upsert({
            where: { key: FOOTER_LINKS_KEY },
            update: { value: { sections } },
            create: { key: FOOTER_LINKS_KEY, value: { sections } },
        });

        res.status(200).json({ message: 'Footer links berhasil diperbarui.', data: updatedSetting.value });
    } catch (error) {
        next(error);
    }
};

module.exports = { getFooterLinks, updateFooterLinks };
