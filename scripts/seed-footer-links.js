const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const data = {
    sections: [
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

  console.log("Initial footer links seeded.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
