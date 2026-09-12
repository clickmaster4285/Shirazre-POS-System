const bcrypt = require("bcryptjs");
const { MenuItem, User, Permission } = require("../models");
// const { MENU_ITEMS } = require("./menuSeedData");

async function seedMenuIfEmpty() {
  const existing = await MenuItem.find({}, { name: 1, bundleItems: 1 }).lean();
  const existingMap = new Map(existing.map((x) => [String(x.name || "").trim(), x]));

  const toInsert = [];
  const toUpdate = [];

  // for (const item of MENU_ITEMS) {
  //   const trimmedName = String(item.name || "").trim();
  //   if (!existingMap.has(trimmedName)) {
  //     toInsert.push(item);
  //   } else {
  //     // Check if it's a platter/deal and needs bundles updated
  //     const existingDoc = existingMap.get(trimmedName);
  //     if ((item.category === "Platters" || item.category === "Deals") && item.bundleItems) {
  //       if (!existingDoc.bundleItems || existingDoc.bundleItems.length === 0) {
  //         toUpdate.push(item);
  //       }
  //     }
  //   }
  // }

  // First insert new items
  if (toInsert.length > 0) {
    const docs = toInsert.map(({ name, price, category, image, description, available, perishable, kitchenRequired }) => ({
      name,
      price,
      category,
      image,
      description,
      available: available !== false,
      perishable: Boolean(perishable),
      kitchenRequired: kitchenRequired !== false,
    }));
    await MenuItem.insertMany(docs);
    console.log(`✓ Added ${toInsert.length} new menu item(s) from seed data`);

    // Refresh existing map after insertion so we can resolve bundles
    const refreshed = await MenuItem.find({}, { name: 1 }).lean();
    refreshed.forEach(x => existingMap.set(String(x.name || "").trim(), x));
  }

  // Now resolve and update bundles for both new and existing items
  // const itemsWithBundles = MENU_ITEMS.filter(item => item.bundleItems && item.bundleItems.length > 0);
  // for (const item of itemsWithBundles) {
  //   const existingDoc = existingMap.get(String(item.name || "").trim());
  //   if (!existingDoc) continue;

  //   const resolvedBundles = [];
  //   for (const bi of item.bundleItems) {
  //     const target = existingMap.get(String(bi.menuItemName || "").trim());
  //     if (target) {
  //       resolvedBundles.push({
  //         menuItem: target._id,
  //         quantity: bi.quantity || 1
  //       });
  //     }
  //   }

  //   if (resolvedBundles.length > 0) {
  //     await MenuItem.findByIdAndUpdate(existingDoc._id, { $set: { bundleItems: resolvedBundles } });
  //   }
  // }

  // if (itemsWithBundles.length > 0) {
  //   console.log(`✓ Processed bundles for ${itemsWithBundles.length} platter(s)/deal(s)`);
  // }
}

const ALL_PAGES = [
  "dashboard",
  "terminal",
  "orders",
  "tables",
  "kitchen",
  "billing",
  "menu",
  "recipes",
  "reports",
  "users",
  "inventory",
  "hr",
  "delivery",
  "analytics",
  "printers",
  "postabs",
  "giftcards",
  "fbr",
  "tax",
  "payment",
  "mobileapp",
  "outdoordelivery",
];

const MANAGER_ACTIONS = [
  "apply_discount",
  "void_order",
  "edit_menu",
  "print_bill",
  "hold_order",
  "change_table_status",
];

const MANAGER_DATA = ["view_revenue", "view_all_orders", "view_reports", "view_staff"];

const CASHIER_PAGES = ["terminal", "orders", "tables", "billing", "delivery", "giftcards"];
const CASHIER_ACTIONS = ["print_bill", "apply_discount", "hold_order", "change_table_status"];
const CASHIER_DATA = ["view_all_orders"];

async function initializeRolePermissions() {
  const roles = [
    {
      role: "superadmin",
      pageAccess: ALL_PAGES,
      actionPermissions: MANAGER_ACTIONS,
      dataVisibility: MANAGER_DATA,
    },
    {
      role: "hassaan",
      pageAccess: ALL_PAGES,
      actionPermissions: MANAGER_ACTIONS,
      dataVisibility: MANAGER_DATA,
    },
    {
      role: "fahad",
      pageAccess: ALL_PAGES,
      actionPermissions: MANAGER_ACTIONS,
      dataVisibility: MANAGER_DATA,
    },
    {
      role: "cashier",
      pageAccess: CASHIER_PAGES,
      actionPermissions: CASHIER_ACTIONS,
      dataVisibility: CASHIER_DATA,
    },
    {
      role: "store_manager",
      pageAccess: ["dashboard", "terminal", "orders", "tables", "kitchen", "billing", "inventory", "reports", "expenses", "delivery", "outdoordelivery"],
      actionPermissions: ["print_bill", "apply_discount", "hold_order", "change_table_status", "edit_menu"],
      dataVisibility: ["view_all_orders", "view_reports", "view_staff"],
    },
  ];

  for (const roleConfig of roles) {
    const permExists = await Permission.findOne({ role: roleConfig.role });
    if (!permExists) {
      await Permission.create(roleConfig);
      console.log(`✓ ${roleConfig.role} permissions initialized`);
    } else {
      let updated = false;

      const existingPages = permExists.pageAccess || [];
      const existingActions = permExists.actionPermissions || [];
      const existingData = permExists.dataVisibility || [];

      const missingPages = roleConfig.pageAccess.filter(p => !existingPages.includes(p));
      const missingActions = roleConfig.actionPermissions.filter(p => !existingActions.includes(p));
      const missingData = roleConfig.dataVisibility.filter(p => !existingData.includes(p));

      if (missingPages.length > 0) {
        permExists.pageAccess = [...existingPages, ...missingPages];
        updated = true;
      }
      if (missingActions.length > 0) {
        permExists.actionPermissions = [...existingActions, ...missingActions];
        updated = true;
      }
      if (missingData.length > 0) {
        permExists.dataVisibility = [...existingData, ...missingData];
        updated = true;
      }

      if (updated) {
        await permExists.save();
        console.log(`✓ ${roleConfig.role} permissions updated with new modules`);
      }
    }
  }
}

async function initializeSuperAdminPermission() {
  // This is now handled by initializeRolePermissions
  await initializeRolePermissions();
}

async function initializeUsers() {
  const email = String(process.env.SUPERADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD || "";
  const name = process.env.SUPERADMIN_NAME || "Super Admin";

  if (!email || !password) {
    console.warn(
      "⚠ SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD not set in .env — skipping user initialization."
    );
    return;
  }

  // Remove all existing login users. The only account is the superadmin
  // defined in .env. (Seeded/default users are intentionally not created.)
  const removed = await User.deleteMany({});
  if (removed.deletedCount > 0) {
    console.log(`✓ Removed ${removed.deletedCount} existing user(s)`);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.findOneAndUpdate(
    { email },
    { name, email, passwordHash, role: "superadmin", avatar: "" },
    { upsert: true, new: true }
  );
  console.log(`✓ Super Admin initialized from .env (${email})`);
}

async function runAutoInitialization() {
  await seedMenuIfEmpty();
  await initializeSuperAdminPermission();
  await initializeUsers();
}

module.exports = { runAutoInitialization, seedMenuIfEmpty, initializeUsers, initializeSuperAdminPermission };
