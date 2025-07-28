const express = require('express');
const {
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
} = require('../controllers/userController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// --- RUTE PUBLIK ---
router.post('/login', loginUser);

// --- RUTE UNTUK PENGGUNA YANG LOGIN ---
router.get('/submission-prerequisites', protect, getSubmissionPrerequisites);
router.route('/profile').get(protect, getMyProfile);
router.route('/change-password').put(protect, changeMyPassword);

// --- RUTE BARU UNTUK ADMIN (MODULAR) ---
router.get('/admins', protect, isAdmin, getAdmins);
router.get('/lecturers', protect, isAdmin, getLecturers);
router.get('/students', protect, isAdmin, getStudents);

// --- RUTE AKSI ---
// Rute ini untuk membuat user baru (akan dipanggil dari semua modul)
router.post('/', protect, isAdmin, createUser);
// Rute untuk impor massal
router.post('/bulk', protect, isAdmin, bulkCreateUsers);
// Rute untuk update, delete, reset password berdasarkan ID
router.route('/:id').put(protect, isAdmin, updateUser).delete(protect, isAdmin, deleteUser);
router.route('/:id/reset-password').put(protect, isAdmin, resetPassword);

module.exports = router;
