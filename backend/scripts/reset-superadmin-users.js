require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { User } = require("../models");
const { mongoUri } = require("../config/config");

async function main() {
  await mongoose.connect(mongoUri);
  console.log(`Connected to: ${mongoose.connection.name}`);

  const email = String(process.env.SUPERADMIN_EMAIL || "superadmin@gmail.com")
    .trim()
    .toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD || "shre@admin321";
  const name = process.env.SUPERADMIN_NAME || "Super Admin";

  if (!process.env.SUPERADMIN_PASSWORD) {
    console.warn("SUPERADMIN_PASSWORD not set in .env, using: shre@admin321");
  }

  const LEGACY_SEED_EMAILS = ["hassaan@gmail.com", "fahad@gmail.com", "cashier@gmail.com"];

  const removed = await User.deleteMany({ email: { $in: LEGACY_SEED_EMAILS } });
  console.log(`Removed ${removed.deletedCount} legacy user(s): ${LEGACY_SEED_EMAILS.join(", ")}`);

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await User.findOneAndUpdate(
    { email },
    { name, email, passwordHash, role: "superadmin", avatar: "" },
    { upsert: true, new: true }
  );
  console.log(`Super Admin ready: ${admin.email} (password reset).`);

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});