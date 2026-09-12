const { emitPosChange } = require("../utils/realtime");
const { Permission, User } = require("../models");

const ROLE_SLUG = /^[a-zA-Z][a-zA-Z0-9_]{1,31}$/;
const BUILTIN_ROLES = ["superadmin", "cashier", "store_manager"];

const serialize = (r) => ({
  pageAccess: r.pageAccess || [],
  actionPermissions: r.actionPermissions || [],
  dataVisibility: r.dataVisibility || [],
  discountLimit: typeof r.discountLimit === "number" ? r.discountLimit : 0,
  label: r.label || "",
  builtIn: r.builtIn === true,
});

const toConfig = (rows) => {
  const config = {};
  for (const r of rows) config[r.role] = serialize(r);
  return config;
};

const isSuperAdmin = (req) => req.isSuperAdmin || (req.user && req.user.role === "superadmin");

exports.getAll = async (_req, res) => {
  const rows = await Permission.find({}).lean();
  res.json(toConfig(rows));
};

exports.putAll = async (req, res) => {
  const config = req.body || {};
  for (const [role, value] of Object.entries(config)) {
    if (typeof role !== "string" || !role.trim()) continue;
    const payload = {
      pageAccess: Array.isArray(value.pageAccess) ? value.pageAccess : [],
      actionPermissions: Array.isArray(value.actionPermissions) ? value.actionPermissions : [],
      dataVisibility: Array.isArray(value.dataVisibility) ? value.dataVisibility : [],
      discountLimit: Number.isFinite(Number(value.discountLimit)) ? Number(value.discountLimit) : 0,
      label: value.label || role,
    };
    if (BUILTIN_ROLES.includes(role)) payload.builtIn = true;
    await Permission.findOneAndUpdate({ role }, { role, ...payload }, { upsert: true, new: true });
  }
  emitPosChange(["permissions"]);
  res.json({ ok: true });
};

exports.createRole = async (req, res) => {
  if (!isSuperAdmin(req)) {
    return res.status(403).json({ message: "Only superadmin can create roles." });
  }
  const { role, label, pageAccess, actionPermissions, dataVisibility, discountLimit } = req.body || {};
  const key = String(role || "").trim();
  if (!ROLE_SLUG.test(key)) {
    return res.status(400).json({ message: "Role key must be 2-32 characters, letters/digits/underscore, no spaces." });
  }
  if (BUILTIN_ROLES.includes(key)) {
    return res.status(400).json({ message: "That role already exists." });
  }
  if (await Permission.findOne({ role: key })) {
    return res.status(400).json({ message: "Role already exists." });
  }
  const created = await Permission.create({
    role: key,
    label: String(label || key).trim() || key,
    builtIn: false,
    pageAccess: Array.isArray(pageAccess) ? pageAccess : [],
    actionPermissions: Array.isArray(actionPermissions) ? actionPermissions : [],
    dataVisibility: Array.isArray(dataVisibility) ? dataVisibility : [],
    discountLimit: Number.isFinite(Number(discountLimit)) ? Math.max(0, Number(discountLimit)) : 0,
  });
  emitPosChange(["permissions"]);
  res.status(201).json({ ok: true, role: serialize(created) });
};

exports.deleteRole = async (req, res) => {
  if (!isSuperAdmin(req)) {
    return res.status(403).json({ message: "Only superadmin can delete roles." });
  }
  const { role } = req.params;
  if (BUILTIN_ROLES.includes(role)) {
    return res.status(400).json({ message: "Built-in roles cannot be deleted." });
  }
  const existing = await Permission.findOne({ role });
  if (!existing) return res.status(404).json({ message: "Role not found." });
  const assigned = await User.countDocuments({ role });
  if (assigned > 0) {
    return res.status(400).json({ message: `Cannot delete role while ${assigned} staff member(s) are assigned to it.` });
  }
  await Permission.deleteOne({ _id: existing._id });
  emitPosChange(["permissions"]);
  res.json({ ok: true });
};