const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const data = {
    sections: [
      {
        title: "Program Studi",
        links: [
          { label: "Ilmu Administrasi Negara", url: "", isExternal: false },
          { label: "Ilmu Pemerintahan", url: "", isExternal: false },
        ],
      },
      {
        title: "Lembaga dan UPT",
        links: [
          { label: "Biro Administrasi Akademik", url: "", isExternal: false },
          { label: "Biro Administrasi Keuangan", url: "", isExternal: false },
          { label: "Biro Umum dan Kepegawaian", url: "", isExternal: false },
          { label: "Biro Kemahasiswaan dan Alumni", url: "", isExternal: false },
          { label: "LPPM", url: "", isExternal: false },
          { label: "UPT Teknologi Informasi", url: "", isExternal: false },
          { label: "UPT Pusat Bahasa", url: "", isExternal: false },
        ],
      },
      {
        title: "Perpustakaan & Publikasi",
        links: [
          { label: "Perpustakaan Digital", url: "", isExternal: false },
          { label: "Open Journal System (OJS)", url: "", isExternal: false },
          { label: "Karya Tulis Ilmiah Mahasiswa", url: "", isExternal: false },
          { label: "Repositori Institusi", url: "", isExternal: false },
        ],
      },
      {
        title: "Tautan Lainnya",
        links: [
          { label: "Sistem Informasi Akademik (SIAK)", url: "", isExternal: true },
          { label: "Webmail Dosen & Staff", url: "", isExternal: true },
          { label: "PMB Online", url: "", isExternal: true },
          { label: "E-Complaint Mahasiswa", url: "", isExternal: true },
          { label: "Tracer Study Alumni", url: "", isExternal: true },
          { label: "LMS STISIP (E-Learning)", url: "", isExternal: true },
          { label: "Helpdesk & ICT", url: "", isExternal: true },
        ],
      },
    ],
  };

  await prisma.setting.upsert({
    where: { key: "footer_links" },
    update: { value: data },
    create: { key: "footer_links", value: data },
  });

  console.log("Footer links seeded with all 4 sections.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
