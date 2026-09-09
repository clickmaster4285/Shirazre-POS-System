const { parsePagination, buildPaginatedResponse } = require("../utils/pagination");
const { emitPosChange } = require("../utils/realtime");
const { Table, Order } = require("../models");

const ACTIVE_ORDER_STATUSES = ["pending", "preparing", "ready", "served"];

const reconcileTableState = async (rows) => {
  const names = rows.map((table) => table.name).filter(Boolean);
  if (!names.length) return rows;

  const activeOrders = await Order.find({
    type: "dine-in",
    $or: [{ tableId: { $in: rows.map((table) => table._id) } }, { table: { $in: names } }],
    status: { $in: ACTIVE_ORDER_STATUSES },
  }).select("code table tableId createdAt").sort({ createdAt: -1 }).lean();

  const activeByTable = new Map();
  activeOrders.forEach((order) => {
    const key = order.tableId ? String(order.tableId) : `name:${order.table}`;
    if (!activeByTable.has(key)) activeByTable.set(key, order);
  });

  return Promise.all(rows.map(async (table) => {
    const activeOrder = activeByTable.get(String(table._id)) || activeByTable.get(`name:${table.name}`);
    if (activeOrder) {
      if (table.status !== "occupied" || table.currentOrder !== activeOrder.code) {
        table.status = "occupied";
        table.currentOrder = activeOrder.code;
        await Table.updateOne({ _id: table._id }, { $set: { status: "occupied", currentOrder: activeOrder.code } });
      }
    } else if (table.status === "occupied" && table.currentOrder) {
      table.status = "available";
      table.currentOrder = "";
      await Table.updateOne({ _id: table._id }, { $set: { status: "available", currentOrder: "" } });
    }
    return table;
  }));
};

exports.list = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const [rawRows, total] = await Promise.all([
    Table.find({}).sort({ number: 1 }).skip(skip).limit(limit).lean(),
    Table.countDocuments({}),
  ]);
  const rows = await reconcileTableState(rawRows);
  res.json(
    buildPaginatedResponse({
      items: rows.map((t) => ({
        id: String(t._id),
        number: t.number,
        name: t.name,
        seats: t.seats,
        floorKey: t.floorKey,
        status: t.status,
        currentOrder: t.currentOrder || "",
      })),
      total,
      page,
      limit,
    })
  );
};

exports.create = async (req, res) => {
  const row = await Table.create(req.body || {});
  emitPosChange(["tables", "floors", "orders", "dashboard"]);
  res.status(201).json({ id: String(row._id) });
};

exports.update = async (req, res) => {
  const row = await Table.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
  emitPosChange(["tables", "floors", "orders", "dashboard"]);
  res.json({ id: String(row._id) });
};

exports.remove = async (req, res) => {
  await Table.findByIdAndDelete(req.params.id);
  emitPosChange(["tables", "floors", "orders", "dashboard"]);
  res.json({ ok: true });
};

exports.createBulk = async (req, res) => {
  const tables = req.body?.tables || [];
  if (!Array.isArray(tables) || tables.length === 0) {
    return res.status(400).json({ error: "Tables array is required" });
  }

  const created = [];
  for (const table of tables) {
    const { number, name, seats, floorKey, status } = table;
    if (!number || !name || !seats || !floorKey) {
      return res.status(400).json({ error: "Each table must include number, name, seats, and floorKey" });
    }
    const existing = await Table.findOne({ number });
    if (existing) {
      return res.status(409).json({ error: `Table ${number} already exists` });
    }
    const newTable = await Table.create({ number, name, seats, floorKey, status: status || "available" });
    created.push({ id: String(newTable._id), number, name });
  }

  emitPosChange(["tables", "floors", "orders", "dashboard"]);
  res.status(201).json({ created });
};

exports.removeBulk = async (req, res) => {
  const ids = req.body?.ids || [];
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "IDs array is required" });
  }
  const result = await Table.deleteMany({ _id: { $in: ids } });
  emitPosChange(["tables", "floors", "orders", "dashboard"]);
  res.json({ deleted: result.deletedCount });
};
