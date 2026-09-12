const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    role: { type: String, required: true, unique: true },
    label: { type: String, default: "" },
    builtIn: { type: Boolean, default: false },
    pageAccess: [String],
    actionPermissions: [String],
    dataVisibility: [String],
    /** Max discount in % a role may apply. 0 = no discount. Superadmin bypasses. */
    discountLimit: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Permission", permissionSchema);
