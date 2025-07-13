const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CONTACT_INFO_KEY = 'contact_info';

// --- FUNGSI MENGAMBIL INFO KONTAK (UNTUK PUBLIK & ADMIN) ---
const getContactInfo = async (req, res, next) => {
    try {
        const setting = await prisma.setting.findUnique({
            where: { key: CONTACT_INFO_KEY },
        });

        if (!setting) {
            // Jika belum ada, kirim data default agar frontend tidak error
            return res.status(200).json({
                alamat: 'Alamat belum diatur.',
                email: 'email@belumdiatur.com',
                telepon: 'Telepon belum diatur.',
                link_google_maps: ''
            });
        }
        
        res.status(200).json(setting.value);
    } catch (error) {
        next(error);
    }
};

// --- FUNGSI MEMPERBARUI INFO KONTAK (HANYA UNTUK ADMIN) ---
const updateContactInfo = async (req, res, next) => {
    const { alamat, email, telepon, link_google_maps } = req.body;

    // Validasi sederhana
    if (!alamat || !email || !telepon) {
        return res.status(400).json({ message: 'Alamat, Email, dan Telepon wajib diisi.' });
    }

    const contactData = { alamat, email, telepon, link_google_maps };

    try {
        const updatedSetting = await prisma.setting.upsert({
            where: { key: CONTACT_INFO_KEY },
            update: { value: contactData },
            create: { key: CONTACT_INFO_KEY, value: contactData },
        });

        res.status(200).json({ message: 'Informasi kontak berhasil diperbarui.', data: updatedSetting.value });
    } catch (error) {
        next(error);
    }
};

module.exports = { getContactInfo, updateContactInfo };
