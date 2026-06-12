// pages/api/paints/[id].js
import { connectDB } from "../../../lib/mongodb";
import Paint from "../../../models/Paint";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  await connectDB();
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.isAdmin) return res.status(403).json({ error: "Forbidden" });

  const { id } = req.query;

  if (req.method === "PATCH") {
    const paint = await Paint.findByIdAndUpdate(id, req.body, { new: true });
    return res.status(200).json({ success: true, data: paint });
  }

  if (req.method === "DELETE") {
    await Paint.findByIdAndUpdate(id, { active: false });
    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", ["PATCH", "DELETE"]);
  res.status(405).end();
}
