"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/utils/supabase/client";
import css from "./GroupChatClient.module.css";
import { ChatExpressionPicker, ChatMessageBody, messagePreview } from "./ChatExpressionKit";
import { ChatReplyQuote, createChatReply, focusQuotedMessage, parseChatReply, type ChatReplyTarget } from "./ChatReplyKit";
import ChatMessageGesture from "./ChatMessageGesture";
import ChatPinnedNotice, { type PinnedMessage } from "./ChatPinnedNotice";
import { useChatKeyboardBottomAnchor } from "./useChatKeyboardBottomAnchor";

type Group = { group_id: string; title: string; owner_id: string; member_count: number; last_message: string | null; last_at: string | null; unread_count: number };
type ChatMessage = { id: string; sender_id: string; author_name: string; body: string; created_at: string; pending?: boolean; failed?: boolean; optimistic?: boolean };
type Friend = { user_id: string; display_name: string; avatar_url: string | null };

const time = (date: string) => new Date(date).toLocaleString("tr-TR", {day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});

// In-memory cache keeps previously opened groups visible instantly on return.
const recentGroupHistory = new Map<string, ChatMessage[]>();

export default function GroupChatClient({ userId, onBack, compact = false }: {userId: string; onBack: () => void; compact?: boolean}) {
  const [db] = useState(() => createClient());
  const [groups,setGroups] = useState<Group[]>([]);
  const [active,setActive] = useState<string | null>(null);
  const [messages,setMessages] = useState<ChatMessage[]>([]);
  const groupHistoryCache = useRef<Map<string,ChatMessage[]>>(new Map());
  const groupHistoryVersion = useRef(0);
  const [groupHistoryLoading,setGroupHistoryLoading] = useState(false);
  const [groupHistoryLoadedFor,setGroupHistoryLoadedFor] = useState<string|null>(null);
  const [groupHistoryError,setGroupHistoryError] = useState("");
  const retryEmptyGroup = useRef<Set<string>>(new Set());
  const [friends,setFriends] = useState<Friend[]>([]);
  const [creating,setCreating] = useState(false);
  const [title,setTitle] = useState("");
  const [chosen,setChosen] = useState<string[]>([]);
  const [draft,setDraft] = useState("");
  const [replyTarget,setReplyTarget] = useState<ChatReplyTarget | null>(null);
  const [pinned,setPinned] = useState<PinnedMessage|null>(null);
  const [pinBusy,setPinBusy] = useState(false);
  const draftInputRef = useRef<HTMLInputElement>(null);
  const [expressionsOpen,setExpressionsOpen] = useState(false);
  const groupCounts = useRef("");
  const groupUnread = useRef<Map<string, number>>(new Map());
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const latest = useRef<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const current = groups.find(group => group.group_id === active);
  useEffect(()=>{
    latest.current=active;
    groupHistoryVersion.current++;
    setExpressionsOpen(false);
    setReplyTarget(null);
    setGroupHistoryError("");
    const cached=active?(groupHistoryCache.current.get(active)??recentGroupHistory.get(`${userId}:${active}`)):undefined;
    if(active && cached)groupHistoryCache.current.set(active,cached);
    setMessages(cached??[]);
    setGroupHistoryLoadedFor(active&&cached?active:null);
    setGroupHistoryLoading(Boolean(active&&!cached));
  },[active]);
  useEffect(()=>{
    if(!active){setPinned(null);return;}
    const groupId=active;
    let cancelled=false;
    setPinned(null);
    const read=async()=>{
      const {data,error}=await db.rpc("dm_pin_get_group",{p_group:groupId});
      if(!cancelled&&!error)setPinned(((data||[])[0] as PinnedMessage|undefined)||null);
    };
    void read();
    const onFocus=()=>{if(!document.hidden)void read();};
    window.addEventListener("focus",onFocus);
    return()=>{cancelled=true;window.removeEventListener("focus",onFocus);};
  },[active,db]);
  async function togglePin(msg:ChatMessage|null){
    const groupId=active;
    if(!groupId||pinBusy)return;
    const next=msg&&pinned?.message_id!==msg.id?msg.id:null;
    if(next&&!/^[\da-f-]{36}$/i.test(next))return;
    setPinBusy(true);
    const {error:writeError}=await db.rpc("dm_pin_set_group",{p_group:groupId,p_message:next});
    if(writeError){setError("Sabitleme baÅŸarÄ±sÄ±z. DM_PIN_V13.sql dosyasÄ±nÄ± Ã§alÄ±ÅŸtÄ±r: "+writeError.message);}
    else if(latest.current===groupId){
      const {data}=await db.rpc("dm_pin_get_group",{p_group:groupId});
      setPinned(((data||[])[0] as PinnedMessage|undefined)||null);
    }
    setPinBusy(false);
  }
  function copyMessage(body:string){
    if(!navigator.clipboard?.writeText){setError("Kopyalama HTTPS veya localhost gerektirir.");return;}
    void navigator.clipboard.writeText(parseChatReply(body).text).catch(()=>setError("KopyalanamadÄ±."));
  }
  function quoteMessage(msg:ChatMessage) {
    setReplyTarget({id:msg.id,author:msg.sender_id===userId?"Sen":msg.author_name,preview:messagePreview(parseChatReply(msg.body).text).slice(0,65)});
    draftInputRef.current?.focus();
  }

  const refresh = useCallback(async () => {
    const {data,error:readError} = await db.rpc("dm_group_list");
    if (readError) {setError("Grup sohbeti iÃ§in DM_GROUPS_V7.sql kurulumu gerekli: " + readError.message);return;}
    const nextGroups = (data||[]) as Group[];
    setGroups(nextGroups);
    groupUnread.current = new Map(nextGroups.map(group => [group.group_id, Number(group.unread_count || 0)]));
    const nextCounts = nextGroups.map(group => `${group.group_id}:${group.unread_count}`).join("|");
    if (nextCounts !== groupCounts.current) {
      groupCounts.current = nextCounts;
      window.dispatchEvent(new Event("f1-dm-groups-updated"));
    }
  },[db]);

  const loadMessages = useCallback(async (groupId:string) => {
    const version=++groupHistoryVersion.current;
    const {data,error:readError}=await db.rpc("dm_group_get_messages",{p_group:groupId,p_limit:80});
    if(latest.current!==groupId || version!==groupHistoryVersion.current)return;
    if(readError){setGroupHistoryError(readError.message);setGroupHistoryLoading(false);setError(readError.message);return;}
    const fetched=(data||[]) as ChatMessage[];
    const known=groupHistoryCache.current.get(groupId)||recentGroupHistory.get(`${userId}:${groupId}`)||[];
    if(!fetched.length && known.length && !retryEmptyGroup.current.has(groupId)){
      retryEmptyGroup.current.add(groupId);
      window.setTimeout(()=>{
        if(latest.current===groupId&&!document.hidden)void loadMessages(groupId);
      },700);
      setGroupHistoryLoading(false);
      setGroupHistoryLoadedFor(groupId);
      return;
    }
    retryEmptyGroup.current.delete(groupId);
    groupHistoryCache.current.set(groupId,fetched);
    recentGroupHistory.delete(`${userId}:${groupId}`);
    recentGroupHistory.set(`${userId}:${groupId}`,fetched.slice(-80));
    while(recentGroupHistory.size>12){
      const oldest=recentGroupHistory.keys().next().value;
      if(oldest===undefined)break;
      recentGroupHistory.delete(oldest);
    }
    setMessages(previous=>{
      const ids=new Set(fetched.map(m=>m.id));
      const local=previous.filter(m=>{
        if(!(m.pending||m.failed||m.optimistic)||ids.has(m.id))return false;
        // Group send RPC returns no message id; match a newly confirmed copy
        // before removing its optimistic placeholder, avoiding duplicates.
        if(m.optimistic&&!m.failed&&fetched.some(row=>
          row.sender_id===m.sender_id&&row.body===m.body&&
          new Date(row.created_at).getTime()>=new Date(m.created_at).getTime()-3000&&
          new Date(row.created_at).getTime()<=new Date(m.created_at).getTime()+60000))return false;
        return true;
      });
      return [...fetched,...local];
    });
    setGroupHistoryLoadedFor(groupId);
    setGroupHistoryLoading(false);
    setGroupHistoryError("");
    if((groupUnread.current.get(groupId)||0)>0){
      groupUnread.current.set(groupId,0);
      const {error:readError2}=await db.rpc("dm_group_mark_read",{p_group:groupId});
      if(!readError2)void refresh();
    }
  },[db,refresh]);

  useEffect(()=>{
    void refresh();
    const onFocus=()=>{void refresh();if(latest.current)void loadMessages(latest.current);};
    const interval=window.setInterval(()=>{if(!document.hidden)onFocus();},20000);
    window.addEventListener("focus",onFocus);
    return ()=>{window.clearInterval(interval);window.removeEventListener("focus",onFocus);};
  },[refresh,loadMessages]);
  useEffect(()=>{if(active)void loadMessages(active);},[active,loadMessages]);
  useEffect(()=>{const list=bottom.current?.parentElement;if(list)list.scrollTop=list.scrollHeight;},[messages.length,active]);
  // Same iOS keyboard/bottom-message behavior as one-to-one DMs.
  useChatKeyboardBottomAnchor(bottom, draftInputRef, Boolean(active));

  const startCreate = async () => {
    setCreating(true);setError("");setChosen([]);setTitle("");
    const {data,error:readError} = await db.rpc("dm_list_friends");
    if(readError){setError(readError.message);return;}
    setFriends((data||[]) as Friend[]);
  };
  async function createGroup(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return;
    if(chosen.length<2){setError("Grup oluÅŸturmak iÃ§in en az iki arkadaÅŸÄ±nÄ± seÃ§.");return;}
    setBusy(true);setError("");
    try {
      const {data,error:writeError}=await db.rpc("dm_group_create",{p_title:title.trim(),p_members:chosen});
      if(writeError)throw writeError;
      setCreating(false);setActive(data as string);latest.current=data as string;
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Grup oluÅŸturulamadÄ±.");}
    finally{setBusy(false);}
  }
  async function sendBody(body:string,retryId?:string) {
    const groupId = active;
    if (!groupId || busy || !body.trim()) return;
    const outgoing = retryId ? body : createChatReply(body,replyTarget,1500);
    if(outgoing===null) {setError("AlÄ±ntÄ± dahil mesaj 1500 karakteri aÅŸamaz. Metni kÄ±salt.");return;}
    const tempId = retryId || `local-${crypto.randomUUID()}`;
    setReplyTarget(null);
    setBusy(true);setError("");setExpressionsOpen(false);
    if(retryId) setMessages(previous=>previous.map(m=>m.id===retryId?{...m,pending:true,failed:false}:m));
    else setMessages(previous=>[...previous,{
      id:tempId,sender_id:userId,author_name:"Sen",body:outgoing,created_at:new Date().toISOString(),pending:true,optimistic:true,
    }]);
    const {error:sendError}=await db.rpc("dm_group_send",{p_group:groupId,p_body:outgoing});
    if(sendError){
      setMessages(previous=>previous.map(m=>m.id===tempId?{...m,pending:false,failed:true}:m));
      setError(`Mesaj gÃ¶nderilemedi: ${sendError.message}`);
    }else{
      // Group RPC is void; the confirmed row comes from the next read.
      setMessages(previous=>previous.map(m=>m.id===tempId?{...m,pending:false}:m));
      if(latest.current===groupId) void loadMessages(groupId);
      void refresh();
    }
    setBusy(false);
  }
  function send(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const body=draft.trim();if(!body||busy)return;
    // Keep the keyboard open for the next group message.
    draftInputRef.current?.focus({ preventScroll: true });
    setDraft("");void sendBody(body);
  }
  async function leaveGroup() {
    if(!active||busy||!window.confirm(`â€œ${current?.title||"Grup"}â€ sohbetinden ayrÄ±lmak istiyor musun?`))return;
    setBusy(true);setError("");
    const {error:leaveError}=await db.rpc("dm_group_leave",{p_group:active});
    if(leaveError)setError(leaveError.message);
    else {setActive(null);latest.current=null;setMessages([]);await refresh();}
    setBusy(false);
  }

  return <div className={`${css.root} ${compact ? css.compact : ""}`}>
    {creating ? <>
      <div className={css.toolbar}><button type="button" onClick={()=>{setCreating(false);setError("");}} className={css.back}>â† Gruplar</button><strong>Yeni grup oluÅŸtur</strong></div>
      <form className={css.creation} onSubmit={createGroup}>
        <label className={css.label} htmlFor="f1-group-name">Grup adÄ±</label>
        <input id="f1-group-name" value={title} onChange={e=>setTitle(e.target.value)} minLength={3} maxLength={48} required placeholder="Ã–rneÄŸin: F1 SOCIAL YarÄ±ÅŸ TayfasÄ±"/>
        <div className={css.label}>ArkadaÅŸlarÄ±nÄ± seÃ§ <small>En az 2 kiÅŸi Â· {chosen.length} seÃ§ildi</small></div>
        <div className={css.members}>
          {friends.length<2 && <p className={css.empty}>Grup iÃ§in en az iki onaylanmÄ±ÅŸ arkadaÅŸÄ±n olmalÄ±.</p>}
          {friends.map(friend=><label key={friend.user_id} className={css.member}>
            <input type="checkbox" checked={chosen.includes(friend.user_id)} onChange={e=>setChosen(old=>e.target.checked?[...old,friend.user_id]:old.filter(id=>id!==friend.user_id))} disabled={!chosen.includes(friend.user_id)&&chosen.length>=19}/>
            <span className={css.avatar}>{friend.avatar_url?<img src={friend.avatar_url} alt=""/>:friend.display_name[0]}</span>
            <span>{friend.display_name}</span>
          </label>)}
        </div>
        <button className={css.primary} type="submit" disabled={busy||chosen.length<2||title.trim().length<3}>{busy?"OluÅŸturuluyor...":"Grubu oluÅŸtur"}</button>
      </form>
    </> : active && current ? <>
      <div className={css.toolbar}>
        <button type="button" onClick={()=>{setActive(null);}} className={css.back}>â† Gruplar</button>
        <div className={css.groupIdentity}><strong>{current.title}</strong><small>{current.member_count} Ã¼ye Â· Grup sohbeti</small></div>
        <button type="button" onClick={()=>void leaveGroup()} disabled={busy} className={css.leave}>AyrÄ±l</button>
      </div>
      <ChatPinnedNotice pin={pinned} busy={pinBusy} onJump={id=>{if(!focusQuotedMessage(id))setError("Sabitlenen mesaj mevcut mesaj geÃ§miÅŸinde yok.");}} onRemove={()=>void togglePin(null)}/>
      <div className={css.messages}>
        {messages.length===0&&groupHistoryError&&<div className={css.empty} role="alert">Grup mesajlarÄ± yÃ¼klenemedi. Tekrar deneyebilirsin.</div>}
        {messages.length===0&&!groupHistoryError&&(groupHistoryLoading||groupHistoryLoadedFor!==active)&&
          <div className={css.historyGhost} role="status" aria-label="Grup mesajlarÄ± hazÄ±rlanÄ±yor"><span/><span/><span/></div>}
        {messages.map(msg=><div id={`f1-chat-message-${msg.id}`} key={msg.id} className={`${css.msgRow} ${msg.sender_id===userId?css.mine:""}`}>
          <ChatMessageGesture disabled={Boolean(msg.pending || msg.failed)} pinned={pinned?.message_id===msg.id} pinBusy={pinBusy}
            onReply={()=>quoteMessage(msg)} onPin={()=>void togglePin(msg)} onCopy={()=>copyMessage(msg.body)}>
            <div className={css.bubble}>
            {parseChatReply(msg.body).quote && <ChatReplyQuote quote={parseChatReply(msg.body).quote!} onJump={focusQuotedMessage}/>}
            {msg.sender_id!==userId&&<strong className={css.author}>{msg.author_name}</strong>}
            <ChatMessageBody body={parseChatReply(msg.body).text}/><small>{time(msg.created_at)} {msg.pending ? "Â· GÃ¶nderiliyorâ€¦" : msg.failed ? "Â· GÃ¶nderilemedi" : ""}</small>
            {msg.failed && <button type="button" className={css.retrySend} disabled={busy} onClick={()=>void sendBody(msg.body,msg.id)}>Tekrar dene â†»</button>}
            </div>
          </ChatMessageGesture>
        </div>)}
        <div ref={bottom}/>
      </div>
      {replyTarget && <div className={css.replyDraft}><ChatReplyQuote quote={replyTarget} composing onJump={focusQuotedMessage}/><button type="button" onClick={()=>setReplyTarget(null)} aria-label="YanÄ±tÄ± iptal et">âœ•</button></div>}
      <form className={css.composer} onSubmit={send}>
        <div className={css.expressionAnchor}>
          <button type="button" className={css.expressionButton} aria-expanded={expressionsOpen} aria-label="Emoji ve Ã§Ä±kartmalarÄ± aÃ§" onClick={()=>setExpressionsOpen(value=>!value)}>â˜º</button>
          {expressionsOpen && <ChatExpressionPicker
            onEmoji={emoji=>{setDraft(previous=>(previous+emoji).slice(0,1500));setExpressionsOpen(false);}}
            onSticker={value=>{setExpressionsOpen(false);void sendBody(value);}}
            onClose={()=>setExpressionsOpen(false)}/>}
        </div>
        <input ref={draftInputRef} aria-label="Gruba mesaj yaz" placeholder="Gruba mesaj yaz..." maxLength={1500} onKeyDown={e=>{if(e.key==="Escape")setReplyTarget(null);}} value={draft} onChange={e=>setDraft(e.target.value)}/>
        <button type="submit"
          onPointerDown={event=>{if(document.activeElement===draftInputRef.current)event.preventDefault();}}
          onClick={()=>draftInputRef.current?.focus({preventScroll:true})}
          disabled={busy||!draft.trim()} aria-label="GÃ¶nder">â¤</button>
      </form>
    </> : <>
      <div className={css.toolbar}>
        <button type="button" onClick={onBack} className={css.back}>â† Sohbetler</button>
        <strong>Grup sohbetleri</strong>
        <button type="button" className={css.new} onClick={()=>void startCreate()}>ï¼‹ Yeni grup</button>
      </div>
      <div className={css.groupList}>
        {groups.length===0&&<div className={css.empty}>HenÃ¼z grup sohbetin yok. En az iki arkadaÅŸÄ±nÄ± seÃ§ip ilk grubunu oluÅŸturabilirsin.</div>}
        {groups.map(group=><button key={group.group_id} className={css.groupItem} type="button" onClick={()=>{setActive(group.group_id);latest.current=group.group_id;setError("");}}>
          <span className={css.groupIcon}>â™œ</span><span className={css.groupCopy}><strong>{group.title}</strong><small>{group.last_message?messagePreview(parseChatReply(group.last_message || "").text):`${group.member_count} kiÅŸilik grup`}</small></span>
          {Number(group.unread_count)>0&&<b className={css.badge}>{group.unread_count}</b>}
        </button>)}
      </div>
    </>}
    {error&&<div className={css.error} role="status">{error}</div>}
  </div>;
}
