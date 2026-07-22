const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logActivity } = require('../utils/activityLog');

const prisma = new PrismaClient();

// --- FUNGSI HELPER (TIDAK ADA PERUBAHAN) ---
async function generateUserCode(name, role, studyProgram, npm, entryYear, npd) {
    if (role === 'ADMIN') {
        const firstName = name.split(' ')[0].toUpperCase();
        let code = `ADM-${firstName}`;
        let counter = 0;
        while (await prisma.user.findUnique({ where: { userCode: code } })) {
            counter += 1;
            code = `ADM-${firstName}${counter}`;
        }
        return code;
    }
    if (role === 'MAHASISWA') {
        if (!npm || !entryYear || !studyProgram) throw new Error(`Data untuk mahasiswa '${name}' tidak lengkap (NPM, Tahun Masuk, Prodi).`);
        const prefix = studyProgram === 'Ilmu Pemerintahan' ? 'MHS-IP' : 'MHS-IAN';
        const npmLastThree = String(npm).slice(-3);
        return `${prefix}-${npmLastThree}-${entryYear}`;
    }
    if (role === 'DOSEN') {
        if (!name) throw new Error('Nama Dosen tidak boleh kosong.');
        const firstName = name.split(' ')[0].toUpperCase();
        const baseCode = `DSN-${firstName}`;
        const existingUser = await prisma.user.findFirst({ where: { userCode: baseCode } });
        if (!existingUser) return baseCode;
        if (!npd) throw new Error(`NPD/NIDN wajib diisi untuk Dosen dengan nama depan yang sama (${name}).`);
        const npdLastThree = String(npd).slice(-3);
        const finalCode = `${baseCode}-${npdLastThree}`;
        const duplicateWithNpd = await prisma.user.findUnique({ where: { userCode: finalCode } });
        if (duplicateWithNpd) throw new Error(`Kode pengguna ${finalCode} sudah ada.`);
        return finalCode;
    }
    return `USER-${Math.floor(1000 + Math.random() * 9000)}`;
}


// --- PERBAIKAN TOTAL: FUNGSI SPESIFIK UNTUK SETIAP PERAN ---

