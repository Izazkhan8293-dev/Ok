// models/Paint.js
import mongoose from "mongoose";

const PaintSchema = new mongoose.Schema(
  {
    name:   { type: String, required: true, trim: true },
    type:   { type: String, required: true, enum: ["Interior","Exterior","Enamel","Primer"] },
    brand:  { type: String, default: "Birla Opus" },
    colour: { type: String, default: "#C8922A" },
    active: { type: Boolean, default: true },
    sizes: {
      "50ml":  { type: Number, default: 0 },
      "100ml": { type: Number, default: 0 },
      "250ml": { type: Number, default: 0 },
      "500ml": { type: Number, default: 0 },
      "1L":    { type: Number, default: 0 },
      "4L":    { type: Number, default: 0 },
      "10L":   { type: Number, default: 0 },
      "20L":   { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Paint || mongoose.model("Paint", PaintSchema);