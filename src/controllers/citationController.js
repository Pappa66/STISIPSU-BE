const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getCitation = async (req, res, next) => {
  const { id } = req.params;
  const format = req.query.format || "apa";

  try {
    const item = await prisma.repositoryItem.findUnique({
      where: { id },
      include: { advisor: { select: { name: true } } },
    });

    if (!item) {
      return res.status(404).json({ message: "Item tidak ditemukan" });
    }

    const author = item.author;
    const year = item.year;
    const title = item.title;
    const program = item.studyProgram;
    const advisor = item.advisor?.name || "";
    const institution = "STISIP Syamsul 'Ulum Sukabumi";

    let citation = "";

    if (format === "bibtex") {
      citation = `@article{${author.split(",")[0].trim().toLowerCase()}${year},
  author  = {${author}},
  title   = {${title}},
  year    = {${year}},
  school  = {${institution}},
  address = {Sukabumi},
  program = {${program}},
  advisor = {${advisor}}
}`;
    } else {
      // APA
      citation = `${author} (${year}). <em>${title}</em>. [${program}, ${institution}]. ${institution}.`;
    }

    res.json({ citation, format });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCitation };
