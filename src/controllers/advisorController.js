const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const { logActivity } = require('../utils/activityLog');

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

        // Juga cari mahasiswa di mana dosen adalah secondAdvisor
        const secondAdvisedItems = await prisma.repositoryItem.findMany({
            where: { secondAdvisorId: dosenId },
            select: { uploaderId: true, uploader: { select: { id: true, name: true, npm: true, userCode: true } } },
            distinct: ['uploaderId'],
        });
        
        const students = bimbingan.map(b => ({
            ...b.mahasiswa,
            role: 'pembimbing',
            pendingItemsCount: b.mahasiswa._count.uploadedItems
        }));

        // Gabungkan dengan second advised students (hindari duplikasi)
        const existingIds = new Set(bimbingan.map(b => b.mahasiswaId));
        for (const item of secondAdvisedItems) {
            if (!existingIds.has(item.uploaderId)) {
                existingIds.add(item.uploaderId);
                students.push({
                    ...item.uploader,
                    role: 'penguji',
                    pendingItemsCount: 0,
                });
            }
        }
        
        // Sort by name
        students.sort((a, b) => a.name.localeCompare(b.name));

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
            // Cek apakah dosen ini adalah second advisor dari item manapun milik mahasiswa
            const isSecondAdvisor = await prisma.repositoryItem.findFirst({
                where: { uploaderId: studentId, secondAdvisorId: dosenId }
            });
            if (!isSecondAdvisor) {
                return res.status(403).json({ message: 'Anda bukan pembimbing mahasiswa ini.' });
            }
        }

        const items = await prisma.repositoryItem.findMany({
            where: { uploaderId: studentId },
            include: {
                files: { select: { id: true, alias: true, fileUrl: true } },
                advisor: { select: { name: true } },
                secondAdvisor: { select: { name: true } },
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
    const dosenId = req.user.id;

    if (!approvalStatus) {
        return res.status(400).json({ message: 'Status persetujuan wajib diisi.' });
    }
    if (approvalStatus === 'REJECTED' && !rejectionReason) {
        return res.status(400).json({ message: 'Alasan penolakan wajib diisi.' });
    }

    try {
        // Cek apakah dosen adalah advisor atau second advisor
        const item = await prisma.repositoryItem.findUnique({
            where: { id: itemId },
            select: { advisorId: true, secondAdvisorId: true, uploaderId: true, title: true },
        });
        if (!item) {
            return res.status(404).json({ message: 'Item tidak ditemukan.' });
        }
        if (item.advisorId !== dosenId && item.secondAdvisorId !== dosenId) {
            return res.status(403).json({ message: 'Anda tidak memiliki akses untuk mereview item ini.' });
        }

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

        // Buat notifikasi untuk pengunggah
        const statusLabel = approvalStatus === 'APPROVED' ? 'Disetujui' : 'Revisi';
        await prisma.notification.create({
            data: {
                userId: item.uploaderId,
                title: `Karya ${statusLabel}`,
                message: `Karya ilmiah "${item.title}" telah di-${approvalStatus === 'APPROVED' ? 'setujui' : 'minta revisi'} oleh dosen pembimbing.`,
                link: '/dashboard/my-repository',
            },
        });

        if (approvalStatus === 'APPROVED') {
            await logActivity(req.user.id, 'REVIEW', 'RepositoryItem', itemId, { action: 'APPROVED', title: item.title });
        } else if (approvalStatus === 'REJECTED') {
            await logActivity(req.user.id, 'REVIEW', 'RepositoryItem', itemId, { action: 'REJECTED', title: item.title });
        }

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
        await logActivity(req.user.id, 'CREATE', 'Bimbingan', mahasiswa.id, { studentName: mahasiswa.name, studentCode: userCode });
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

/**
 * @desc    Menetapkan dosen kedua (penguji) untuk sebuah item repository
 * @route   PUT /api/advisor/items/:itemId/assign-second-advisor
 * @access  Private (Dosen)
 */
const assignSecondAdvisor = async (req, res, next) => {
    const { itemId } = req.params;
    const { secondAdvisorId } = req.body;
    const dosenId = req.user.id;

    try {
        const item = await prisma.repositoryItem.findUnique({
            where: { id: itemId },
            select: { advisorId: true },
        });
        if (!item) return res.status(404).json({ message: 'Item tidak ditemukan.' });
        if (item.advisorId !== dosenId) {
            return res.status(403).json({ message: 'Hanya pembimbing utama yang bisa menetapkan penguji kedua.' });
        }

        const updatedItem = await prisma.repositoryItem.update({
            where: { id: itemId },
            data: { secondAdvisorId },
        });
        await logActivity(req.user.id, 'ASSIGN', 'RepositoryItem', itemId, { secondAdvisorId });
        res.status(200).json({ message: 'Penguji kedua berhasil ditetapkan.', item: updatedItem });
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
    assignSecondAdvisor,
};
