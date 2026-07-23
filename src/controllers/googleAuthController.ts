const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logActivity } = require('../utils/activityLog');

const prisma = new PrismaClient();

const googleLogin = async (req, res, next) => {
  const { credential } = req.body;
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return res.status(501).json({ message: 'Google OAuth belum dikonfigurasi. Hubungi administrator.' });
  }

  if (!credential) {
    return res.status(400).json({ message: 'Google credential tidak ditemukan.' });
  }

  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!response.ok) {
      return res.status(401).json({ message: 'Token Google tidak valid.' });
    }

    const payload: any = await response.json();

    if (payload.aud !== clientId) {
      return res.status(401).json({ message: 'Token tidak cocok dengan aplikasi ini.' });
    }

    if (!payload.email) {
      return res.status(400).json({ message: 'Email tidak ditemukan di akun Google.' });
    }

    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!user) {
      return res.status(403).json({ message: 'Email ini tidak terdaftar di sistem. Hubungi administrator untuk mendaftarkan akun Anda.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name, userCode: user.userCode },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    await logActivity(user.id, 'LOGIN', 'User', user.id, { action: 'google_oauth' });

    res.json({ token, message: 'Login Google berhasil' });
  } catch (error) {
    next(error);
  }
};

module.exports = { googleLogin };