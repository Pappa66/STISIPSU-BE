const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');

/**
 * @desc    Mengambil daftar mahasiswa yang dibimbing oleh dosen yang login dengan pagination
 * @route   GET /api/advisor/students
 * @access  Private (Dosen)
 */
const getAdvisedStudentsList = async (req, res, next) => {
    const dosenId = req.user.id;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalBimbingan = await prisma.bimbingan.count({ where: { dosenId } });

        const bimbingan = await prisma.bimbingan.findMany({
            where: { dosenId },
            skip,
            take: limit,
            include: {
                mahasiswa: {
                    select: {
                        id: true,
                        name: true,
                        npm: true,
                        userCode: true,
                        _count: {
                            select: {
                                uploadedItems: { where: { approvalStatus: 'PENDING' } }
                            }
                        }
                    }
                }
            },
            orderBy: {
                mahasiswa: {
                    name: 'asc'
                }
            }
        });
        
        const students = bimbingan.map(b => ({
            ...b.mahasiswa,
            pendingItemsCount: b.mahasiswa._count.uploadedItems
        }));
        
        res.status(200).json({
            students,
            currentPage: page,
            totalPages: Math.ceil(totalBimbingan / limit)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Mengambil semua item yang diunggah oleh satu mahasiswa tertentu
 * @route   GET /api/advisor/students/:studentId/items
 * @access  Private (Dosen)
 */
const getStudentSubmissions = async (req, res, next) => {
    const { studentId } = req.params;
    const dosenId = req.user.id;
    try {
        const isAdvisor = await prisma.bimbingan.findUnique({
            where: { dosenId_mahasiswaId: { dosenId, mahasiswaId: studentId } }
        });
        if (!isAdvisor) {
            return res.status(403).json({ message: 'Anda bukan pembimbing mahasiswa ini.' });
        }

        const items = await prisma.repositoryItem.findMany({
            where: { uploaderId: studentId },
            include: {
                files: { select: { id: true, alias: true, fileUrl: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(items);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Dosen mereview (menyetujui/menolak) satu karya ilmiah
 * @route   PUT /api/advisor/items/:itemId/review
 * @access  Private (Dosen)
 */
const reviewItem = async (req, res, next) => {
    const { itemId } = req.params;
    const { approvalStatus, rejectionReason, visibility, showDownloadsToPublic } = req.body;

    if (!approvalStatus) {
        return res.status(400).json({ message: 'Status persetujuan wajib diisi.' });
    }
    if (approvalStatus === 'REJECTED' && !rejectionReason) {
        return res.status(400).json({ message: 'Alasan penolakan wajib diisi.' });
    }

    try {
        const updatedItem = await prisma.repositoryItem.update({
            where: { id: itemId },
            data: {
                approvalStatus,
                visibility: visibility || 'PRIVATE',
                showDownloadsToPublic: showDownloadsToPublic || false,
                rejectionReason: approvalStatus === 'REJECTED' ? rejectionReason : null,
                publishedAt: (approvalStatus === 'APPROVED' && visibility === 'PUBLISHED') ? new Date() : null,
            }
        });
        res.status(200).json({ message: `Karya ilmiah berhasil di-${approvalStatus.toLowerCase()}.`, item: updatedItem });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Menambahkan satu mahasiswa bimbingan berdasarkan Kode Pengguna
 * @route   POST /api/advisor/students
 * @access  Private (Dosen)
 */
const addAdvisedStudent = async (req, res, next) => {
    const { userCode } = req.body;
    const dosenId = req.user.id;

    if (!userCode) {
        return res.status(400).json({ message: 'Kode Pengguna mahasiswa wajib diisi.' });
    }

    try {
        const mahasiswa = await prisma.user.findUnique({ where: { userCode } });

        if (!mahasiswa || mahasiswa.role !== 'MAHASISWA') {
            return res.status(404).json({ message: `Mahasiswa dengan kode '${userCode}' tidak ditemukan atau kode bukan milik mahasiswa.` });
        }

        const existingBimbingan = await prisma.bimbingan.findUnique({
            where: { dosenId_mahasiswaId: { dosenId, mahasiswaId: mahasiswa.id } }
        });

        if (existingBimbingan) {
            return res.status(409).json({ message: `${mahasiswa.name} sudah menjadi mahasiswa bimbingan Anda.` });
        }

        await prisma.bimbingan.create({ data: { dosenId, mahasiswaId: mahasiswa.id } });
        res.status(201).json({ message: `Mahasiswa ${mahasiswa.name} berhasil ditambahkan.` });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Menambahkan mahasiswa bimbingan secara massal dari file Excel
 * @route   POST /api/advisor/students/bulk
 * @access  Private (Dosen)
 */
const addAdvisedStudentsFromExcel = async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Tidak ada file Excel yang diunggah.' });
    }
    const dosenId = req.user.id;
    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        const results = { success: [], alreadyExists: [], notFound: [] };

        for (const row of data) {
            const userCode = row.KODE_PENGGUNA || row.userCode;
            if (!userCode) continue;

            const mahasiswa = await prisma.user.findUnique({ where: { userCode: String(userCode) } });

            if (!mahasiswa || mahasiswa.role !== 'MAHASISWA') {
                results.notFound.push(String(userCode));
                continue;
            }
            const existingBimbingan = await prisma.bimbingan.findUnique({
                where: { dosenId_mahasiswaId: { dosenId, mahasiswaId: mahasiswa.id } },
            });
            if (existingBimbingan) {
                results.alreadyExists.push(`${mahasiswa.name} (${userCode})`);
                continue;
            }
            await prisma.bimbingan.create({ data: { dosenId, mahasiswaId: mahasiswa.id } });
            results.success.push(`${mahasiswa.name} (${userCode})`);
        }
        res.status(200).json({ message: 'Proses impor massal selesai.', details: results });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAdvisedStudentsList,
    getStudentSubmissions,
    reviewItem,
    addAdvisedStudent,
    addAdvisedStudentsFromExcel,
};
