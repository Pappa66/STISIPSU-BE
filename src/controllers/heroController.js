const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const HERO_KEY = 'hero_section';

const getHeroSection = async (req, res, next) => {
    try {
        const setting = await prisma.setting.findUnique({ where: { key: HERO_KEY } });
        if (!setting) {
            return res.status(200).json({
                title: 'Pendaftaran Mahasiswa Baru',
                subtitle: 'Siap Bergabung? Daftar Sekarang!',
                description: 'Proses pendaftaran cepat, mudah, dan bisa dilakukan 100% online. Dapatkan pengalaman belajar terbaik di STISIP Sukabumi.',
                imageUrl: '/images/logo-kampus.png',
                linkUrl: '',
                linkLabel: 'Daftar Sekarang',
                isActive: true,
            });
        }
        res.status(200).json(setting.value);
    } catch (error) {
        next(error);
    }
};

const updateHeroSection = async (req, res, next) => {
    const { title, subtitle, description, imageUrl, linkUrl, linkLabel, isActive } = req.body;
    if (!title) return res.status(400).json({ message: 'Judul wajib diisi.' });

    const heroData = { title, subtitle, description, imageUrl, linkUrl, linkLabel, isActive };
    try {
        const updated = await prisma.setting.upsert({
            where: { key: HERO_KEY },
            update: { value: heroData },
            create: { key: HERO_KEY, value: heroData },
        });
        res.status(200).json({ message: 'Hero section berhasil diperbarui.', data: updated.value });
    } catch (error) {
        next(error);
    }
};

module.exports = { getHeroSection, updateHeroSection };
