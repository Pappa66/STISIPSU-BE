const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { logActivity } = require("../utils/activityLog");

const getPublicEvents = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const where = { isActive: true };
    if (year && month) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.eventDate = { gte: start, lte: end };
    }
    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { eventDate: "asc" },
    });
    res.json(events);
  } catch (error) {
    next(error);
  }
};

const getAllEvents = async (req, res, next) => {
  try {
    const events = await prisma.calendarEvent.findMany({
      orderBy: { eventDate: "asc" },
    });
    res.json(events);
  } catch (error) {
    next(error);
  }
};

const createEvent = async (req, res, next) => {
  const { title, description, eventDate, endDate, type, color } = req.body;
  if (!title || !eventDate) {
    return res.status(400).json({ message: "Judul dan tanggal wajib diisi." });
  }
  try {
    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description: description || null,
        eventDate: new Date(eventDate),
        endDate: endDate ? new Date(endDate) : null,
        type: type || "academic",
        color: color || "#0077c2",
      },
    });
    await logActivity(req.user.id, "CREATE", "CalendarEvent", event.id, { title });
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
};

const updateEvent = async (req, res, next) => {
  const { id } = req.params;
  const { title, description, eventDate, endDate, type, color, isActive } = req.body;
  try {
    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Event tidak ditemukan." });

    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (eventDate !== undefined) data.eventDate = new Date(eventDate);
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
    if (type !== undefined) data.type = type;
    if (color !== undefined) data.color = color;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.calendarEvent.update({ where: { id }, data });
    await logActivity(req.user.id, "UPDATE", "CalendarEvent", id, { title: title || "..." });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteEvent = async (req, res, next) => {
  const { id } = req.params;
  try {
    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Event tidak ditemukan." });
    await prisma.calendarEvent.delete({ where: { id } });
    await logActivity(req.user.id, "DELETE", "CalendarEvent", id, {});
    res.json({ message: "Event berhasil dihapus." });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPublicEvents, getAllEvents, createEvent, updateEvent, deleteEvent };
