// pages/api/orders/index.js
import { connectDB } from "../../../lib/mongodb";
import Order from "../../../models/Order";
import Product from "../../../models/Product";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import mongoose from "mongoose";

export default async function handler(req, res) {
  await connectDB();
  const session = await getServerSession(req, res, authOptions);

  if (req.method === "GET") {
    // Admin: all orders; User: their own
    if (!session?.user) return res.status(401).json({ error: "Unauthorized" });
    const filter = session.user.isAdmin ? {} : { createdBy: session.user.email };
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200);
    return res.status(200).json({ success: true, data: orders });
  }

  if (req.method === "POST") {
    // Anyone can place order (guest or signed-in)
    const body = req.body;
    if (!body.customer) return res.status(400).json({ error: "Customer name required" });

    try {
      // Decrement stock for each item
      for (const item of body.items || []) {
        if (item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: -(item.qty || 1) } },
            { new: true }
          );
        }
      }

      const order = await Order.create({
        ...body,
        createdBy: session?.user?.email || "guest",
      });
      return res.status(201).json({ success: true, data: order });
    } catch (error) {
      console.error("Order creation error:", error);
      return res.status(500).json({ error: "Failed to create order" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end();
}