// pages/index.js
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Head from "next/head";

// ─── helpers ──────────────────────────────────────────────
const fmt = (n) => "₹" + Number(n).toFixed(2);
const api = async (url, opts = {}) => {
  const r = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opts });
  return r.json();
};

// ─── Invoice HTML ─────────────────────────────────────────
function buildInvoiceHTML(o) {
  const rows = o.items.map((c, i) => `
    <tr>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0">${i + 1}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0">${c.name}${c.variant ? " (" + c.variant + ")" : ""}<br><small style="color:#888">${c.brand || ""}</small></td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:right">${c.qty}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:right">${fmt(c.rate)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700">${fmt(c.rate * c.qty)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#111}
    .gold{color:#C8922A} table{width:100%;border-collapse:collapse}
    th{background:#f5f5f5;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px}
    @media print{button{display:none}}
  </style></head><body>
  <div style="border-bottom:3px solid #C8922A;padding-bottom:16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <div style="font-size:22px;font-weight:900">New Royal <span class="gold">Electricals</span> & Hardware</div>
      <div style="font-size:11px;color:#666;margin-top:4px">92, Main Road, Pennadam – 606 105, Tamil Nadu<br>Ph: 94431 82381 / 99448 64347</div>
    </div>
    <div style="text-align:right;font-size:12px">
      <div style="font-weight:700;font-size:14px">TAX INVOICE</div>
      <div>Bill No: <strong>${o.billNo}</strong></div>
      <div>Date: <strong>${o.date || new Date().toLocaleDateString("en-IN")}</strong></div>
      <div style="color:#C8922A;font-weight:700">GSTIN: 33AACFN4722E1ZR</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;background:#f9f9f9;padding:12px;border-radius:6px">
    <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999">Customer</div><div style="font-weight:700">${o.customer}</div></div>
    <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999">Phone</div><div style="font-weight:700">${o.phone || "—"}</div></div>
    <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999">Address</div><div style="font-weight:700">${o.address || "—"}</div></div>
    <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999">Payment</div><div style="font-weight:700">${o.payment}</div></div>
  </div>
  <table><thead><tr><th>#</th><th>Particulars</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div style="display:flex;justify-content:flex-end;margin-top:12px">
    <table style="width:220px">
      <tr><td style="padding:4px 8px">Subtotal</td><td style="padding:4px 8px;text-align:right">${fmt(o.subtotal)}</td></tr>
      <tr><td style="padding:4px 8px">SGST @ 9%</td><td style="padding:4px 8px;text-align:right">${fmt(o.sgst)}</td></tr>
      <tr><td style="padding:4px 8px">CGST @ 9%</td><td style="padding:4px 8px;text-align:right">${fmt(o.cgst)}</td></tr>
      <tr style="border-top:2px solid #C8922A"><td style="padding:8px;font-weight:900;font-size:15px;color:#C8922A">Grand Total</td><td style="padding:8px;text-align:right;font-weight:900;font-size:15px;color:#C8922A">${fmt(o.grand)}</td></tr>
    </table>
  </div>
  <div style="margin-top:24px;border-top:1px solid #eee;padding-top:12px;text-align:center;font-size:12px;color:#888">
    <strong>Goods Once Sold Cannot Be Taken Back</strong> · விற்ற சரக்கு திரும்பி எடுத்துக் கொள்ளப்படமாட்டாது.<br>
    Thank you for shopping at <strong style="color:#C8922A">New Royal Electricals!</strong>
  </div>
  <div style="margin-top:16px;text-align:center"><button onclick="window.print()" style="background:#C8922A;color:#fff;border:none;padding:10px 28px;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer">🖨 Print Invoice</button></div>
  </body></html>`;
}

// ─── COMPONENT ────────────────────────────────────────────
export default function Home() {
  const { data: session, status } = useSession();
  const [section, setSection] = useState("home");
  const [products, setProducts] = useState([]);
  const [paints, setPaints] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [prodCat, setProdCat] = useState("All");
  const [paintType, setPaintType] = useState("All");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminTab, setAdminTab] = useState("dashboard");
  const [payMethod, setPayMethod] = useState("Cash");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  // Billing form
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddr, setCustAddr] = useState("");
  const [upiRef, setUpiRef] = useState("");
  const [invDate, setInvDate] = useState(new Date().toISOString().split("T")[0]);
  // Add product form
  const [apForm, setApForm] = useState({ name:"", category:"Electrical", brand:"", rate:"", stock:"", unit:"Piece", hsn:"", icon:"⚡" });
  // Add paint form
  const [ppForm, setPpForm] = useState({ name:"", type:"Interior", brand:"Birla Opus", colour:"#4A90D9", "50ml":"","100ml":"","250ml":"","500ml":"","1L":"","4L":"","10L":"","20L":"" });

  // ── load ────────────────────────────────────────────────
  useEffect(() => { loadProducts(); loadPaints(); }, []);
  useEffect(() => { if (adminOpen && session?.user?.isAdmin) { loadOrders(); loadInventory(); } }, [adminOpen]);

  async function loadProducts(cat) {
    const url = cat && cat !== "All" ? `/api/products?category=${cat}` : "/api/products";
    const r = await api(url);
    if (r.success) setProducts(r.data);
  }
  async function loadPaints(type) {
    const url = type && type !== "All" ? `/api/paints?type=${type}` : "/api/paints";
    const r = await api(url);
    if (r.success) setPaints(r.data);
  }
  async function loadOrders() {
    const r = await api("/api/orders");
    if (r.success) setOrders(r.data);
  }
  async function loadInventory() {
    const r = await api("/api/inventory");
    if (r.success) setInventory(r.data);
  }

  // ── cart ────────────────────────────────────────────────
  function addToCart(p) {
    setCart(prev => {
      const key = p._id;
      const ex = prev.find(c => c.key === key && c.variant === "");
      if (ex) return prev.map(c => c.key === key && c.variant === "" ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { key, productId: p._id, name: p.name, brand: p.brand, variant: "", rate: p.rate, qty: 1, icon: p.icon, unit: p.unit }];
    });
    showToast(`${p.icon} ${p.name} added`, "success");
  }
  function addPaintToCart(p, size, rate) {
    const key = p._id + "-" + size;
    setCart(prev => {
      const ex = prev.find(c => c.key === key);
      if (ex) return prev.map(c => c.key === key ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { key, productId: key, name: p.name, brand: p.brand, variant: size, rate, qty: 1, icon: "🎨", unit: size }];
    });
    showToast(`🎨 ${p.name} (${size}) added`, "success");
  }
  function changeQty(key, d) {
    setCart(prev => prev.map(c => c.key === key ? { ...c, qty: c.qty + d } : c).filter(c => c.qty > 0));
  }
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const cartSub = cart.reduce((s, c) => s + c.rate * c.qty, 0);
  const cartSGST = cartSub * 0.09;
  const cartCGST = cartSub * 0.09;
  const cartGrand = cartSub + cartSGST + cartCGST;

  // ── billing ─────────────────────────────────────────────
  async function generateInvoice() {
    if (!custName.trim()) { showToast("⚠ Enter customer name", "error"); return; }
    setLoading(true);
    const body = {
      customer: custName, phone: custPhone, address: custAddr,
      payment: payMethod + (upiRef ? ` (${upiRef})` : ""),
      date: invDate,
      items: cart.map(c => ({ ...c, amount: c.rate * c.qty })),
      subtotal: cartSub, sgst: cartSGST, cgst: cartCGST, grand: cartGrand,
    };
    const r = await api("/api/orders", { method: "POST", body: JSON.stringify(body) });
    setLoading(false);
    if (r.success) {
      setBillOpen(false);
      setCart([]);
      printInvoice(r.data);
      showToast("🧾 Invoice generated!", "success");
    } else {
      showToast("Error: " + (r.error || "Failed"), "error");
    }
  }

  function printInvoice(order) {
    const w = window.open("", "_blank");
    w.document.write(buildInvoiceHTML(order));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  }

  // ── admin actions ────────────────────────────────────────
  async function saveProduct() {
    if (!apForm.name || !apForm.rate) { showToast("⚠ Name & Rate required", "error"); return; }
    const r = await api("/api/products", { method: "POST", body: JSON.stringify({ ...apForm, rate: +apForm.rate, stock: +apForm.stock }) });
    if (r.success) { showToast("✓ Product saved", "success"); loadProducts(); setApForm({ name:"", category:"Electrical", brand:"", rate:"", stock:"", unit:"Piece", hsn:"", icon:"⚡" }); }
  }
  async function deleteProduct(id) {
    if (!confirm("Delete product?")) return;
    await api(`/api/products/${id}`, { method: "DELETE" });
    showToast("Deleted", "error"); loadProducts();
  }
  async function savePaint() {
    if (!ppForm.name) { showToast("⚠ Name required", "error"); return; }
    const sizes = {};
    ["50ml","100ml","250ml","500ml","1L","4L","10L","20L"].forEach(s => { if (ppForm[s]) sizes[s] = +ppForm[s]; });
    const r = await api("/api/paints", { method: "POST", body: JSON.stringify({ name: ppForm.name, type: ppForm.type, brand: ppForm.brand, colour: ppForm.colour, sizes }) });
    if (r.success) { showToast("🎨 Paint saved", "success"); loadPaints(); }
  }
  async function deletePaint(id) {
    if (!confirm("Delete paint?")) return;
    await api(`/api/paints/${id}`, { method: "DELETE" });
    showToast("Deleted", "error"); loadPaints();
  }
  async function updateStock(id, stock) {
    const r = await api("/api/inventory", { method: "PATCH", body: JSON.stringify({ id, stock: +stock }) });
    if (r.success) { showToast("📦 Stock updated", "success"); loadInventory(); }
  }

  // ── toast ───────────────────────────────────────────────
  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── PWA install ─────────────────────────────────────────
  const deferredPrompt = useRef(null);
  const [showInstall, setShowInstall] = useState(false);
  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setShowInstall(true);
    });
  }, []);
  async function installApp() {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") setShowInstall(false);
  }

  const isAdmin = session?.user?.isAdmin;

  // ─────────────────────────────────────────────────────────
  // STYLES (inline for single-file portability)
  const S = {
    nav: { position:"sticky", top:0, zIndex:100, background:"rgba(13,15,20,0.97)", backdropFilter:"blur(16px)", borderBottom:"1px solid rgba(200,146,42,0.2)", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:64 },
    brand: { display:"flex", alignItems:"center", gap:10, cursor:"pointer" },
    brandIcon: { width:38, height:38, background:"linear-gradient(135deg,#C8922A,#8A6520)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 },
    navLinks: { display:"flex", gap:4 },
    navLink: (active) => ({ padding:"6px 14px", borderRadius:6, fontSize:13, fontWeight:500, color: active ? "#F0EDE6" : "#8A92A8", background: active ? "#1E2330" : "transparent", border:"none", cursor:"pointer", transition:"all .2s" }),
    navRight: { display:"flex", gap:8, alignItems:"center" },
    cartBtn: { background:"#1E2330", border:"1px solid rgba(255,255,255,0.07)", borderRadius:8, padding:"7px 14px", fontSize:13, fontWeight:600, color:"#F0EDE6", cursor:"pointer", display:"flex", alignItems:"center", gap:6 },
    cartBadge: { background:"#C8922A", color:"#000", borderRadius:10, padding:"1px 7px", fontSize:11, fontWeight:700, minWidth:20, textAlign:"center" },
    btnPrimary: { background:"linear-gradient(135deg,#C8922A,#8A6520)", color:"#000", border:"none", borderRadius:10, padding:"12px 26px", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:8 },
    btnSecondary: { background:"transparent", color:"#F0EDE6", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"12px 26px", fontSize:14, fontWeight:600, cursor:"pointer" },
    btnAdmin: { background:"linear-gradient(135deg,#C8922A,#8A6520)", color:"#000", border:"none", borderRadius:8, padding:"7px 16px", fontSize:13, fontWeight:700, cursor:"pointer" },
    section: { padding:"56px 40px" },
    sectionDark: { padding:"56px 40px", background:"#161A22" },
    sectionHeader: { textAlign:"center", marginBottom:36 },
    eyebrow: { display:"inline-block", fontSize:10, fontWeight:700, letterSpacing:3, textTransform:"uppercase", color:"#C8922A", marginBottom:10 },
    sectionTitle: { fontFamily:"'Playfair Display',serif", fontSize:"clamp(24px,3vw,36px)", fontWeight:700 },
    card: { background:"#1A1F2E", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, overflow:"hidden" },
    formControl: { width:"100%", background:"#1E2330", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", fontSize:14, color:"#F0EDE6", outline:"none", fontFamily:"Inter,sans-serif" },
    formLabel: { display:"block", fontSize:11, fontWeight:600, color:"#8A92A8", marginBottom:6, textTransform:"uppercase", letterSpacing:1 },
    modal: { background:"#161A22", border:"1px solid rgba(200,146,42,0.2)", borderRadius:16, width:"100%", maxWidth:580, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 80px rgba(0,0,0,0.6)" },
    overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(6px)" },
  };

  // ─── NAV ────────────────────────────────────────────────
  const navItems = [
    { id:"home", label:"Home" }, { id:"products", label:"Products" },
    { id:"paints", label:"🎨 Paints" }, { id:"about", label:"About" }, { id:"contact", label:"Contact" },
  ];

  return (
    <>
      <Head>
        <title>New Royal Electricals & Hardware — Pennadam</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>

      {/* ── NAV ── */}
      <nav style={S.nav}>
        <div style={S.brand} onClick={() => setSection("home")}>
          <div style={S.brandIcon}>⚡</div>
          <div>
            <div style={{ fontWeight:800, fontSize:14, lineHeight:1.1 }}>New Royal Electricals</div>
            <div style={{ fontWeight:400, fontSize:9, color:"#C8922A", letterSpacing:2, textTransform:"uppercase" }}>Est. 1970 · Pennadam</div>
          </div>
        </div>
        <div style={S.navLinks}>
          {navItems.map(n => (
            <button key={n.id} style={S.navLink(section === n.id)} onClick={() => setSection(n.id)}>{n.label}</button>
          ))}
        </div>
        <div style={S.navRight}>
          {showInstall && (
            <button onClick={installApp} style={{ background:"rgba(200,146,42,0.15)", border:"1px solid rgba(200,146,42,0.4)", borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:600, color:"#C8922A", cursor:"pointer" }}>
              📲 Install App
            </button>
          )}
          <button style={S.cartBtn} onClick={() => setCartOpen(true)}>
            🛒 <span style={S.cartBadge}>{cartCount}</span>
          </button>
          {session ? (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={session.user.image} alt="" style={{ width:30, height:30, borderRadius:"50%", border:"2px solid #C8922A" }} />
              {isAdmin && <button style={S.btnAdmin} onClick={() => setAdminOpen(true)}>⚙ Admin</button>}
              <button onClick={() => signOut()} style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"6px 12px", fontSize:12, color:"#8A92A8", cursor:"pointer" }}>Sign Out</button>
            </div>
          ) : (
            <button onClick={() => signIn("google")} style={{ background:"#fff", color:"#222", border:"none", borderRadius:8, padding:"7px 16px", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Sign in with Google
            </button>
          )}
        </div>
      </nav>

      {/* ── HOME ── */}
      {section === "home" && (
        <>
          {/* Hero */}
          <section style={{ position:"relative", overflow:"hidden", minHeight:520, display:"flex", alignItems:"center", background:"#161A22" }}>
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 80% 60% at 70% 50%,rgba(200,146,42,.12) 0%,transparent 70%),radial-gradient(ellipse 40% 80% at 10% 30%,rgba(52,152,219,.05) 0%,transparent 60%)" }} />
            <div style={{ position:"relative", zIndex:2, padding:"60px 40px", maxWidth:700 }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(200,146,42,.15)", border:"1px solid rgba(200,146,42,.3)", borderRadius:20, padding:"5px 14px", fontSize:11, fontWeight:600, color:"#C8922A", textTransform:"uppercase", letterSpacing:1.5, marginBottom:18 }}>⚡ Established 1970</div>
              <div style={{ fontSize:12, color:"#C8922A", letterSpacing:3, textTransform:"uppercase", fontWeight:600, marginBottom:10 }}>நியூ ராயல் எலக்ட்ரிக்கல்ஸ்</div>
              <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(32px,5vw,54px)", fontWeight:900, lineHeight:1.1, marginBottom:14 }}>
                New Royal <span style={{ color:"#C8922A" }}>Electricals</span><br />& Hardware
              </h1>
              <p style={{ color:"#8A92A8", fontSize:15, lineHeight:1.7, marginBottom:6 }}>Your one-stop destination for electrical, hardware & paint supplies — trusted by Pennadam for over 55 years.</p>
              <p style={{ fontSize:12, color:"#5A6278", marginBottom:26 }}>📍 92, Main Road, Pennadam – 606 105 | GSTIN: 33AACFN4722E1ZR</p>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                <button style={S.btnPrimary} onClick={() => setSection("products")}>🛍 Shop Now</button>
                <button style={S.btnSecondary} onClick={() => setSection("paints")}>🎨 View Paints</button>
              </div>
            </div>
            <div style={{ position:"absolute", right:40, top:"50%", transform:"translateY(-50%)", display:"flex", flexDirection:"column", gap:14, zIndex:2 }}>
              {[{ v: products.length || "...", l:"Products" }, { v:"55+", l:"Years Serving" }, { v:"GST", l:"Compliant" }].map(s => (
                <div key={s.l} style={{ background:"#1A1F2E", border:"1px solid rgba(200,146,42,.2)", borderRadius:12, padding:"16px 20px", textAlign:"center", minWidth:120 }}>
                  <div style={{ fontSize:28, fontWeight:900, color:"#C8922A" }}>{s.v}</div>
                  <div style={{ fontSize:10, color:"#5A6278", marginTop:4, textTransform:"uppercase", letterSpacing:1 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Brands */}
          <div style={{ background:"#1E2330", borderTop:"1px solid rgba(255,255,255,.07)", borderBottom:"1px solid rgba(255,255,255,.07)", padding:"14px 40px", display:"flex", alignItems:"center", gap:10, overflowX:"auto" }}>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#5A6278", whiteSpace:"nowrap", marginRight:8 }}>Brands We Carry</span>
            {["GM","Kundan","Hi-Fi","Fybros","Crompton","Philips","Norwood LED","CRI","Laxmi Motors","Birla Opus","PVC/UPVC/CPVC","GI Fittings"].map(b => (
              <span key={b} style={{ whiteSpace:"nowrap", padding:"4px 12px", background:"#1A1F2E", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, fontSize:12, fontWeight:600, color:"#8A92A8" }}>{b}</span>
            ))}
          </div>

          {/* Features */}
          <section style={S.sectionDark}>
            <div style={S.sectionHeader}>
              <div style={S.eyebrow}>Why Choose Us</div>
              <h2 style={S.sectionTitle}>Trusted Since <span style={{ color:"#C8922A" }}>1970</span></h2>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:18 }}>
              {[
                { icon:"⚡", t:"Electrical Supplies", d:"Switches, sockets, panels & modular accessories from GM, Kundan, Fybros." },
                { icon:"💡", t:"Lighting Solutions", d:"LED bulbs, tubes, panel lights by Crompton, Philips & Norwood." },
                { icon:"🎨", t:"Birla Opus Paints", d:"Authorised dealer — all colours, 50ml to 20L, interior & exterior." },
                { icon:"🔧", t:"Hardware & Tools", d:"Fasteners, fittings, PVC pipes, GI items & construction accessories." },
                { icon:"🧾", t:"GST Billing", d:"Every invoice is GST-compliant with SGST + CGST breakdown." },
                { icon:"💳", t:"All Payments", d:"Cash, UPI (GPay/PhonePe/Paytm), Card, Net Banking & Credit accepted." },
              ].map(f => (
                <div key={f.t} style={{ background:"#1A1F2E", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:22 }}>
                  <div style={{ fontSize:30, marginBottom:10 }}>{f.icon}</div>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>{f.t}</div>
                  <div style={{ fontSize:13, color:"#8A92A8", lineHeight:1.6 }}>{f.d}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ── PRODUCTS ── */}
      {section === "products" && (
        <section style={S.section}>
          <div style={S.sectionHeader}>
            <div style={S.eyebrow}>Our Products</div>
            <h2 style={S.sectionTitle}>Browse <span style={{ color:"#C8922A" }}>All Products</span></h2>
          </div>
          {/* Category tabs */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginBottom:28 }}>
            {["All","Electrical","Lighting","Cables","Hardware","PVC","Motors"].map(cat => (
              <button key={cat} onClick={() => { setProdCat(cat); loadProducts(cat); }}
                style={{ padding:"7px 18px", borderRadius:24, fontSize:13, fontWeight:600, border:"1px solid", borderColor: prodCat===cat ? "#C8922A":"rgba(255,255,255,.07)", background: prodCat===cat ? "rgba(200,146,42,.12)":"#1E2330", color: prodCat===cat ? "#C8922A":"#8A92A8", cursor:"pointer" }}>
                {cat}
              </button>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))", gap:16 }}>
            {products.map(p => (
              <div key={p._id} style={S.card}>
                <div style={{ height:140, background:"#1E2330", display:"flex", alignItems:"center", justifyContent:"center", fontSize:54, position:"relative" }}>
                  {p.stock < 10 && <span style={{ position:"absolute", top:10, left:10, background:"#E74C3C", color:"#fff", fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:20, textTransform:"uppercase" }}>Low Stock</span>}
                  {p.stock >= 10 && <span style={{ position:"absolute", top:10, left:10, background:"#C8922A", color:"#000", fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:20, textTransform:"uppercase" }}>In Stock</span>}
                  {p.icon}
                </div>
                <div style={{ padding:14 }}>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:3 }}>{p.name}</div>
                  <div style={{ fontSize:11, color:"#5A6278", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>{p.brand} · {p.category}</div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ fontSize:18, fontWeight:800, color:"#C8922A" }}>₹{p.rate}<small style={{ fontSize:11, fontWeight:500, color:"#5A6278" }}>/{p.unit}</small></div>
                    <button onClick={() => addToCart(p)} style={{ background:"linear-gradient(135deg,#C8922A,#8A6520)", color:"#000", border:"none", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>+ Add</button>
                  </div>
                </div>
              </div>
            ))}
            {products.length === 0 && <p style={{ gridColumn:"1/-1", textAlign:"center", color:"#5A6278", padding:40 }}>Loading products...</p>}
          </div>
        </section>
      )}

      {/* ── PAINTS ── */}
      {section === "paints" && (
        <section style={S.sectionDark}>
          <div style={S.sectionHeader}>
            <div style={S.eyebrow}>Birla Opus · Authorised Dealer</div>
            <h2 style={S.sectionTitle}>Paint <span style={{ color:"#C8922A" }}>Categories</span></h2>
            <p style={{ color:"#8A92A8", fontSize:13, marginTop:6 }}>All sizes: 50ml · 100ml · 250ml · 500ml · 1L · 4L · 10L · 20L</p>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginBottom:28 }}>
            {["All","Interior","Exterior","Enamel","Primer"].map(t => (
              <button key={t} onClick={() => { setPaintType(t); loadPaints(t); }}
                style={{ padding:"7px 18px", borderRadius:24, fontSize:13, fontWeight:600, border:"1px solid", borderColor: paintType===t ? "#C8922A":"rgba(255,255,255,.07)", background: paintType===t ? "rgba(200,146,42,.12)":"#1A1F2E", color: paintType===t ? "#C8922A":"#8A92A8", cursor:"pointer" }}>
                {t}
              </button>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:20 }}>
            {paints.map(p => (
              <div key={p._id} style={S.card}>
                <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid rgba(255,255,255,.07)" }}>
                  <div style={{ width:44, height:44, borderRadius:8, background:p.colour, flexShrink:0, border:"2px solid rgba(255,255,255,.1)" }} />
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{p.name}</div>
                    <div style={{ fontSize:11, color:"#5A6278", marginTop:2 }}>{p.brand} · {p.type}</div>
                  </div>
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ borderBottom:"1px solid rgba(255,255,255,.07)" }}>
                      {["Size","Rate","Add"].map(h => <th key={h} style={{ padding:"7px 14px", textAlign:"left", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"#5A6278" }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(p.sizes || {}).filter(([,v]) => v > 0).map(([sz, rate]) => (
                      <tr key={sz} style={{ borderBottom:"1px solid rgba(255,255,255,.02)" }}>
                        <td style={{ padding:"7px 14px", fontSize:13 }}>{sz}</td>
                        <td style={{ padding:"7px 14px", fontSize:13, fontWeight:700, color:"#C8922A" }}>₹{rate}</td>
                        <td style={{ padding:"7px 14px" }}>
                          <button onClick={() => addPaintToCart(p, sz, rate)} style={{ background:"rgba(200,146,42,.1)", border:"none", borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:700, color:"#C8922A", cursor:"pointer" }}>+ Add</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── ABOUT ── */}
      {section === "about" && (
        <section style={S.section}>
          <div style={S.sectionHeader}>
            <div style={S.eyebrow}>Our Story</div>
            <h2 style={S.sectionTitle}>About <span style={{ color:"#C8922A" }}>New Royal Electricals</span></h2>
          </div>
          <div style={{ maxWidth:800, margin:"0 auto", ...S.card, padding:36 }}>
            <p style={{ color:"#8A92A8", lineHeight:1.8, marginBottom:14 }}>Founded in <strong style={{ color:"#C8922A" }}>1970</strong>, New Royal Electricals & Hardware has grown to become Pennadam's most trusted destination for electrical, hardware, and building material supplies. For more than 55 years, we have served homeowners, electricians, contractors, builders, and industrial clients — delivering genuine products at fair prices.</p>
            <p style={{ color:"#8A92A8", lineHeight:1.8, marginBottom:24 }}>Our store carries an extensive range from leading national brands. Whether you're wiring a new home, upgrading lighting, laying pipelines, or painting walls — we have everything under one roof with knowledgeable staff ready to guide you.</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:14 }}>
              {[["55+","Years of Trust"],["100+","Brands Stocked"],["GST","Certified Billing"],["₹0","Hidden Charges"]].map(([v,l]) => (
                <div key={l} style={{ textAlign:"center", padding:16, background:"#1E2330", borderRadius:10 }}>
                  <div style={{ fontSize:26, fontWeight:900, color:"#C8922A" }}>{v}</div>
                  <div style={{ fontSize:11, color:"#5A6278", marginTop:4 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CONTACT ── */}
      {section === "contact" && (
        <section style={S.section}>
          <div style={S.sectionHeader}>
            <div style={S.eyebrow}>Get In Touch</div>
            <h2 style={S.sectionTitle}>Contact <span style={{ color:"#C8922A" }}>Us</span></h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:18, maxWidth:900, margin:"0 auto" }}>
            {[
              { icon:"📞", t:"Phone", d:"94431 82381\n99448 64347" },
              { icon:"📍", t:"Address", d:"92, Main Road\nPennadam – 606 105\nTamil Nadu, India" },
              { icon:"🕐", t:"Business Hours", d:"Mon – Sat\n8:00 AM to 8:00 PM" },
              { icon:"🧾", t:"GSTIN", d:"33AACFN4722E1ZR" },
            ].map(c => (
              <div key={c.t} style={{ ...S.card, padding:22 }}>
                <div style={{ fontSize:28, marginBottom:10 }}>{c.icon}</div>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>{c.t}</div>
                <div style={{ fontSize:13, color:"#8A92A8", lineHeight:1.8, whiteSpace:"pre-line" }}>{c.d}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ background:"#161A22", borderTop:"1px solid rgba(200,146,42,.2)", padding:36, textAlign:"center" }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, marginBottom:8 }}>New Royal <span style={{ color:"#C8922A" }}>Electricals</span> & Hardware</div>
        <div style={{ fontSize:13, color:"#5A6278", lineHeight:1.8 }}>92, Main Road, Pennadam – 606 105, Tamil Nadu<br />GSTIN: 33AACFN4722E1ZR | Ph: 94431 82381 / 99448 64347<br />Mon–Sat: 8:00 AM – 8:00 PM</div>
        <div style={{ fontSize:11, color:"#3A4058", borderTop:"1px solid rgba(255,255,255,.05)", paddingTop:14, marginTop:14 }}>© 2026 New Royal Electricals & Hardware. Established 1970. All rights reserved.</div>
      </footer>

      {/* ── CART PANEL ── */}
      {cartOpen && <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:200, backdropFilter:"blur(4px)" }} onClick={() => setCartOpen(false)} />}
      <div style={{ position:"fixed", right:0, top:0, bottom:0, width:400, maxWidth:"100%", background:"#161A22", borderLeft:"1px solid rgba(200,146,42,.2)", zIndex:201, display:"flex", flexDirection:"column", transform: cartOpen ? "translateX(0)" : "translateX(100%)", transition:"transform .3s ease" }}>
        <div style={{ padding:"18px 22px", borderBottom:"1px solid rgba(200,146,42,.2)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <span style={{ fontWeight:700, fontSize:16 }}>🛒 Cart</span>
          <button onClick={() => setCartOpen(false)} style={{ background:"#1E2330", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, padding:"5px 10px", cursor:"pointer", color:"#F0EDE6" }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"14px 20px" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign:"center", padding:40, color:"#5A6278" }}><div style={{ fontSize:48, marginBottom:12 }}>🛒</div><p>Your cart is empty</p></div>
          ) : cart.map(c => (
            <div key={c.key} style={{ background:"#1A1F2E", border:"1px solid rgba(255,255,255,.07)", borderRadius:10, padding:12, marginBottom:10, display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ fontSize:28, width:40, textAlign:"center", flexShrink:0 }}>{c.icon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{c.name}</div>
                <div style={{ fontSize:11, color:"#5A6278", marginTop:2 }}>{c.brand}{c.variant ? " · " + c.variant : ""}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontWeight:700, fontSize:14, color:"#C8922A" }}>{fmt(c.rate * c.qty)}</div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                  <button onClick={() => changeQty(c.key, -1)} style={{ background:"#252B3A", border:"1px solid rgba(255,255,255,.07)", borderRadius:5, width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#F0EDE6", fontSize:13, fontWeight:700 }}>−</button>
                  <span style={{ fontSize:13, fontWeight:600, minWidth:18, textAlign:"center" }}>{c.qty}</span>
                  <button onClick={() => changeQty(c.key, 1)} style={{ background:"#252B3A", border:"1px solid rgba(255,255,255,.07)", borderRadius:5, width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#F0EDE6", fontSize:13, fontWeight:700 }}>+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:"18px 20px", borderTop:"1px solid rgba(200,146,42,.2)", flexShrink:0 }}>
          {[["Subtotal", fmt(cartSub)],["SGST 9%", fmt(cartSGST)],["CGST 9%", fmt(cartCGST)]].map(([l,v]) => (
            <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", fontSize:13, color:"#8A92A8" }}><span>{l}</span><span>{v}</span></div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0 14px", fontSize:16, fontWeight:800, borderTop:"1px solid rgba(255,255,255,.07)", marginTop:6 }}><span>Grand Total</span><span style={{ color:"#C8922A" }}>{fmt(cartGrand)}</span></div>
          <button style={{ ...S.btnPrimary, width:"100%", justifyContent:"center" }} onClick={() => { setCartOpen(false); setBillOpen(true); }}>🧾 Generate GST Invoice</button>
        </div>
      </div>

      {/* ── BILLING MODAL ── */}
      {billOpen && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{ padding:"18px 22px", borderBottom:"1px solid rgba(200,146,42,.2)", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, background:"#161A22", zIndex:1 }}>
              <span style={{ fontWeight:700, fontSize:16 }}>📋 Generate GST Invoice</span>
              <button onClick={() => setBillOpen(false)} style={{ background:"#1E2330", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, padding:"5px 10px", cursor:"pointer", color:"#F0EDE6" }}>✕</button>
            </div>
            <div style={{ padding:22 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                <div><label style={S.formLabel}>Customer Name *</label><input style={S.formControl} value={custName} onChange={e => setCustName(e.target.value)} placeholder="Full name" /></div>
                <div><label style={S.formLabel}>Phone Number</label><input style={S.formControl} value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="Mobile" /></div>
              </div>
              <div style={{ marginBottom:14 }}><label style={S.formLabel}>Address</label><input style={S.formControl} value={custAddr} onChange={e => setCustAddr(e.target.value)} placeholder="Billing address" /></div>
              <div style={{ marginBottom:14 }}><label style={S.formLabel}>Invoice Date</label><input type="date" style={S.formControl} value={invDate} onChange={e => setInvDate(e.target.value)} /></div>

              <label style={S.formLabel}>Payment Method</label>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14 }}>
                {[["💵","Cash"],["📱","UPI"],["💳","Card"],["📝","Credit"]].map(([icon, m]) => (
                  <div key={m} onClick={() => setPayMethod(m)} style={{ background:"#1E2330", border:`2px solid ${payMethod===m ? "#C8922A":"rgba(255,255,255,.07)"}`, borderRadius:8, padding:10, textAlign:"center", cursor:"pointer" }}>
                    <div style={{ fontSize:20, display:"block", marginBottom:4 }}>{icon}</div>
                    <div style={{ fontSize:11, fontWeight:600, color: payMethod===m ? "#C8922A":"#8A92A8" }}>{m}</div>
                  </div>
                ))}
              </div>
              {payMethod === "UPI" && (
                <div style={{ marginBottom:14 }}><label style={S.formLabel}>UPI ID / Transaction Ref</label><input style={S.formControl} value={upiRef} onChange={e => setUpiRef(e.target.value)} placeholder="9443182381@upi or txn ref" /></div>
              )}

              {/* Summary */}
              <div style={{ background:"#1E2330", borderRadius:10, padding:14 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"#5A6278", marginBottom:10 }}>Order Summary</div>
                {cart.map(c => (
                  <div key={c.key} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", fontSize:12 }}>
                    <span>{c.name}{c.variant ? ` (${c.variant})` : ""} × {c.qty}</span>
                    <span style={{ color:"#C8922A" }}>{fmt(c.rate * c.qty)}</span>
                  </div>
                ))}
                <div style={{ borderTop:"1px solid rgba(255,255,255,.07)", marginTop:10, paddingTop:10 }}>
                  {[["Subtotal",fmt(cartSub)],["SGST 9%",fmt(cartSGST)],["CGST 9%",fmt(cartCGST)]].map(([l,v]) => (
                    <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"#8A92A8", padding:"2px 0" }}><span>{l}</span><span>{v}</span></div>
                  ))}
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:15, fontWeight:800, borderTop:"1px solid rgba(255,255,255,.07)", marginTop:6, paddingTop:8 }}><span>Grand Total</span><span style={{ color:"#C8922A" }}>{fmt(cartGrand)}</span></div>
                </div>
              </div>
            </div>
            <div style={{ padding:"14px 22px", borderTop:"1px solid rgba(200,146,42,.2)", display:"flex", gap:10 }}>
              <button onClick={() => setBillOpen(false)} style={{ background:"#1E2330", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, padding:"12px 20px", fontSize:14, fontWeight:600, color:"#F0EDE6", cursor:"pointer" }}>Cancel</button>
              <button onClick={generateInvoice} disabled={loading} style={{ flex:1, ...S.btnPrimary, justifyContent:"center", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Saving..." : "🖨 Generate & Print Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIN ── */}
      {adminOpen && isAdmin && (
        <div style={{ position:"fixed", inset:0, background:"#0D0F14", zIndex:500, overflowY:"auto" }}>
          <div style={{ background:"#161A22", borderBottom:"1px solid rgba(200,146,42,.2)", padding:"0 24px", height:60, display:"flex", alignItems:"center", gap:16, position:"sticky", top:0, zIndex:10 }}>
            <span style={{ fontWeight:800, fontSize:14, color:"#C8922A", flex:1 }}>⚙ Admin Panel</span>
            <div style={{ display:"flex", gap:4 }}>
              {["dashboard","products","paints","inventory","orders"].map(t => (
                <button key={t} onClick={() => setAdminTab(t)} style={{ padding:"6px 14px", borderRadius:6, fontSize:12, fontWeight:500, color: adminTab===t ? "#C8922A":"#8A92A8", background: adminTab===t ? "#1E2330":"transparent", border:"none", cursor:"pointer", textTransform:"capitalize" }}>{t}</button>
              ))}
            </div>
            <button onClick={() => setAdminOpen(false)} style={{ background:"#1E2330", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, padding:"6px 14px", fontSize:13, fontWeight:600, color:"#F0EDE6", cursor:"pointer" }}>✕ Close</button>
          </div>
          <div style={{ padding:"28px 36px" }}>

            {/* DASHBOARD */}
            {adminTab === "dashboard" && (
              <div>
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, marginBottom:22 }}>Dashboard</h2>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:14, marginBottom:28 }}>
                  {[
                    { icon:"📦", v: products.length, l:"Products" },
                    { icon:"🎨", v: paints.length, l:"Paint SKUs" },
                    { icon:"🧾", v: orders.length, l:"Total Orders" },
                    { icon:"💰", v:"₹"+orders.reduce((s,o)=>s+o.grand,0).toFixed(0), l:"Total Revenue" },
                    { icon:"⚠️", v: inventory.filter(i=>i.stock<10).length, l:"Low Stock" },
                  ].map(s => (
                    <div key={s.l} style={{ background:"#1A1F2E", border:"1px solid rgba(255,255,255,.07)", borderRadius:12, padding:20 }}>
                      <div style={{ fontSize:26, marginBottom:8 }}>{s.icon}</div>
                      <div style={{ fontSize:26, fontWeight:900, color:"#C8922A" }}>{s.v}</div>
                      <div style={{ fontSize:12, color:"#8A92A8", marginTop:4 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <AdminTable cols={["Bill No","Customer","Total","Payment"]}
                  rows={[...orders].slice(0,10).map(o => [o.billNo, o.customer, fmt(o.grand), o.payment])} />
              </div>
            )}

            {/* PRODUCTS */}
            {adminTab === "products" && (
              <div>
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, marginBottom:22 }}>Manage Products</h2>
                <div style={{ background:"#1A1F2E", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:22, marginBottom:24 }}>
                  <div style={{ fontWeight:700, marginBottom:16 }}>➕ Add New Product</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:12 }}>
                    <div><label style={S.formLabel}>Name *</label><input style={S.formControl} value={apForm.name} onChange={e=>setApForm(f=>({...f,name:e.target.value}))} placeholder="Product name" /></div>
                    <div><label style={S.formLabel}>Category</label>
                      <select style={S.formControl} value={apForm.category} onChange={e=>setApForm(f=>({...f,category:e.target.value}))}>
                        {["Electrical","Lighting","Cables","Hardware","PVC","Motors","General"].map(c=><option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div><label style={S.formLabel}>Brand</label><input style={S.formControl} value={apForm.brand} onChange={e=>setApForm(f=>({...f,brand:e.target.value}))} placeholder="Brand" /></div>
                    <div><label style={S.formLabel}>Rate ₹ *</label><input type="number" style={S.formControl} value={apForm.rate} onChange={e=>setApForm(f=>({...f,rate:e.target.value}))} placeholder="0" /></div>
                    <div><label style={S.formLabel}>Stock</label><input type="number" style={S.formControl} value={apForm.stock} onChange={e=>setApForm(f=>({...f,stock:e.target.value}))} placeholder="0" /></div>
                    <div><label style={S.formLabel}>Unit</label>
                      <select style={S.formControl} value={apForm.unit} onChange={e=>setApForm(f=>({...f,unit:e.target.value}))}>
                        {["Piece","Box","Kg","Metre","Litre"].map(u=><option key={u}>{u}</option>)}
                      </select>
                    </div>
                    <div><label style={S.formLabel}>HSN Code</label><input style={S.formControl} value={apForm.hsn} onChange={e=>setApForm(f=>({...f,hsn:e.target.value}))} placeholder="HSN" /></div>
                    <div><label style={S.formLabel}>Icon</label><input style={S.formControl} value={apForm.icon} onChange={e=>setApForm(f=>({...f,icon:e.target.value}))} placeholder="⚡" /></div>
                  </div>
                  <button onClick={saveProduct} style={{ ...S.btnPrimary, marginTop:14 }}>💾 Save Product</button>
                </div>
                <AdminTable cols={["Product","Category","Brand","Rate","Stock","Actions"]}
                  rows={products.map(p => [
                    `${p.icon} ${p.name}`, p.category, p.brand,
                    <span style={{color:"#C8922A",fontWeight:700}}>₹{p.rate}</span>,
                    <span style={{color: p.stock<10?"#E74C3C":p.stock<30?"#F39C12":"#2ECC71"}}>{p.stock}</span>,
                    <button onClick={()=>deleteProduct(p._id)} style={{background:"rgba(231,76,60,.1)",border:"1px solid rgba(231,76,60,.2)",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",color:"#E74C3C"}}>Delete</button>
                  ])} />
              </div>
            )}

            {/* PAINTS */}
            {adminTab === "paints" && (
              <div>
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, marginBottom:22 }}>Manage Paints</h2>
                <div style={{ background:"#1A1F2E", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:22, marginBottom:24 }}>
                  <div style={{ fontWeight:700, marginBottom:16 }}>➕ Add New Paint</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12 }}>
                    <div><label style={S.formLabel}>Name *</label><input style={S.formControl} value={ppForm.name} onChange={e=>setPpForm(f=>({...f,name:e.target.value}))} placeholder="Paint name" /></div>
                    <div><label style={S.formLabel}>Type</label>
                      <select style={S.formControl} value={ppForm.type} onChange={e=>setPpForm(f=>({...f,type:e.target.value}))}>
                        {["Interior","Exterior","Enamel","Primer"].map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div><label style={S.formLabel}>Brand</label><input style={S.formControl} value={ppForm.brand} onChange={e=>setPpForm(f=>({...f,brand:e.target.value}))} /></div>
                    <div><label style={S.formLabel}>Colour</label><input type="color" style={{...S.formControl,padding:4,height:42}} value={ppForm.colour} onChange={e=>setPpForm(f=>({...f,colour:e.target.value}))} /></div>
                    {["50ml","100ml","250ml","500ml","1L","4L","10L","20L"].map(sz => (
                      <div key={sz}><label style={S.formLabel}>{sz} Rate ₹</label><input type="number" style={S.formControl} value={ppForm[sz]} onChange={e=>setPpForm(f=>({...f,[sz]:e.target.value}))} placeholder="0" /></div>
                    ))}
                  </div>
                  <button onClick={savePaint} style={{ ...S.btnPrimary, marginTop:14 }}>🎨 Save Paint</button>
                </div>
                <AdminTable cols={["Colour","Name","Type","Brand","1L Rate","Actions"]}
                  rows={paints.map(p => [
                    <div style={{width:24,height:24,borderRadius:4,background:p.colour,border:"1px solid rgba(255,255,255,.2)"}} />,
                    p.name, p.type, p.brand,
                    <span style={{color:"#C8922A",fontWeight:700}}>₹{p.sizes?.["1L"]||"—"}</span>,
                    <button onClick={()=>deletePaint(p._id)} style={{background:"rgba(231,76,60,.1)",border:"1px solid rgba(231,76,60,.2)",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",color:"#E74C3C"}}>Delete</button>
                  ])} />
              </div>
            )}

            {/* INVENTORY */}
            {adminTab === "inventory" && (
              <div>
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, marginBottom:22 }}>Inventory Management</h2>
                {inventory.filter(i=>i.stock<10).length > 0 && (
                  <div style={{ background:"rgba(231,76,60,.08)", border:"1px solid rgba(231,76,60,.2)", borderRadius:10, padding:"12px 16px", marginBottom:18, fontSize:13, color:"#E74C3C" }}>
                    ⚠️ {inventory.filter(i=>i.stock<10).length} products are critically low on stock!
                  </div>
                )}
                <AdminTable cols={["Product","Category","Stock","Status","Update"]}
                  rows={inventory.map(p => [
                    `${p.icon||"📦"} ${p.name}`, p.category,
                    <span style={{fontWeight:700}}>{p.stock}</span>,
                    <span style={{padding:"3px 9px",borderRadius:12,fontSize:10,fontWeight:700,background:p.stock<10?"rgba(231,76,60,.15)":p.stock<30?"rgba(243,156,18,.15)":"rgba(46,204,113,.15)",color:p.stock<10?"#E74C3C":p.stock<30?"#F39C12":"#2ECC71"}}>
                      {p.stock<10?"🔴 Critical":p.stock<30?"🟡 Low":"🟢 OK"}
                    </span>,
                    <input type="number" defaultValue={p.stock} style={{width:80,background:"#1E2330",border:"1px solid rgba(255,255,255,.1)",borderRadius:6,padding:"4px 8px",color:"#F0EDE6",fontSize:12}} onBlur={e=>updateStock(p._id,e.target.value)} />
                  ])} />
              </div>
            )}

            {/* ORDERS */}
            {adminTab === "orders" && (
              <div>
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, marginBottom:22 }}>Order History</h2>
                <AdminTable cols={["Bill No","Date","Customer","Items","Total","Payment","Print"]}
                  rows={orders.map(o => [
                    <span style={{fontFamily:"monospace",color:"#C8922A"}}>{o.billNo}</span>,
                    new Date(o.createdAt).toLocaleDateString("en-IN"),
                    o.customer, `${o.items?.length||0} items`,
                    <span style={{fontWeight:700}}>₹{Number(o.grand).toFixed(2)}</span>,
                    o.payment,
                    <button onClick={()=>printInvoice(o)} style={{background:"#1E2330",border:"1px solid rgba(255,255,255,.1)",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",color:"#F0EDE6"}}>🖨</button>
                  ])} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, zIndex:1000, background:"#1A1F2E", border:`1px solid ${toast.type==="success"?"rgba(46,204,113,.4)":"rgba(231,76,60,.4)"}`, borderRadius:10, padding:"12px 18px", fontSize:13, fontWeight:600, boxShadow:"0 8px 32px rgba(0,0,0,.4)", display:"flex", alignItems:"center", gap:8, maxWidth:320 }}>
          <span style={{ color: toast.type==="success" ? "#2ECC71":"#E74C3C" }}>●</span>
          {toast.msg}
        </div>
      )}
    </>
  );
}

// ── Reusable table component ─────────────────────────────
function AdminTable({ cols, rows }) {
  return (
    <div style={{ background:"#1A1F2E", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, overflow:"hidden" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr style={{ background:"#1E2330", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
            {cols.map(c => <th key={c} style={{ padding:"11px 16px", textAlign:"left", fontSize:10, textTransform:"uppercase", letterSpacing:1, color:"#5A6278", fontWeight:700 }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length} style={{ textAlign:"center", padding:28, color:"#5A6278", fontSize:13 }}>No data yet</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,.03)" }}>
              {row.map((cell, j) => <td key={j} style={{ padding:"11px 16px", fontSize:13, verticalAlign:"middle" }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
