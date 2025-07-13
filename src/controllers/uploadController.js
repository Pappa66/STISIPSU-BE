const path = require('path');

const uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
            error: { message: 'Upload gagal, tidak ada file terdeteksi.' } 
        });
    }

    // Pastikan BACKEND_URL di file .env sudah benar (misal: http://localhost:3001)
    const imageUrl = `${process.env.BACKEND_URL}/uploads/${req.file.filename}`;
    
    res.status(200).json({
        url: imageUrl
    });
};

module.exports = { uploadFile };