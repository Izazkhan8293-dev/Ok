// pages/api/paints/[id].js
import { connectDB } from "../../../lib/mongodb";
import Paint from "../../../models/Paint";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import mongoose from "mongoose";

export default async function handler(req, res) {
  await connectDB();
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.isAdmin) return res.status(403).json({ error: "Forbidden" });

  const { id } = req.query;

  // Validate MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid paint ID" });
  }

  try {
    if (req.method === "PATCH") {
      const paint = await Paint.findByIdAndUpdate(id, req.body, { new: true });
      if (!paint) return res.status(404).json({ error: "Paint not found" });
      return res.status(200).json({ success: true, data: paint });
    }

    if (req.method === "DELETE") {
      const paint = await Paint.findByIdAndUpdate(id, { active: false }, { new: true });
      if (!paint) return res.status(404).json({ error: "Paint not found" });
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", ["PATCH", "DELETE"]);
    res.status(405).end();
  } catch (error) {
    console.error("Paint API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}