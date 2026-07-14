// D:\STISIP\STISIPWEB\backend\src\app.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

// === Middleware ===
const allowedOrigins = [
  "http://localhost:3000",
  "http://145.79.8.29:3000",
  "https://stisipsu.ac.id",            
"https://www.stisipsu.ac.id",        
"https://api.stisipsu.ac.id"
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// === Static Public Files ===
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "public/uploads"))
);

// === Import & Register Routes ===
app.use("/api/menu-items", require("./routes/menuRoutes"));
app.use("/api/submenus", require("./routes/submenuRoutes"));
app.use("/api/public", require("./routes/publicRoutes"));
app.use("/api/pages", require("./routes/pageRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/news", require("./routes/newsRoutes"));
app.use("/api/gallery", require("./routes/galleryRoutes"));
app.use("/api/contact", require("./routes/contactRoutes"));
app.use("/api/public/contact", require("./routes/publicContactRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/repository-items", require("./routes/repositoryRoutes"));
// app.use("/api/auth", require("./routes/authRoutes")); // Dinonaktifkan — pake /api/users/login aja
app.use("/api/advisor", require("./routes/advisorRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/my-repository", require("./routes/myRepositoryRoutes"));
app.use("/api/announcements", require("./routes/announcementRoutes"));
app.use(
  "/api/public/announcements",
  require("./routes/publicAnnouncementRoutes")
);
app.use("/api/public", require("./routes/publicSearchRoutes"));
app.use("/api/banners", require("./routes/bannerRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/citation", require("./routes/citationRoutes"));
app.use("/api/download", require("./routes/downloadRoutes"));

// === Global Error Handler ===
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Terjadi kesalahan internal pada server.",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

// === Start Server ===
app.listen(PORT, () => {
  console.log(`✅ Server ready: http://localhost:${PORT}`);
});
