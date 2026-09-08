const { Schema, model } = require('mongoose');

const MenuCategorySchema = new Schema({
  name: { type: String, required: true, trim: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'MenuCategory', default: null },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

MenuCategorySchema.index({ parentId: 1, name: 1 }, { unique: true });

module.exports = model('MenuCategory', MenuCategorySchema);
