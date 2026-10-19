"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function GalleryLayoutSelect({ id, initial }: { id: string; initial: string }) {
  const [layout, setLayout] = useState(initial === "landscape" ? "landscape" : "portrait");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return <label style={{display:"grid",gap:5,marginTop:12,fontSize:12,color:"#bbb"}}>
    Görsel yönü
    <select value={layout} disabled={saving} onChange={async e => {
      const next=e.target.value as "portrait" | "landscape";
      setLayout(next);setSaving(true);setError("");
      try {
        const response=await fetch(`/api/admin/gallery/${id}`, {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageLayout:next})});
        if(!response.ok){const result=await response.json();throw new Error(result.error||"Kaydedilemedi");}
        router.refresh();
      }catch(err){setLayout(layout);setError(err instanceof Error?err.message:"Hata oluştu");}
      finally{setSaving(false);}
    }} style={{background:"#171717",color:"white",padding:9,border:"1px solid #444",borderRadius:8}}>
      <option value="portrait">Dikey 3:4</option><option value="landscape">Yatay 16:9</option>
    </select>
    {error && <small role="alert" style={{color:"#ff9b9b"}}>{error}</small>}
  </label>;
}
