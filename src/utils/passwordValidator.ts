function validatePassword(password) {
  if (!password || password.length < 8) return 'Password minimal 8 karakter';
  if (!/[A-Z]/.test(password)) return 'Password harus mengandung huruf BESAR';
  if (!/[a-z]/.test(password)) return 'Password harus mengandung huruf kecil';
  if (!/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) return 'Password harus mengandung simbol (!@#$%^&* dll)';
  return null;
}

module.exports = { validatePassword };