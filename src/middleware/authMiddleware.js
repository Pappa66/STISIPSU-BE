const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Ambil token dari header
            token = req.headers.authorization.split(' ')[1];

            // 2. Verifikasi token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Ambil data user dari database berdasarkan ID di token
            // dan tambahkan ke object `req` agar bisa diakses di controller selanjutnya
            req.user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true, name: true, role: true } 
            });
            
            // Ganti nama properti agar konsisten dengan controller
            if (req.user) {
                req.user.userId = req.user.id;
            } else {
                return res.status(401).json({ message: 'User tidak ditemukan, otorisasi gagal' });
            }

            next(); // Lanjutkan ke controller jika semua berhasil

        } catch (error) {
            console.error('ERROR DI MIDDLEWARE PROTECT:', error);
            return res.status(401).json({ message: 'Token tidak valid atau kadaluwarsa, otorisasi gagal' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Tidak ada token, otorisasi gagal' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ message: 'Akses ditolak, hanya untuk Admin' });
    }
};

module.exports = { protect, isAdmin };