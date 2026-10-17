"use client";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import {createClient} from "@/utils/supabase/client";
import Header from "@/components/Header";
import styles from "./page.module.css";

type Member={user_id:string;display_name:string;avatar_url:string|null;bio:string|null;favorite_team:string|null;favorite_driver:string|null};
export default function MemberPage(){
  const {id}=useParams<{id:string}>();
  const [supabase]=useState(()=>createClient());
  const [member,setMember]=useState<Member|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{
    let live=true;
    void supabase.rpc("dm_friend_profile",{p_target:id}).then(({data,error})=>{
      if(!live)return;
      if(error||!data?.length)setError("Bu profili görebilmek için kullanıcıyla arkadaş olmalısın.");
      else setMember(data[0] as Member);
    });
    return ()=>{live=false;};
  },[supabase,id]);
  return <><Header/><main className={styles.root}>
    <div className={styles.shell}>
      <Link href="/" className={styles.back}>← Ana sayfaya dön</Link>
      {error?<div className={styles.card}>{error}</div>:!member?<div className={styles.card}>Profil yükleniyor...</div>:
       <section className={styles.card}>
        <div className={styles.cover}><span>F1 MEDİPOL · DRIVER PROFILE</span></div>
        <div className={styles.information}>
          <div className={styles.avatar}>{member.avatar_url?<img src={member.avatar_url} alt=""/>:member.display_name.slice(0,1)}</div>
          <div className={styles.description}><span>GRID ÜYESİ</span><h1>{member.display_name}</h1><p>{member.bio||"Henüz profil açıklaması eklenmemiş."}</p></div>
          <button className={styles.dm} onClick={()=>window.dispatchEvent(new CustomEvent("f1-dm-open",{detail:{userId:member.user_id}}))}>Mesaj gönder ↗</button>
        </div>
        <div className={styles.favorites}><div><small>FAVORİ TAKIM</small><strong>{member.favorite_team||"Henüz seçilmedi"}</strong></div><div><small>FAVORİ PİLOT</small><strong>{member.favorite_driver||"Henüz seçilmedi"}</strong></div></div>
       </section>}
    </div>
  </main></>;
}
