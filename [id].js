// pages/api/products/[id].js
import { connectDB } from "../../../lib/mongodb";
import Product from "../../../models/Product";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  await connectDB();
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.isAdmin) return res.status(403).json({ error: "Forbidden" });

  const { id } = req.query;

  if (req.method === "PATCH") {
    const product = await Product.findByIdAndUpdate(id, req.body, { new: true });
    if (!product) return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ success: true, data: product });
  }

  if (req.method === "DELETE") {
    await Product.findByIdAndUpdate(id, { active: false });
    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", ["PATCH", "DELETE"]);
  res.status(405).end();
}
