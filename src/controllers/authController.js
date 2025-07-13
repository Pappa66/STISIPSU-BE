const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }
    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.status(200).json({ message: 'Login berhasil', token });
  } catch (error) {
    res.status(500).json({ message: 'Login gagal', error: error.message });
  }
};

module.exports = { login };