import React, { useState, useMemo, useEffect, useRef } from "react";
import { Plus, Trash2, Search, BarChart3, FilePlus, X, Users, ChevronRight, ArrowLeft, Edit2 } from "lucide-react";
import { db } from "./firebase";
import { collection, doc, onSnapshot, setDoc, deleteDoc, getDoc } from "firebase/firestore";

// ===== 初始資料 =====
const INIT_PLATFORMS = ["IG", "FB", "LINE", "Threads", "朋友介紹", "現場"];
const INIT_MASTERS = ["師傅A", "師傅B", "師傅C"];
const INIT_TYPES = ["改衣", "訂做"];
const STATUSES = [
  { key: "待處理",  color: "#B45309", bg: "#FEF3C7" },
  { key: "完成待取", color: "#1D4ED8", bg: "#DBEAFE" },
  { key: "已結案",  color: "#059669", bg: "#D1FAE5" },
];
const C = { navy: "#1E3A5F", blue: "#2E8BC0", gold: "#D4A843", green: "#059669", red: "#DC2626", bg: "#F5F7FA", line: "#E2E8F0", sub: "#64748B", ink: "#0F172A" };

const sumFee    = (o) => o.items.reduce((s, i) => s + (Number(i.fee)     || 0), 0);
const sumItemMat = (o) => o.items.reduce((s, i) => s + (Number(i.itemMat) || 0), 0);
const sumItemPay = (o) => o.items.reduce((s, i) => s + (Number(i.itemPay) || 0), 0);
const profit     = (o) => sumFee(o) - (Number(o.masterPay) || 0) - sumItemMat(o) - (Number(o.elec) || 0);
const NT         = (n) => "NT$" + (Number(n) || 0).toLocaleString();
const blankItem  = () => ({ name: "", brand: "", method: "", size: "", fee: "", itemPay: "", itemMat: "", note: "" });
const statusMeta = (key) => STATUSES.find((s) => s.key === key) || STATUSES[0];
const freqSort   = (list, map) => [...list].sort((a, b) => (map[b] || 0) - (map[a] || 0));

// ===== App =====
export default function App() {
  const [tab, setTab] = useState("new");
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [masters, setMasters] = useState(INIT_MASTERS);
  const [platforms, setPlatforms] = useState(INIT_PLATFORMS);
  const [types, setTypes] = useState(INIT_TYPES);
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef({ c: false, o: false });

  useEffect(() => {
    getDoc(doc(db, "config", "lists")).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.masters?.length) setMasters(d.masters);
        if (d.platforms?.length) setPlatforms(d.platforms);
        if (d.types?.length) setTypes(d.types);
      } else {
        setDoc(doc(db, "config", "lists"), { masters: INIT_MASTERS, platforms: INIT_PLATFORMS, types: INIT_TYPES });
      }
    });

    const checkLoaded = () => {
      if (loadedRef.current.c && loadedRef.current.o) setLoaded(true);
    };
    const unsubC = onSnapshot(collection(db, "customers"), snap => {
      setCustomers(snap.docs.map(d => d.data()));
      loadedRef.current.c = true;
      checkLoaded();
    });
    const unsubO = onSnapshot(collection(db, "orders"), snap => {
      setOrders(snap.docs.map(d => d.data()));
      loadedRef.current.o = true;
      checkLoaded();
    });
    return () => { unsubC(); unsubO(); };
  }, []);

  const handleSetMasters = fn => {
    setMasters(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      setDoc(doc(db, "config", "lists"), { masters: next }, { merge: true });
      return next;
    });
  };
  const handleSetPlatforms = fn => {
    setPlatforms(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      setDoc(doc(db, "config", "lists"), { platforms: next }, { merge: true });
      return next;
    });
  };
  const handleSetTypes = fn => {
    setTypes(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      setDoc(doc(db, "config", "lists"), { types: next }, { merge: true });
      return next;
    });
  };

  const addCustomer  = data => setDoc(doc(db, "customers", data.id), data);
  const addOrder     = data => setDoc(doc(db, "orders", data.id), data);
  const updateOrder  = data => setDoc(doc(db, "orders", data.id), data);
  const deleteOrder  = id   => deleteDoc(doc(db, "orders", id));
  const changeStatus = (id, status) => {
    const order = orders.find(o => o.id === id);
    if (order) setDoc(doc(db, "orders", id), { ...order, status });
  };

  const lists = {
    masters, setMasters: handleSetMasters,
    platforms, setPlatforms: handleSetPlatforms,
    types, setTypes: handleSetTypes,
  };

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif", color: C.ink }}>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1, color: C.navy, marginBottom: 12 }}>改衣記帳</div>
      <div style={{ color: C.sub, fontSize: 14 }}>載入中…</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif", color: C.ink, paddingBottom: 80 }}>
      <header style={{ background: C.navy, color: "#fff", padding: "16px 20px", borderBottom: `3px solid ${C.gold}` }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>改衣記帳</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>建檔一次，統計自動更新</div>
      </header>
      <main style={{ maxWidth: 560, margin: "0 auto", padding: 16 }}>
        {tab === "new"   && <NewOrder customers={customers} addCustomer={addCustomer} orders={orders} addOrder={addOrder} {...lists} />}
        {tab === "stat"  && <Stats orders={orders} />}
        {tab === "query" && <Query customers={customers} orders={orders} updateOrder={updateOrder} deleteOrder={deleteOrder} changeStatus={changeStatus} {...lists} />}
      </main>
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: `1px solid ${C.line}`, display: "flex", boxShadow: "0 -2px 12px rgba(0,0,0,0.04)" }}>
        {[{ k: "new", label: "建檔", icon: FilePlus }, { k: "stat", label: "統計", icon: BarChart3 }, { k: "query", label: "查歷史", icon: Search }].map(({ k, label, icon: Icon }) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "10px 0 12px", border: "none", background: "none", cursor: "pointer", color: tab === k ? C.blue : C.sub, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <Icon size={22} strokeWidth={tab === k ? 2.4 : 1.8} /><span style={{ fontSize: 11, fontWeight: tab === k ? 700 : 500 }}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ===== AddInline =====
function AddInline({ placeholder, value, onChange, onConfirm, onCancel }) {
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
      <input autoFocus placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onConfirm(); if (e.key === "Escape") onCancel(); }}
        style={{ ...inp, flex: 1 }} />
      <button onClick={onConfirm} style={{ ...iconBtn, background: C.blue, border: "none", flexShrink: 0 }}>
        <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, lineHeight: 1 }}>✓</span>
      </button>
      <button onClick={onCancel} style={{ ...iconBtn, flexShrink: 0 }}><X size={15} color={C.sub} /></button>
    </div>
  );
}

