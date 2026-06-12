// models/Order.js
import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema({
  productId: String,
  name:      String,
  brand:     String,
  variant:   String,
  rate:      Number,
  qty:       Number,
  icon:      String,
  unit:      String,
  amount:    Number,
});

const OrderSchema = new mongoose.Schema(
  {
    billNo:   { type: String, unique: true },
    customer: { type: String, required: true },
    phone:    String,
    address:  String,
    payment:  String,
    upiRef:   String,
    items:    [OrderItemSchema],
    subtotal: Number,
    sgst:     Number,
    cgst:     Number,
    grand:    Number,
    createdBy: String, // user email
  },
  { timestamps: true }
);

// Auto-generate bill number before save
OrderSchema.pre("save", async function (next) {
  if (!this.billNo) {
    const count = await mongoose.model("Order").countDocuments();
    this.billNo = "NRE" + String(count + 1001).padStart(4, "0");
  }
  next();
});

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);