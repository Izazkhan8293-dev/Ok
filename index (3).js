// pages/api/paints/index.js
import { connectDB } from "../../../lib/mongodb";
import Paint from "../../../models/Paint";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const SEED_PAINTS = [
  { name:"Blue Colour Paint",     type:"Interior", brand:"Birla Opus", colour:"#4A90D9", sizes:{"50ml":45,"100ml":80,"250ml":180,"500ml":340,"1L":620,"4L":2200,"10L":5200,"20L":9800}},
  { name:"White Emulsion",        type:"Interior", brand:"Birla Opus", colour:"#F0EDE6", sizes:{"50ml":35,"100ml":60,"250ml":140,"500ml":260,"1L":480,"4L":1700,"10L":3900,"20L":7200}},
  { name:"Yellow Sunshine",       type:"Interior", brand:"Birla Opus", colour:"#F5C518", sizes:{"50ml":50,"100ml":90,"250ml":200,"500ml":380,"1L":700,"4L":2500,"10L":5800,"20L":10500}},
  { name:"Beige Premium Exterior",type:"Exterior", brand:"Birla Opus", colour:"#D4B896", sizes:{"50ml":55,"100ml":100,"250ml":230,"500ml":440,"1L":820,"4L":3000,"10L":6800,"20L":12500}},
  { name:"Red Oxide Primer",      type:"Primer",   brand:"Birla Opus", colour:"#8B2020", sizes:{"50ml":40,"100ml":70,"250ml":160,"500ml":300,"1L":560,"4L":2000,"10L":4600,"20L":8500}},
  { name:"White Enamel Gloss",    type:"Enamel",   brand:"Birla Opus", colour:"#FAFAFA", sizes:{"50ml":60,"100ml":110,"250ml":260,"500ml":490,"1L":920,"4L":3400,"10L":7800,"20L":14000}},
  { name:"Green Forest",          type:"Interior", brand:"Birla Opus", colour:"#2D7A3A", sizes:{"50ml":48,"100ml":85,"250ml":190,"500ml":360,"1L":660,"4L":2350,"10L":5400,"20L":10000}},
  { name:"Dark Grey Exterior",    type:"Exterior", brand:"Birla Opus", colour:"#555A66", sizes:{"50ml":55,"100ml":100,"250ml":235,"500ml":450,"1L":840,"4L":3100,"10L":7000,"20L":13000}},
  { name:"Terracotta",            type:"Exterior", brand:"Birla Opus", colour:"#C0522A", sizes:{"50ml":55,"100ml":100,"250ml":235,"500ml":450,"1L":840,"4L":3100,"10L":7000,"20L":13000}},
  { name:"Ivory Classic",         type:"Interior", brand:"Birla Opus", colour:"#EFE8D5", sizes:{"50ml":38,"100ml":65,"250ml":150,"500ml":280,"1L":510,"4L":1800,"10L":4200,"20L":7800}},
];

export default async function handler(req, res) {
  await connectDB();

  if (req.method === "GET") {
    const count = await Paint.countDocuments();
    if (count === 0) await Paint.insertMany(SEED_PAINTS);

    const { type } = req.query;
    const filter = { active: true };
    if (type && type !== "All") filter.type = type;
    const paints = await Paint.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: paints });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.isAdmin) return res.status(403).json({ error: "Forbidden" });

  if (req.method === "POST") {
    const paint = await Paint.create(req.body);
    return res.status(201).json({ success: true, data: paint });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end();
}
