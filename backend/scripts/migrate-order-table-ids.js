const mongoose = require("mongoose");

require("../config/db").connectDb().then(async () => {
  const { Order, Table } = require("../models");
  const dryRun = process.argv.includes("--dry-run");
  const orders = await Order.find({ type: "dine-in", $or: [{ tableId: null }, { tableId: { $exists: false } }] }).select("_id code table").lean();
  const tables = await Table.find({}).select("_id name").lean();
  const byName = new Map(tables.map((table) => [table.name, table]));
  const unmatched = [];
  let migrated = 0;

  for (const order of orders) {
    const table = byName.get(order.table);
    if (!table) {
      unmatched.push({ code: order.code, table: order.table });
      continue;
    }
    if (!dryRun) await Order.updateOne({ _id: order._id }, { $set: { tableId: table._id } });
    migrated += 1;
  }

  console.log(JSON.stringify({ dryRun, scanned: orders.length, migrated, unmatched }, null, 2));
  process.exitCode = unmatched.length ? 2 : 0;
  await mongoose.disconnect();
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
  void mongoose.disconnect();
});
