// pages/api/inventory/index.js
import { connectDB } from "../../../lib/mongodb";
import Product from "../../../models/Product";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  await connectDB();
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.isAdmin) return res.status(403).json({ error: "Forbidden" });

  try {
    if (req.method === "GET") {
      const products = await Product.find({ active: true })
        .select("name category stock unit brand icon")
        .sort({ stock: 1 });
      return res.status(200).json({ success: true, data: products });
    }

    if (req.method === "PATCH") {
      const { id, stock } = req.body;
      if (!id || stock === undefined) {
        return res.status(400).json({ error: "ID and stock are required" });
      }
      const product = await Product.findByIdAndUpdate(
        id,
        { stock: Number(stock) },
        { new: true }
      );
      if (!product) return res.status(404).json({ error: "Product not found" });
      return res.status(200).json({ success: true, data: product });
    }

    res.setHeader("Allow", ["GET", "PATCH"]);
    res.status(405).end();
  } catch (error) {
    console.error("Inventory API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
