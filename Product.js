// models/Product.js
import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: ["Electrical","Lighting","Cables","Hardware","PVC","Motors","General"] },
    brand:    { type: String, default: "Generic" },
    rate:     { type: Number, required: true, min: 0 },
    stock:    { type: Number, default: 0, min: 0 },
    unit:     { type: String, default: "Piece" },
    hsn:      { type: String, default: "" },
    icon:     { type: String, default: "📦" },
    active:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);