// ===== DynSelect：下拉 + 新增 + 頻率排序 =====
function DynSelect({ value, onChange, list, setList, addLabel, orders, freqKey, style }) {
  const [showAdd, setShowAdd] = useState(false);
  const [addVal, setAddVal] = useState("");
  const freqMap = useMemo(() => {
    if (!orders || !freqKey) return {};
    const m = {};
    orders.forEach((o) => { const v = o[freqKey]; if (v) m[v] = (m[v] || 0) + 1; });
    return m;
  }, [orders, freqKey]);
  const sorted = useMemo(() => freqSort(list, freqMap), [list, freqMap]);
  const confirm = () => {
    const v = addVal.trim();
    if (!v) return;
    if (!list.includes(v)) setList((prev) => [...prev, v]);
    onChange(v);
    setAddVal(""); setShowAdd(false);
  };
  if (showAdd) return <AddInline placeholder={addLabel} value={addVal} onChange={setAddVal} onConfirm={confirm} onCancel={() => { setShowAdd(false); setAddVal(""); }} />;
  return (
    <select value={value} onChange={(e) => { if (e.target.value === "__new__") setShowAdd(true); else onChange(e.target.value); }} style={{ ...inp, ...style }}>
      {sorted.map((v) => <option key={v} value={v}>{v}</option>)}
      <option value="__new__">＋ 新增{addLabel}...</option>
    </select>
  );
}

// ===== MasterPayField：師傅工資整單（自動加總，可手動覆蓋）=====
function MasterPayField({ autoSum, override, setOverride, manual, setManual }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Label style={{ marginBottom: 0 }}>師傅工資（整單實付）</Label>
        {override
          ? <button onClick={() => { setOverride(false); setManual(""); }} style={{ fontSize: 11, color: C.blue, background: "none", border: "none", cursor: "pointer", padding: 0 }}>↺ 自動計算</button>
          : <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>自動計算中</span>}
      </div>
      <input inputMode="numeric" placeholder="0"
        value={override ? manual : (autoSum > 0 ? String(autoSum) : "")}
        onChange={(e) => { setOverride(true); setManual(e.target.value); }}
        style={{ ...inp, borderColor: override ? C.gold : C.line }} />
    </div>
  );
}

