// pages/api/inventory/index.js
import { connectDB } from "../../../lib/mongodb";
import Product from "../../../models/Product";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  await connectDB();
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.isAdmin) return res.status(403).json({ error: "Forbidden" });

  if (req.method === "GET") {
    const products = await Product.find({ active: true }).select("name category stock unit brand icon").sort({ stock: 1 });
    return res.status(200).json({ success: true, data: products });
  }

  if (req.method === "PATCH") {
    const { id, stock } = req.body;
    const product = await Product.findByIdAndUpdate(id, { stock: Number(stock) }, { new: true });
    return res.status(200).json({ success: true, data: product });
  }

  res.setHeader("Allow", ["GET", "PATCH"]);
  res.status(405).end();
}