const getAdmins = async (req, res, next) => {
    try {
        const { search } = req.query;
        const whereClause = {
            role: 'ADMIN', // Filter WAJIB
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { userCode: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        const users = await prisma.user.findMany({
            where: whereClause,
            select: { id: true, name: true, email: true, role: true, userCode: true },
            orderBy: { createdAt: 'asc' },
        });
        res.json(users);
    } catch (error) { next(error); }
};

const getLecturers = async (req, res, next) => {
    try {
        const { search } = req.query;
        const whereClause = {
            role: 'DOSEN', // Filter WAJIB
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { userCode: { contains: search, mode: 'insensitive' } },
                    { npd: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        const users = await prisma.user.findMany({
            where: whereClause,
            select: { id: true, name: true, email: true, role: true, userCode: true, npd: true },
            orderBy: { createdAt: 'asc' },
        });
        res.json(users);
    } catch (error) { next(error); }
};

const getStudents = async (req, res, next) => {
    try {
        const { search, studyProgram, entryYear } = req.query;
        const whereClause = {
            role: 'MAHASISWA', // Filter WAJIB
            AND: [],
        };
        if (search) {
            whereClause.AND.push({
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { userCode: { contains: search, mode: 'insensitive' } },
                    { npm: { contains: search, mode: 'insensitive' } },
                ],
            });
        }
        if (studyProgram && studyProgram !== 'ALL') whereClause.AND.push({ studyProgram });
        if (entryYear && !Number.isNaN(parseInt(entryYear, 10))) whereClause.AND.push({ entryYear: parseInt(entryYear, 10) });

        if (whereClause.AND.length === 0) delete whereClause.AND;

        const users = await prisma.user.findMany({
            where: whereClause,
            select: { id: true, name: true, email: true, role: true, userCode: true, studyProgram: true, npm: true, entryYear: true },
            orderBy: { createdAt: 'asc' },
        });
        res.json(users);
    } catch (error) { next(error); }
};


// --- FUNGSI-FUNGSI LAIN (TIDAK ADA PERUBAHAN) ---
const loginUser = async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign(
                { userId: user.id, role: user.role, name: user.name, userCode: user.userCode },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
            res.json({ token });
        } else {
            res.status(401).json({ message: 'Email atau password salah' });
        }
    } catch (error) { next(error); }
};
const createUser = async (req, res, next) => {
    const { name, email, password, role, studyProgram, npm, entryYear, npd } = req.body;
    try {
        if (!name || !email || !password || !role) return res.status(400).json({ message: "Field dasar wajib diisi." });
        if (role === 'MAHASISWA' && (!studyProgram || !npm || !entryYear)) return res.status(400).json({ message: "NPM, Tahun Masuk, dan Prodi wajib diisi untuk mahasiswa." });
        if (role === 'DOSEN' && !npd) return res.status(400).json({ message: "NPD/NIDN wajib diisi untuk dosen." });

        const hashedPassword = await bcrypt.hash(password, 10);
        const userCode = await generateUserCode(name, role, studyProgram, npm, entryYear, npd);

        const user = await prisma.user.create({
            data: {
                name, email, password: hashedPassword, role,
                studyProgram: role === 'MAHASISWA' ? studyProgram : null,
                npm: role === 'MAHASISWA' ? String(npm) : null,
                entryYear: role === 'MAHASISWA' ? parseInt(entryYear, 10) : null,
                npd: role === 'DOSEN' ? String(npd) : null,
                userCode
            },
        });
        
        await logActivity(req.user.id, 'CREATE', 'User', user.id, { name: user.name, role: user.role });
        res.status(201).json({ message: `Pengguna '${user.name}' berhasil dibuat dengan kode: ${user.userCode}`, user });
    } catch (error) {
        if (error.code === 'P2002') return res.status(400).json({ message: 'Email atau Kode Pengguna sudah terdaftar.' });
        next(error);
    }
};
const updateUser = async (req, res, next) => {
    const { id } = req.params;
    const { name, email, role, studyProgram, npm, entryYear, npd } = req.body;
    try {
        const dataToUpdate = { name, email, role, studyProgram, npm, npd };
        if (entryYear !== undefined) dataToUpdate.entryYear = parseInt(entryYear, 10);
        if (role !== 'MAHASISWA') { dataToUpdate.studyProgram = null; dataToUpdate.npm = null; dataToUpdate.entryYear = null; }
        if (role !== 'DOSEN') { dataToUpdate.npd = null; }
        
        const user = await prisma.user.update({
            where: { id },
            data: dataToUpdate,
            select: { id: true, name: true, email: true, role: true, studyProgram: true, npm: true, entryYear: true, userCode: true, npd: true },
        });
        await logActivity(req.user.id, 'UPDATE', 'User', id, { name: name || '...' });
        res.json(user);
    } catch (error) { next(error); }
};
const deleteUser = async (req, res, next) => {
    const { id } = req.params;
    try {
        if (req.user && id === req.user.userId) return res.status(400).json({ message: 'Tidak dapat menghapus akun sendiri.' });
        await prisma.user.delete({ where: { id } });
        await logActivity(req.user.id, 'DELETE', 'User', id, {});
        res.json({ message: 'Pengguna berhasil dihapus' });
    } catch (error) { next(error); }
};
const resetPassword = async (req, res, next) => {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ message: 'Password baru minimal 6 karakter' });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({ where: { id }, data: { password: hashedPassword } });
        await logActivity(req.user.id, 'UPDATE', 'User', id, { action: 'reset_password' });
        res.json({ message: 'Password berhasil direset' });
    } catch (error) { next(error); }
};
const bulkCreateUsers = async (req, res, next) => {
    const usersData = req.body;
    if (!Array.isArray(usersData) || usersData.length === 0) {
        return res.status(400).json({ message: 'Data yang dikirim harus berupa array.' });
    }

    let createdCount = 0;
    const errors = [];

    for (const user of usersData) {
        try {
            const { name, email, password, role, studyProgram, npm, entryYear, npd } = user;
            if (!name || !email || !password || !role) {
                errors.push(`Data tidak lengkap untuk email: ${email || 'tidak ada'}`);
                continue;
            }
            if (role === 'MAHASISWA' && (!studyProgram || !npm || !entryYear)) {
                errors.push(`Data Mahasiswa tidak lengkap untuk: ${name}`);
                continue;
            }
            if (role === 'DOSEN' && !npd) {
                errors.push(`NPD/NIDN wajib diisi untuk Dosen: ${name}`);
                continue;
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const userCode = await generateUserCode(name, role, studyProgram, npm, entryYear, npd);
            
            await prisma.user.create({
                data: {
                    name, email, password: hashedPassword, role, userCode,
                    studyProgram: role === 'MAHASISWA' ? studyProgram : null,
                    npm: role === 'MAHASISWA' ? String(npm) : null,
                    entryYear: role === 'MAHASISWA' ? parseInt(entryYear, 10) : null,
                    npd: role === 'DOSEN' ? String(npd) : null,
                },
            });
            createdCount++;
        } catch (error) {
            if (error.code === 'P2002') {
                errors.push(`Email atau Kode Pengguna untuk '${user.name}' sudah ada.`);
            } else {
                errors.push(`Error untuk '${user.name}': ${error.message}`);
            }
        }
    }

    let message = `${createdCount} pengguna berhasil diimpor.`;
    if (errors.length > 0) {
        message += `\n${errors.length} data gagal diimpor:\n- ${errors.join('\n- ')}`;
    }
    
    await logActivity(req.user.id, 'CREATE', 'User', null, { action: 'bulk_import', count: createdCount });
    res.status(201).json({ message });
};
const getMyProfile = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { 
                id: true, email: true, name: true, role: true, userCode: true, 
                npd: true, npm: true, studyProgram: true, entryYear: true 
            }
        });
        if (user) {
            res.status(200).json(user);
        } else {
            res.status(404).json({ message: 'User tidak ditemukan' });
        }
    } catch (error) {
        next(error);
    }
};
const changeMyPassword = async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Password lama dan baru wajib diisi.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password baru minimal harus 6 karakter.' });
    }
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (user && (await bcrypt.compare(oldPassword, user.password))) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            await prisma.user.update({
                where: { id: req.user.id },
                data: { password: hashedPassword }
            });
            res.status(200).json({ message: 'Password berhasil diganti. Silakan login kembali.' });
        } else {
            res.status(401).json({ message: 'Password lama yang Anda masukkan salah.' });
        }
    } catch (error) {
        next(error);
    }
};
const getSubmissionPrerequisites = async (req, res, next) => {
    const mahasiswaId = req.user.id;
    try {
        const mahasiswa = await prisma.user.findUnique({
            where: { id: mahasiswaId },
            select: { name: true, studyProgram: true }
        });

        if (!mahasiswa) {
            return res.status(404).json({ message: 'Data mahasiswa tidak ditemukan.' });
        }

        const bimbingan = await prisma.bimbingan.findFirst({
            where: { mahasiswaId },
            include: {
                dosen: {
                    select: { name: true }
                }
            }
        });

        res.status(200).json({
            studentName: mahasiswa.name,
            studyProgram: mahasiswa.studyProgram,
            advisorName: bimbingan ? bimbingan.dosen.name : null
        });

    } catch (error) {
        next(error);
    }
};

// --- EXPORT SEMUA FUNGSI ---
const getPublicLecturers = async (req, res, next) => {
    try {
        const lecturers = await prisma.user.findMany({
            where: { role: 'DOSEN' },
            select: { id: true, name: true, npd: true, userCode: true, email: true },
            orderBy: { name: 'asc' },
        });
        const formatted = lecturers.map((l) => ({
            id: l.id,
            name: l.name,
            nidn: l.npd || '-',
            userCode: l.userCode,
            email: l.email,
        }));
        res.json(formatted);
    } catch (error) { next(error); }
};

module.exports = { 
    loginUser, 
    createUser, 
    bulkCreateUsers, 
    updateUser, 
    deleteUser, 
    resetPassword,
    getMyProfile,
    changeMyPassword,
    getSubmissionPrerequisites,
    getAdmins,
    getLecturers,
    getStudents,
    getPublicLecturers,
};
