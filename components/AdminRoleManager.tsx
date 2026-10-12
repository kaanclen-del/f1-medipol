"use client";

import { useMemo, useState } from "react";

type Member = {
  id: string;
  username: string | null;
  display_name: string | null;
  is_admin: boolean | null;
};

export default function AdminRoleManager({ initialMembers, ownerId }: {
  initialMembers: Member[];
  ownerId: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const filtered = useMemo(() => members.filter((member) =>
    `${member.display_name ?? ""} ${member.username ?? ""}`.toLocaleLowerCase("tr-TR")
      .includes(query.toLocaleLowerCase("tr-TR"))), [members,query]);

  async function changeRole(member: Member) {
    const next = !member.is_admin;
    if (member.id === ownerId) return;
    const label = member.display_name || member.username || "Bu kullanıcı";
    if (!window.confirm(`${label} için yönetici yetkisi ${next ? "VERİLSİN" : "KALDIRILSIN"} mı?`)) return;
    setBusy(member.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/permissions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin", body: JSON.stringify({ userId:member.id, enabled:next })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Güncelleme başarısız.");
      setMembers((prev) => prev.map((item) => item.id === member.id
        ? {...item,is_admin:Boolean(data.isAdmin)} : item));
      setMessage("Yetki başarıyla güncellendi.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Beklenmeyen hata."); }
    finally { setBusy(null); }
  }

  return <section style={{border:"1px solid #303642",borderRadius:16,marginTop:26,background:"#111720",padding:20}}>
    <div style={{display:"flex",gap:12,justifyContent:"space-between",flexWrap:"wrap",alignItems:"center"}}>
      <strong>{members.length} kayıtlı üye · {members.filter(m=>m.is_admin).length} yönetici</strong>
      <input aria-label="Üye ara" placeholder="Kullanıcı adı veya isim ara" value={query}
        onChange={(e)=>setQuery(e.target.value)} style={{width:"min(100%,340px)",padding:12,borderRadius:9,
          background:"#0c1119",border:"1px solid #485262",color:"white"}} />
    </div>
    <p aria-live="polite" style={{color:"#f0c86d"}}>{message}</p>
    <div style={{display:"grid",gap:9}}>
      {filtered.map((member) => <div key={member.id} style={{display:"flex",justifyContent:"space-between",
        alignItems:"center",gap:15,padding:"13px 14px",background:"#191f2b",borderRadius:11,flexWrap:"wrap"}}>
        <div style={{minWidth:150}}>
          <div style={{fontWeight:800}}>{member.display_name || member.username || "Üye"}</div>
          <div style={{fontSize:12,color:"#aab6c8"}}>@{member.username || "kullanici"}</div>
          <div style={{fontSize:11,color:member.is_admin ? "#71d6ae":"#aab6c8",marginTop:4}}>
            {member.id === ownerId ? "ANA YÖNETİCİ · KORUNUYOR" : member.is_admin ? "YÖNETİCİ" : "ÜYE"}
          </div>
        </div>
        {member.id === ownerId ?
          <span style={{fontSize:12,color:"#f9c16d",fontWeight:800}}>Kilitli · Değiştirilemez</span> :
          <button type="button" onClick={()=>changeRole(member)} disabled={busy !== null}
            style={{border:0,borderRadius:9,padding:"11px 15px",background:member.is_admin?"#40303a":"#e10600",
            color:"white",fontWeight:800,cursor:"pointer",opacity:busy && busy!==member.id ? .6:1}}>
            {busy===member.id ? "İşleniyor..." : member.is_admin ? "Yetkisini Kaldır" : "Yönetici Yap"}
          </button>}
      </div>)}
      {!filtered.length && <p style={{color:"#aab6c8"}}>Aramayla eşleşen üye yok.</p>}
    </div>
  </section>;
}
