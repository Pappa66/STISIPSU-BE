const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @desc    Mahasiswa mengambil daftar karya ilmiah miliknya sendiri
 * @route   GET /api/my-repository
 * @access  Private (Mahasiswa)
 */
const getMyItems = async (req, res, next) => {
    try {
        const items = await prisma.repositoryItem.findMany({
            where: { uploaderId: req.user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                advisor: { select: { name: true } },
                files: { select: { id: true, alias: true, fileUrl: true } }
            }
        });
        res.status(200).json(items);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Mahasiswa membuat/mengunggah karya ilmiah baru
 * @route   POST /api/my-repository
 * @access  Private (Mahasiswa)
 */
const createMyItem = async (req, res, next) => {
    const { title, author, year, studyProgram, abstract, keywords, gdriveLink, filesMetadata } = req.body;
    const files = req.files; // Bisa ada atau tidak
    const uploaderId = req.user.id;

    // Validasi: Harus ada salah satu, file atau link
    if ((!files || files.length === 0) && !gdriveLink) {
        return res.status(400).json({ message: 'Unggah minimal satu file atau sediakan satu Link Google Drive.' });
    }

    try {
        const bimbingan = await prisma.bimbingan.findFirst({ where: { mahasiswaId: uploaderId } });
        if (!bimbingan) {
            return res.status(400).json({ message: 'Anda belum memiliki dosen pembimbing.' });
        }
        const advisorId = bimbingan.dosenId;

        const parsedYear = parseInt(year);
        if (isNaN(parsedYear)) return res.status(400).json({ message: 'Tahun harus berupa angka.' });

        // Menyiapkan data untuk 'files' di dalam 'create'
        let filesToCreate = [];
        if (gdriveLink) {
            filesToCreate.push({
                alias: 'Link Google Drive',
                fileName: 'gdrive_link',
                fileUrl: gdriveLink,
            });
        }
        if (files && files.length > 0) {
            const parsedFilesMetadata = JSON.parse(filesMetadata);
            const fileData = files.map(file => ({
                alias: parsedFilesMetadata.find(m => m.originalName === file.originalname)?.alias || file.originalname,
                fileName: file.filename,
                fileUrl: `uploads/${file.filename}`,
            }));
            filesToCreate = [...filesToCreate, ...fileData];
        }

        const newItem = await prisma.repositoryItem.create({
            data: {
                title, author, abstract, keywords,
                year: parsedYear,
                studyProgram,
                uploaderId,
                advisorId,
                approvalStatus: 'PENDING',
                visibility: 'PRIVATE',
                files: {
                    create: filesToCreate,
                },
            },
        });
        res.status(201).json({ message: 'Karya ilmiah berhasil diunggah dan dikirim untuk direview.', item: newItem });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Mahasiswa memperbarui karya ilmiah miliknya
 * @route   PUT /api/my-repository/:id
 * @access  Private (Mahasiswa)
 */
const updateMyItem = async (req, res, next) => {
    const { id } = req.params;
    const { title, author, year, studyProgram, abstract, keywords } = req.body;
    try {
        const item = await prisma.repositoryItem.findUnique({ where: { id } });

        if (!item || item.uploaderId !== req.user.id) {
            return res.status(403).json({ message: 'Aksi tidak diizinkan.' });
        }
        if (item.approvalStatus === 'APPROVED') {
            return res.status(403).json({ message: 'Tidak dapat mengubah karya ilmiah yang sudah disetujui.' });
        }

        const updatedItem = await prisma.repositoryItem.update({
            where: { id },
            data: { 
                title, author, abstract, keywords,
                year: parseInt(year), 
                studyProgram,
                approvalStatus: 'PENDING',
                rejectionReason: null
            }
        });
        res.json({ message: 'Karya ilmiah berhasil diperbarui.', item: updatedItem });
    } catch (error) {
        next(error);
    }
};

module.exports = { getMyItems, createMyItem, updateMyItem };