// ===== ItemFields：項目編輯區（新增/編輯共用）=====
function ItemFields({ items, setItems, histItemNames, histBrands, histMethods, histSizes }) {
  const setItem = (idx, key, val) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it));
  const addItem = () => setItems((prev) => [...prev, blankItem()]);
  const delItem = (idx) => setItems((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
  return (
    <>
      {items.map((it, idx) => (
        <div key={idx} style={{ background: "#fff", borderRadius: 12, padding: 14, border: `1px solid ${C.line}`, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>項目 {idx + 1}</span>
            <button onClick={() => delItem(idx)} style={{ ...iconBtn, width: 34, height: 34 }} aria-label="刪除項目"><Trash2 size={16} color={C.sub} /></button>
          </div>
          <input list="hist-item-names" placeholder="項目名稱（如 改褲長）" value={it.name} onChange={(e) => setItem(idx, "name", e.target.value)} style={{ ...inp, marginBottom: 8 }} />
          <input list="hist-brands" placeholder="品牌 / 商品種類（如 UNIQLO、自製）" value={it.brand || ""} onChange={(e) => setItem(idx, "brand", e.target.value)} style={{ ...inp, marginBottom: 8 }} />
          <input list="hist-methods" placeholder="改法 / 規格（如 收邊3cm、雙踏縫）" value={it.method} onChange={(e) => setItem(idx, "method", e.target.value)} style={{ ...inp, marginBottom: 8 }} />
          <input list="hist-sizes" placeholder="尺寸（如 原72→改68）" value={it.size} onChange={(e) => setItem(idx, "size", e.target.value)} style={{ ...inp, marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}><MiniLabel>客人收費報價</MiniLabel>
              <input inputMode="numeric" placeholder="0" value={it.fee} onChange={(e) => setItem(idx, "fee", e.target.value)} style={inp} /></div>
            <div style={{ flex: 1 }}><MiniLabel>此項師傅工資</MiniLabel>
              <input inputMode="numeric" placeholder="0" value={it.itemPay} onChange={(e) => setItem(idx, "itemPay", e.target.value)} style={inp} /></div>
            <div style={{ flex: 1 }}><MiniLabel>此項材料費</MiniLabel>
              <input inputMode="numeric" placeholder="0" value={it.itemMat} onChange={(e) => setItem(idx, "itemMat", e.target.value)} style={inp} /></div>
          </div>
          <input placeholder="個別備註" value={it.note} onChange={(e) => setItem(idx, "note", e.target.value)} style={inp} />
        </div>
      ))}
      <datalist id="hist-item-names">{histItemNames.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="hist-brands">{histBrands.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="hist-methods">{histMethods.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="hist-sizes">{histSizes.map((v) => <option key={v} value={v} />)}</datalist>
      <button onClick={addItem} style={{ ...addBtn, width: "100%", justifyContent: "center", marginBottom: 12 }}><Plus size={16} /> 新增項目</button>
    </>
  );
}

// ===== NewOrder =====
function NewOrder({ customers, addCustomer, orders, addOrder, masters, setMasters, platforms, setPlatforms, types, setTypes }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [custMode, setCustMode] = useState("existing");
  const [cust, setCust] = useState(customers[0]?.id || "");
  const [newCust, setNewCust] = useState({ id: "", name: "", phone: "", platform: platforms[0] || "", note: "" });
  const [type, setType] = useState(types[0] || "改衣");
  const [master, setMaster] = useState(masters[0] || "");
  const [platform, setPlatform] = useState(platforms[0] || "");
  const [items, setItems] = useState([blankItem()]);
  const [masterPayOverride, setMasterPayOverride] = useState(false);
  const [masterPayManual, setMasterPayManual] = useState("");
  const [elec, setElec] = useState("");
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");

  const histItemNames = useMemo(() => [...new Set(orders.flatMap((o) => o.items.map((i) => i.name)).filter(Boolean))].sort(), [orders]);
  const histBrands    = useMemo(() => [...new Set(orders.flatMap((o) => o.items.map((i) => i.brand || "")).filter(Boolean))].sort(), [orders]);
  const histMethods   = useMemo(() => [...new Set(orders.flatMap((o) => o.items.map((i) => i.method)).filter(Boolean))].sort(), [orders]);
  const histSizes     = useMemo(() => [...new Set(orders.flatMap((o) => o.items.map((i) => i.size)).filter(Boolean))].sort(), [orders]);

  const liveTotal    = items.reduce((s, i) => s + (Number(i.fee) || 0), 0);
  const liveMat      = items.reduce((s, i) => s + (Number(i.itemMat) || 0), 0);
  const liveItemPay  = items.reduce((s, i) => s + (Number(i.itemPay) || 0), 0);
  const effMasterPay = masterPayOverride ? (Number(masterPayManual) || 0) : liveItemPay;
  const liveProfit   = liveTotal - effMasterPay - liveMat - (Number(elec) || 0);

  const save = () => {
    let custId = cust;
    if (custMode === "new") {
      if (!newCust.id.trim()) { setToast("請填聯絡帳號"); return; }
      if (!customers.find((c) => c.id === newCust.id)) addCustomer({ ...newCust });
      custId = newCust.id;
    }
    if (!custId) { setToast("請選擇客戶"); return; }
    if (items.every((i) => !i.name.trim())) { setToast("至少填一個修改項目"); return; }
    const order = {
      id: "o" + Date.now(), date, cust: custId, type, master, status: "待處理",
      platform: custMode === "new" ? newCust.platform : platform,
      items: items.filter((i) => i.name.trim()).map((i) => ({
        name: i.name, brand: i.brand || "", method: i.method, size: i.size,
        fee: Number(i.fee) || 0, itemPay: Number(i.itemPay) || 0, itemMat: Number(i.itemMat) || 0, note: i.note,
      })),
      masterPay: effMasterPay, elec: Number(elec) || 0, note,
    };
    addOrder(order);
    setToast("已建檔！");
    setItems([blankItem()]); setMasterPayOverride(false); setMasterPayManual(""); setElec(""); setNote("");
    setTimeout(() => setToast(""), 2600);
  };

  return (
    <div>
      <SectionTitle>新增訂單</SectionTitle>
      <Card>
        <Label>日期</Label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} />
        <Label style={{ marginTop: 14 }}>客戶</Label>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <Toggle active={custMode === "existing"} onClick={() => setCustMode("existing")}>選現有</Toggle>
          <Toggle active={custMode === "new"} onClick={() => setCustMode("new")}>新客戶</Toggle>
        </div>
        {custMode === "existing" ? (
          <select value={cust} onChange={(e) => setCust(e.target.value)} style={inp}>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}（{c.id}）</option>)}
          </select>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            <input placeholder="聯絡帳號 IG/FB/LINE（唯一）" value={newCust.id} onChange={(e) => setNewCust({ ...newCust, id: e.target.value })} style={inp} />
            <input placeholder="姓名" value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} style={inp} />
            <input placeholder="電話" value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} style={inp} />
            <input placeholder="備註（體型/偏好/常做尺寸）" value={newCust.note} onChange={(e) => setNewCust({ ...newCust, note: e.target.value })} style={inp} />
          </div>
        )}
      </Card>
      <Card>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Label>類型</Label>
            <DynSelect value={type} onChange={setType} list={types} setList={setTypes} addLabel="類型" orders={orders} freqKey="type" />
          </div>
          <div style={{ flex: 1 }}>
            <Label>師傅</Label>
            <DynSelect value={master} onChange={setMaster} list={masters} setList={setMasters} addLabel="師傅" orders={orders} freqKey="master" />
          </div>
        </div>
        <Label style={{ marginTop: 14 }}>來源平台</Label>
        {custMode === "new" ? (
          <>
            <DynSelect value={newCust.platform} onChange={(v) => setNewCust({ ...newCust, platform: v })} list={platforms} setList={setPlatforms} addLabel="來源平台" orders={orders} freqKey="platform" />
            <Hint>新客戶用此平台建檔</Hint>
          </>
        ) : (
          <DynSelect value={platform} onChange={setPlatform} list={platforms} setList={setPlatforms} addLabel="來源平台" orders={orders} freqKey="platform" />
        )}
      </Card>

      <SectionTitle>修改項目（一張單一位師傅，每項可記詳細）</SectionTitle>
      <ItemFields items={items} setItems={setItems} histItemNames={histItemNames} histBrands={histBrands} histMethods={histMethods} histSizes={histSizes} />

      <Card>
        <Hint style={{ marginTop: 0, marginBottom: 10 }}>
          各項師傅工資加總：{NT(liveItemPay)}（自動帶入下方整單工資，可手動調整）
        </Hint>
        <div style={{ display: "flex", gap: 10 }}>
          <MasterPayField autoSum={liveItemPay} override={masterPayOverride} setOverride={setMasterPayOverride} manual={masterPayManual} setManual={setMasterPayManual} />
          <div style={{ flex: 1 }}>
            <Label>電費</Label>
            <input inputMode="numeric" placeholder="0" value={elec} onChange={(e) => setElec(e.target.value)} style={inp} />
          </div>
        </div>
        <Label style={{ marginTop: 14 }}>整單備註</Label>
        <input placeholder="取件日 / 其他" value={note} onChange={(e) => setNote(e.target.value)} style={inp} />
      </Card>

      <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: `1px solid ${C.line}`, marginBottom: 12 }}>
        <Row label="本單收入" value={NT(liveTotal)} bold />
        <Row label="項目材料費合計" value={NT(liveMat)} />
        <Row label="預估毛利（扣師傅工資/材料/電費）" value={NT(liveProfit)} color={liveProfit < 0 ? C.red : C.green} bold />
      </div>
      <button onClick={save} style={{ width: "100%", padding: 16, background: C.navy, color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>建檔送出</button>
      {toast && (
        <div style={{ position: "fixed", left: 16, right: 16, bottom: 84, maxWidth: 528, margin: "0 auto", background: toast.includes("請") ? C.red : C.green, color: "#fff", padding: "12px 16px", borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.18)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ===== 統計頁 =====
const MONTHS = ["01","02","03","04","05","06","07","08","09","10","11","12"];

function Stats({ orders }) {
  const [yearSel, setYearSel] = useState("");
  const [monthSel, setMonthSel] = useState("");
  const availYears = useMemo(() => [...new Set(orders.map((o) => o.date.slice(0, 4)))].sort().reverse(), [orders]);
  const filtered = useMemo(() => {
    if (!yearSel) return orders;
    return orders.filter((o) => {
      if (!o.date.startsWith(yearSel)) return false;
      if (monthSel && !o.date.startsWith(`${yearSel}-${monthSel}`)) return false;
      return true;
    });
  }, [orders, yearSel, monthSel]);
  const periodLabel = yearSel ? (monthSel ? `${yearSel} 年 ${Number(monthSel)} 月` : `${yearSel} 年`) : "全部";
  const agg = useMemo(() => {
    let income = 0, pay = 0, mat = 0, elec = 0, prof = 0;
    const byMonth = {}, byYear = {}, byMaster = {}, byPlatform = {}, byStatus = {};
    STATUSES.forEach((s) => { byStatus[s.key] = 0; });
    filtered.forEach((o) => {
      const inc = sumFee(o), pf = profit(o), m = sumItemMat(o);
      income += inc; pay += o.masterPay; mat += m; elec += o.elec; prof += pf;
      const ym = o.date.slice(0, 7), yy = o.date.slice(0, 4);
      byMonth[ym] = (byMonth[ym] || 0) + pf;
      byYear[yy]  = (byYear[yy]  || 0) + pf;
      byMaster[o.master]     = (byMaster[o.master]     || 0) + o.masterPay;
      byPlatform[o.platform] = (byPlatform[o.platform] || 0) + inc;
      byStatus[o.status || "待處理"] = (byStatus[o.status || "待處理"] || 0) + 1;
    });
    return { income, pay, mat, elec, prof, byMonth, byYear, byMaster, byPlatform, byStatus };
  }, [filtered]);

  return (
    <div>
      <SectionTitle>統計總覽</SectionTitle>
      <Card>
        <Label style={{ marginBottom: 8 }}>篩選期間</Label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={yearSel} onChange={(e) => { setYearSel(e.target.value); setMonthSel(""); }} style={{ ...inp, flex: 1 }}>
            <option value="">全部年份</option>
            {availYears.map((y) => <option key={y} value={y}>{y} 年</option>)}
          </select>
          <select value={monthSel} onChange={(e) => setMonthSel(e.target.value)} disabled={!yearSel} style={{ ...inp, flex: 1, opacity: yearSel ? 1 : 0.4 }}>
            <option value="">全年</option>
            {MONTHS.map((m) => <option key={m} value={m}>{Number(m)} 月</option>)}
          </select>
          {(yearSel || monthSel) && (
            <button onClick={() => { setYearSel(""); setMonthSel(""); }} style={{ ...iconBtn, flexShrink: 0 }}><X size={15} color={C.sub} /></button>
          )}
        </div>
        {(yearSel || monthSel) && (
          <div style={{ marginTop: 8, fontSize: 12, color: C.blue, fontWeight: 600 }}>目前顯示：{periodLabel}（{filtered.length} 筆訂單）</div>
        )}
      </Card>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {STATUSES.map(({ key, color, bg }) => (
          <div key={key} style={{ flex: 1, background: bg, borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{agg.byStatus[key] || 0}</div>
            <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 2 }}>{key}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <Stat big label="總收入" value={NT(agg.income)} color={C.navy} />
        <Stat big label="我的總毛利" value={NT(agg.prof)} color={agg.prof < 0 ? C.red : C.green} />
        <Stat label="師傅工資合計" value={NT(agg.pay)} />
        <Stat label="材料費合計" value={NT(agg.mat)} />
        <Stat label="電費合計" value={NT(agg.elec)} />
        <Stat label="訂單數" value={filtered.length + " 筆"} />
      </div>
      {!yearSel && (
        <>
          <Card><Label>每月毛利</Label>{Object.entries(agg.byMonth).sort().reverse().map(([k, v]) => <Row key={k} label={k} value={NT(v)} color={v < 0 ? C.red : C.green} />)}</Card>
          <Card><Label>每年毛利</Label>{Object.entries(agg.byYear).sort().reverse().map(([k, v]) => <Row key={k} label={k} value={NT(v)} color={v < 0 ? C.red : C.green} />)}</Card>
        </>
      )}
      {yearSel && !monthSel && (
        <Card><Label>{yearSel} 年各月毛利</Label>{Object.entries(agg.byMonth).sort().map(([k, v]) => <Row key={k} label={`${Number(k.slice(5))} 月`} value={NT(v)} color={v < 0 ? C.red : C.green} />)}</Card>
      )}
      <Card><Label>各師傅工資</Label>{Object.entries(agg.byMaster).sort().map(([k, v]) => <Row key={k} label={k} value={NT(v)} bold />)}</Card>
      <Card><Label>各平台收入</Label>{Object.entries(agg.byPlatform).sort((a, b) => b[1] - a[1]).map(([k, v]) => <Row key={k} label={k} value={NT(v)} />)}</Card>
    </div>
  );
}

// ===== 查歷史頁 =====
const DIM_DEFS = [
  { key: "name", label: "人名" },
  { key: "id",   label: "帳號" },
  { key: "item", label: "修改項目" },
];

function Query({ customers, orders, updateOrder, deleteOrder, changeStatus, masters, setMasters, platforms, setPlatforms, types, setTypes }) {
  const [dims, setDims] = useState({ name: false, id: false, item: false });
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [yearSel, setYearSel] = useState("");
  const [monthSel, setMonthSel] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [openId, setOpenId] = useState(null);
  const toggleDim = (key) => setDims((d) => ({ ...d, [key]: !d[key] }));
  const availYears = useMemo(() => [...new Set(orders.map((o) => o.date.slice(0, 4)))].sort().reverse(), [orders]);
  const effFrom = yearSel ? (monthSel ? `${yearSel}-${monthSel}-01` : `${yearSel}-01-01`) : dateFrom;
  const effTo   = yearSel
    ? (monthSel ? `${yearSel}-${monthSel}-${String(new Date(Number(yearSel), Number(monthSel), 0).getDate()).padStart(2, "0")}` : `${yearSel}-12-31`)
    : dateTo;
  const handleYearChange  = (y) => { setYearSel(y); setMonthSel(""); setDateFrom(""); setDateTo(""); };
  const handleMonthChange = (m) => { setMonthSel(m); setDateFrom(""); setDateTo(""); };
  const clearPeriod = () => { setYearSel(""); setMonthSel(""); setDateFrom(""); setDateTo(""); };
  const suggestions = useMemo(() => {
    const set = new Set();
    if (dims.name) customers.forEach((c) => c.name && set.add(c.name));
    if (dims.id)   customers.forEach((c) => c.id   && set.add(c.id));
    if (dims.item) orders.forEach((o) => o.items.forEach((i) => i.name && set.add(i.name)));
    return [...set].sort();
  }, [dims, customers, orders]);
  const anyDim    = dims.name || dims.id || dims.item;
  const hasPeriod = effFrom || effTo;
  const hasFilter = q.trim() || hasPeriod || statusFilter;
  const results = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter && (o.status || "待處理") !== statusFilter) return false;
      if (effFrom && o.date < effFrom) return false;
      if (effTo   && o.date > effTo)   return false;
      if (!kw) return !!(hasPeriod || statusFilter);
      const cust = customers.find((c) => c.id === o.cust);
      if (dims.name && cust && cust.name.toLowerCase().includes(kw)) return true;
      if (dims.id   && cust && cust.id.toLowerCase().includes(kw))   return true;
      if (dims.item && o.items.some((i) => i.name.toLowerCase().includes(kw))) return true;
      if (!anyDim) {
        if (cust && cust.name.toLowerCase().includes(kw)) return true;
        if (cust && cust.id.toLowerCase().includes(kw))   return true;
        if (o.items.some((i) => i.name.toLowerCase().includes(kw))) return true;
      }
      return false;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [q, statusFilter, effFrom, effTo, hasPeriod, dims, anyDim, orders, customers]);

  const handleDelete = (id) => { deleteOrder(id); setOpenId(null); };

  const openOrder = openId ? orders.find((o) => o.id === openId) : null;
  const openCust  = openOrder ? customers.find((c) => c.id === openOrder.cust) : null;
  if (openOrder) return (
    <OrderDetail
      order={openOrder} cust={openCust}
      onBack={() => setOpenId(null)}
      onChangeStatus={(s) => changeStatus(openOrder.id, s)}
      onUpdateOrder={updateOrder}
      onDeleteOrder={handleDelete}
      lists={{ masters, setMasters, platforms, setPlatforms, types, setTypes }}
      orders={orders}
    />
  );

  return (
    <div>
      <SectionTitle>查歷史訂單</SectionTitle>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => setStatusFilter("")} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${!statusFilter ? C.navy : C.line}`, background: !statusFilter ? C.navy : "#fff", color: !statusFilter ? "#fff" : C.sub }}>全部</button>
        {STATUSES.map(({ key, color, bg }) => (
          <button key={key} onClick={() => setStatusFilter(statusFilter === key ? "" : key)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${statusFilter === key ? color : C.line}`, background: statusFilter === key ? bg : "#fff", color: statusFilter === key ? color : C.sub }}>{key}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {DIM_DEFS.map(({ key, label }) => (
          <button key={key} onClick={() => toggleDim(key)} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${dims[key] ? C.blue : C.line}`, background: dims[key] ? C.blue : "#fff", color: dims[key] ? "#fff" : C.sub, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{dims[key] ? "✓ " : ""}{label}</button>
        ))}
      </div>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={18} color={C.sub} style={{ position: "absolute", left: 12, top: 14, pointerEvents: "none" }} />
        <input list="query-suggestions" placeholder={anyDim ? `搜尋 ${DIM_DEFS.filter((d) => dims[d.key]).map((d) => d.label).join("／")}，或直接輸入` : "搜人名、帳號或修改項目"}
          value={q} onChange={(e) => setQ(e.target.value)} style={{ ...inp, paddingLeft: 38, paddingRight: q ? 38 : 12 }} />
        <datalist id="query-suggestions">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
        {q && <button onClick={() => setQ("")} style={{ position: "absolute", right: 10, top: 10, background: "none", border: "none", cursor: "pointer", padding: 4 }}><X size={16} color={C.sub} /></button>}
      </div>
      <div style={{ marginBottom: 10 }}>
        <Label style={{ marginBottom: 6 }}>年月快選</Label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={yearSel} onChange={(e) => handleYearChange(e.target.value)} style={{ ...inp, flex: 1 }}>
            <option value="">年份</option>
            {availYears.map((y) => <option key={y} value={y}>{y} 年</option>)}
          </select>
          <select value={monthSel} onChange={(e) => handleMonthChange(e.target.value)} disabled={!yearSel} style={{ ...inp, flex: 1, opacity: yearSel ? 1 : 0.45 }}>
            <option value="">全年</option>
            {MONTHS.map((m) => <option key={m} value={m}>{Number(m)} 月</option>)}
          </select>
          {(yearSel || monthSel) && <button onClick={clearPeriod} style={{ ...iconBtn, width: 36, height: 36, flexShrink: 0 }}><X size={15} color={C.sub} /></button>}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <Label style={{ marginBottom: 6 }}>自訂日期範圍</Label>
        <div style={{ display: "flex", gap: 8, alignItems: "center", opacity: yearSel ? 0.4 : 1, pointerEvents: yearSel ? "none" : "auto" }}>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setYearSel(""); setMonthSel(""); }} style={{ ...inp, flex: 1 }} />
          <span style={{ color: C.sub, fontSize: 13, flexShrink: 0 }}>～</span>
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setYearSel(""); setMonthSel(""); }} style={{ ...inp, flex: 1 }} />
          {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{ ...iconBtn, width: 36, height: 36, flexShrink: 0 }}><X size={15} color={C.sub} /></button>}
        </div>
      </div>
      {!hasFilter && <Empty icon={Users} text={"選狀態、維度搜尋，或直接選年份／月份瀏覽"} />}
      {hasFilter && results.length === 0 && <Empty icon={X} text="查無符合條件的訂單" />}
      {hasFilter && results.length > 0 && (
        <>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 10 }}>找到 {results.length} 筆</div>
          {results.map((o) => {
            const cust = customers.find((c) => c.id === o.cust);
            const kw = q.trim().toLowerCase();
            const hitItems = (kw && (dims.item || !anyDim)) ? o.items.filter((i) => i.name.toLowerCase().includes(kw)) : [];
            const otherCount = o.items.length - hitItems.length;
            const sm = statusMeta(o.status || "待處理");
            return (
              <button key={o.id} onClick={() => setOpenId(o.id)}
                style={{ width: "100%", textAlign: "left", background: "#fff", borderRadius: 12, padding: 16, border: `1px solid ${C.line}`, marginBottom: 12, cursor: "pointer", display: "block" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{o.date}</span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: sm.color, background: sm.bg, padding: "2px 9px", borderRadius: 20, fontWeight: 700 }}>{o.status || "待處理"}</span>
                    <span style={{ fontSize: 12, color: "#fff", background: o.type === "訂做" ? C.gold : C.blue, padding: "2px 10px", borderRadius: 20 }}>{o.type} · {o.master}</span>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: C.sub, marginBottom: 8 }}>{cust?.name}（{o.cust}）</div>
                {hitItems.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
                    {hitItems.map((i, idx) => <span key={idx} style={{ background: "#FEF3C7", color: "#92400E", padding: "3px 10px", borderRadius: 6, fontSize: 13, fontWeight: 600 }}>{i.name}</span>)}
                    {otherCount > 0 && <span style={{ fontSize: 13, color: C.sub, alignSelf: "center" }}>＋{otherCount} 項</span>}
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: "#334155" }}>{o.items.map((i) => i.name).join("、")}</div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${C.line}` }}>
                  <span style={{ fontSize: 13, color: C.sub }}>{o.items.length} 項 · 本單收入 {NT(sumFee(o))}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 2, color: C.blue, fontSize: 13, fontWeight: 600 }}>看明細 <ChevronRight size={16} /></span>
                </div>
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}

// ===== 訂單詳細（含編輯 / 刪除）=====
function OrderDetail({ order, cust, onBack, onChangeStatus, onUpdateOrder, onDeleteOrder, lists, orders }) {
  const { masters, setMasters, platforms, setPlatforms, types, setTypes } = lists;
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [ed, setEd] = useState(null);
  const [edMasterPayOverride, setEdMasterPayOverride] = useState(false);
  const [edMasterPayManual, setEdMasterPayManual] = useState("");

  const histItemNames = useMemo(() => [...new Set(orders.flatMap((o) => o.items.map((i) => i.name)).filter(Boolean))].sort(), [orders]);
  const histBrands    = useMemo(() => [...new Set(orders.flatMap((o) => o.items.map((i) => i.brand || "")).filter(Boolean))].sort(), [orders]);
  const histMethods   = useMemo(() => [...new Set(orders.flatMap((o) => o.items.map((i) => i.method)).filter(Boolean))].sort(), [orders]);
  const histSizes     = useMemo(() => [...new Set(orders.flatMap((o) => o.items.map((i) => i.size)).filter(Boolean))].sort(), [orders]);

  const startEdit = () => {
    const autoSum = sumItemPay(order);
    const isAuto  = Number(order.masterPay) === autoSum;
    setEdMasterPayOverride(!isAuto);
    setEdMasterPayManual(String(order.masterPay));
    setEd({ ...order, items: order.items.map((it) => ({ name: it.name || "", brand: it.brand || "", method: it.method || "", size: it.size || "", fee: it.fee ?? "", itemPay: it.itemPay ?? "", itemMat: it.itemMat ?? "", note: it.note || "" })) });
    setIsEditing(true);
  };
  const cancelEdit = () => { setIsEditing(false); setEd(null); };

  // ── 編輯模式 ──
  if (isEditing && ed) {
    const edItemPaySum = ed.items.reduce((s, i) => s + (Number(i.itemPay) || 0), 0);
    const edEffPay     = edMasterPayOverride ? (Number(edMasterPayManual) || 0) : edItemPaySum;
    const edTotal      = ed.items.reduce((s, i) => s + (Number(i.fee) || 0), 0);
    const edMat        = ed.items.reduce((s, i) => s + (Number(i.itemMat) || 0), 0);
    const edProfit     = edTotal - edEffPay - edMat - (Number(ed.elec) || 0);
    const setEdItems   = (fn) => setEd((prev) => ({ ...prev, items: typeof fn === "function" ? fn(prev.items) : fn }));
    const saveEdit = () => {
      onUpdateOrder({
        ...ed, masterPay: edEffPay, elec: Number(ed.elec) || 0,
        items: ed.items.filter((i) => i.name.trim()).map((i) => ({
          name: i.name, brand: i.brand || "", method: i.method || "", size: i.size || "",
          fee: Number(i.fee) || 0, itemPay: Number(i.itemPay) || 0, itemMat: Number(i.itemMat) || 0, note: i.note || "",
        })),
      });
      setIsEditing(false); setEd(null);
    };
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <button onClick={cancelEdit} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: C.sub, fontSize: 15, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            <ArrowLeft size={18} /> 取消
          </button>
          <button onClick={saveEdit} style={{ padding: "9px 22px", background: C.green, color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            儲存變更
          </button>
        </div>
        <Card>
          <Label>日期</Label>
          <input type="date" value={ed.date} onChange={(e) => setEd({ ...ed, date: e.target.value })} style={inp} />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <Label>類型</Label>
              <DynSelect value={ed.type} onChange={(v) => setEd({ ...ed, type: v })} list={types} setList={setTypes} addLabel="類型" orders={orders} freqKey="type" />
            </div>
            <div style={{ flex: 1 }}>
              <Label>師傅</Label>
              <DynSelect value={ed.master} onChange={(v) => setEd({ ...ed, master: v })} list={masters} setList={setMasters} addLabel="師傅" orders={orders} freqKey="master" />
            </div>
          </div>
          <Label style={{ marginTop: 12 }}>來源平台</Label>
          <DynSelect value={ed.platform} onChange={(v) => setEd({ ...ed, platform: v })} list={platforms} setList={setPlatforms} addLabel="來源平台" orders={orders} freqKey="platform" />
        </Card>
        <SectionTitle>修改項目</SectionTitle>
        <ItemFields items={ed.items} setItems={setEdItems} histItemNames={histItemNames} histBrands={histBrands} histMethods={histMethods} histSizes={histSizes} />
        <Card>
          <Hint style={{ marginTop: 0, marginBottom: 10 }}>各項師傅工資加總：{NT(edItemPaySum)}（自動帶入下方整單工資，可手動調整）</Hint>
          <div style={{ display: "flex", gap: 10 }}>
            <MasterPayField autoSum={edItemPaySum} override={edMasterPayOverride} setOverride={setEdMasterPayOverride} manual={edMasterPayManual} setManual={setEdMasterPayManual} />
            <div style={{ flex: 1 }}>
              <Label>電費</Label>
              <input inputMode="numeric" placeholder="0" value={ed.elec} onChange={(e) => setEd({ ...ed, elec: e.target.value })} style={inp} />
            </div>
          </div>
          <Label style={{ marginTop: 14 }}>整單備註</Label>
          <input placeholder="取件日 / 其他" value={ed.note} onChange={(e) => setEd({ ...ed, note: e.target.value })} style={inp} />
        </Card>
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: `1px solid ${C.line}`, marginBottom: 12 }}>
          <Row label="本單收入" value={NT(edTotal)} bold />
          <Row label="項目材料費合計" value={NT(edMat)} />
          <Row label="預估毛利" value={NT(edProfit)} color={edProfit < 0 ? C.red : C.green} bold />
        </div>
      </div>
    );
  }

  // ── 檢視模式 ──
  const o = order;
  const currentStatus = o.status || "待處理";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: C.blue, fontSize: 15, fontWeight: 600, cursor: "pointer", padding: 0 }}>
          <ArrowLeft size={18} /> 返回
        </button>
        {confirmDelete ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>確定刪除？</span>
            <button onClick={() => onDeleteOrder(o.id)} style={{ padding: "6px 14px", background: C.red, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>刪除</button>
            <button onClick={() => setConfirmDelete(false)} style={{ padding: "6px 14px", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, cursor: "pointer" }}>取消</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={startEdit} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#fff", border: `1.5px solid ${C.blue}`, borderRadius: 9, color: C.blue, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              <Edit2 size={14} /> 編輯
            </button>
            <button onClick={() => setConfirmDelete(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#fff", border: `1.5px solid ${C.line}`, borderRadius: 9, color: C.sub, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              <Trash2 size={14} /> 刪除
            </button>
          </div>
        )}
      </div>

      <div style={{ background: C.navy, color: "#fff", borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{o.date}</div>
          <span style={{ fontSize: 12, background: o.type === "訂做" ? C.gold : C.blue, padding: "3px 12px", borderRadius: 20 }}>{o.type}</span>
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>{cust?.name}（{o.cust}）· {o.platform} · {o.master}</div>
        {o.note && <div style={{ fontSize: 13, marginTop: 8, padding: "6px 10px", background: "rgba(255,255,255,0.12)", borderRadius: 8 }}>整單備註：{o.note}</div>}
      </div>

      <Card>
        <Label style={{ marginBottom: 10 }}>訂單狀態</Label>
        <div style={{ display: "flex", gap: 6 }}>
          {STATUSES.map(({ key, color, bg }, idx) => {
            const active = currentStatus === key;
            return (
              <button key={key} onClick={() => onChangeStatus(key)}
                style={{ flex: 1, padding: "10px 4px", borderRadius: 10, cursor: "pointer", textAlign: "center", border: `2px solid ${active ? color : C.line}`, background: active ? bg : "#fff" }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{idx === 0 ? "📋" : idx === 1 ? "✅" : "📦"}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: active ? color : C.sub, lineHeight: 1.3 }}>{key}</div>
              </button>
            );
          })}
        </div>
      </Card>

      <SectionTitle>修改項目明細</SectionTitle>
      {o.items.map((it, i) => (
        <Card key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{it.name}</span>
            <span style={{ fontWeight: 700, color: C.navy }}>{NT(it.fee)}</span>
          </div>
          {it.brand  && <DetailRow k="品牌 / 種類" v={it.brand} />}
          {it.method && <DetailRow k="改法/規格"   v={it.method} />}
          {it.size   && <DetailRow k="尺寸"        v={it.size} />}
          <DetailRow k="此項師傅工資" v={NT(it.itemPay)} />
          <DetailRow k="此項材料費"   v={NT(it.itemMat)} />
          {it.note   && <DetailRow k="備註" v={it.note} />}
        </Card>
      ))}
      <Card>
        <Label>整單結算</Label>
        <Row label="客人收費報價合計" value={NT(sumFee(o))} bold />
        <Row label="師傅工資（整單實付）" value={NT(o.masterPay)} />
        <Row label="各項師傅工資加總（參考）" value={NT(sumItemPay(o))} />
        <Row label="材料費合計" value={NT(sumItemMat(o))} />
        <Row label="電費" value={NT(o.elec)} />
        <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 6, paddingTop: 6 }}>
          <Row label="我的毛利" value={NT(profit(o))} color={profit(o) < 0 ? C.red : C.green} bold />
        </div>
      </Card>
    </div>
  );
}

// ===== 樣式常數 =====
const inp     = { width: "100%", padding: "11px 12px", borderRadius: 9, border: `1px solid #E2E8F0`, fontSize: 15, boxSizing: "border-box", background: "#fff", color: "#0F172A", outline: "none" };
const iconBtn = { width: 42, height: 42, border: `1px solid #E2E8F0`, background: "#fff", borderRadius: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const addBtn  = { display: "flex", alignItems: "center", gap: 6, padding: "11px 14px", border: `1.5px dashed ${C.blue}`, background: "#fff", color: C.blue, borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer" };

// ===== 原子元件 =====
function Card({ children })                  { return <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: `1px solid ${C.line}`, marginBottom: 12 }}>{children}</div>; }
function SectionTitle({ children })          { return <h2 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: "4px 0 14px" }}>{children}</h2>; }
function Label({ children, style })          { return <div style={{ fontSize: 13, fontWeight: 600, color: C.sub, marginBottom: 6, ...style }}>{children}</div>; }
function MiniLabel({ children })             { return <div style={{ fontSize: 11, color: C.sub, marginBottom: 4 }}>{children}</div>; }
function Hint({ children, style })           { return <div style={{ fontSize: 12, color: C.sub, marginTop: 6, ...style }}>{children}</div>; }
function Toggle({ active, onClick, children }) { return <button onClick={onClick} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: `1.5px solid ${active ? C.blue : C.line}`, background: active ? C.blue : "#fff", color: active ? "#fff" : C.sub, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{children}</button>; }
function Row({ label, value, color, bold })  { return <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 14 }}><span style={{ color: C.sub }}>{label}</span><span style={{ color: color || C.ink, fontWeight: bold ? 700 : 500 }}>{value}</span></div>; }
function DetailRow({ k, v })                 { return <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 14 }}><span style={{ color: C.sub }}>{k}</span><span style={{ color: C.ink, maxWidth: "65%", textAlign: "right" }}>{v}</span></div>; }
function Stat({ label, value, color, big })  { return <div style={{ background: "#fff", borderRadius: 12, padding: 14, border: `1px solid ${C.line}` }}><div style={{ fontSize: 12, color: C.sub, marginBottom: 4 }}>{label}</div><div style={{ fontSize: big ? 22 : 18, fontWeight: 700, color: color || C.ink }}>{value}</div></div>; }
function Empty({ icon: Icon, text })         { return <div style={{ textAlign: "center", padding: "48px 20px", color: C.sub }}><Icon size={40} strokeWidth={1.4} style={{ opacity: 0.4 }} /><div style={{ marginTop: 12, fontSize: 14, whiteSpace: "pre-line" }}>{text}</div></div>; }
