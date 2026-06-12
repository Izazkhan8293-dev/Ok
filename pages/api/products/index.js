// pages/api/products/index.js
import { connectDB } from "../../../lib/mongodb";
import Product from "../../../models/Product";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const SEED = [
  { name:"GM 6A 1-Way Switch", category:"Electrical", brand:"GM", rate:45, stock:200, unit:"Piece", hsn:"8536", icon:"🔌" },
  { name:"GM 16A Socket", category:"Electrical", brand:"GM", rate:85, stock:150, unit:"Piece", hsn:"8536", icon:"🔌" },
  { name:"Philips 9W LED Bulb", category:"Lighting", brand:"Philips", rate:120, stock:300, unit:"Piece", hsn:"8539", icon:"💡" },
  { name:"Crompton 20W LED Tube", category:"Lighting", brand:"Crompton", rate:280, stock:80, unit:"Piece", hsn:"8539", icon:"💡" },
  { name:"Norwood 18W LED Panel", category:"Lighting", brand:"Norwood", rate:450, stock:60, unit:"Piece", hsn:"8539", icon:"🔆" },
  { name:"Fybros 2.5 Sq mm Wire (per kg)", category:"Cables", brand:"Fybros", rate:2800, stock:30, unit:"Kg", hsn:"8544", icon:"🔴" },
  { name:"Hi-Fi 4mm Cable (per m)", category:"Cables", brand:"Hi-Fi", rate:48, stock:500, unit:"Metre", hsn:"8544", icon:"⚡" },
  { name:"CRI 0.5HP Pump Set", category:"Motors", brand:"CRI", rate:4200, stock:12, unit:"Piece", hsn:"8413", icon:"⚙" },
  { name:"Laxmi 1HP Motor", category:"Motors", brand:"Laxmi", rate:6800, stock:8, unit:"Piece", hsn:"8413", icon:"⚙" },
  { name:"1/2\" PVC Pipe 3m", category:"PVC", brand:"Supreme", rate:120, stock:100, unit:"Piece", hsn:"3917", icon:"🪠" },
  { name:"1\" CPVC Pipe 3m", category:"PVC", brand:"Ashirvad", rate:280, stock:60, unit:"Piece", hsn:"3917", icon:"🪠" },
  { name:"Hex Bolt Set 50pc", category:"Hardware", brand:"Generic", rate:180, stock:5, unit:"Box", hsn:"7318", icon:"🔩" },
  { name:"Kundan 6M Modular Plate", category:"Electrical", brand:"Kundan", rate:220, stock:75, unit:"Piece", hsn:"8536", icon:"🔌" },
  { name:"MCB Single Pole 32A", category:"Electrical", brand:"Havells", rate:390, stock:45, unit:"Piece", hsn:"8536", icon:"⚡" },
];

export default async function handler(req, res) {
  await connectDB();

  if (req.method === "GET") {
    // Seed on first run
    const count = await Product.countDocuments();
    if (count === 0) await Product.insertMany(SEED);

    const { category } = req.query;
    const filter = { active: true };
    if (category && category !== "All") filter.category = category;
    const products = await Product.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: products });
  }

  // POST — admin only
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.isAdmin) return res.status(403).json({ error: "Forbidden" });

  if (req.method === "POST") {
    const product = await Product.create(req.body);
    return res.status(201).json({ success: true, data: product });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end();
}