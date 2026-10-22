import Link from "next/link";
import { createAdminClient } from "@/utils/supabase/admin";
import styles from "./MemberPublicFriends.module.css";

type FriendshipRow = Record<string, unknown>;
type Person = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  favorite_team: string | null;
};
type PredictionPoints = { user_id: string; points: number | null };
type AchievementPoints = { user_id: string; xp_awarded: number | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BATCH = 75;

function levelFromXp(raw: number) {
  const xp = Math.max(0, raw);
  let level = 1;
  while (level < 1000 && xp >= 50 * (level + 1) * level) level++;
  return level;
}

function getPair(row: FriendshipRow): [string, string] | null {
  const knownPairs: [string, string][] = [
    ["user_a", "user_b"],
    ["user_a_id", "user_b_id"],
    ["user_id_a", "user_id_b"],
    ["user_id_1", "user_id_2"],
    ["user1_id", "user2_id"],
    ["user_one", "user_two"],
    ["requester_id", "addressee_id"],
    ["requester_id", "recipient_id"],
    ["sender_id", "receiver_id"],
    ["sender_id", "recipient_id"],
    ["user_id", "friend_id"],
    ["user_id", "target_id"],
    ["from_user_id", "to_user_id"],
    ["initiator_id", "recipient_id"],
  ];
  const known = knownPairs.find(([first, second]) => first in row && second in row);
  if (known) return known;
  // FarklÄ± bir ÅŸema kullanÄ±lÄ±yorsa yalnÄ±zca UUID tutan, kullanÄ±cÄ±yÄ± ifade eden
  // iki sÃ¼tuna izin ver. Genel "id" veya mesaj kimliÄŸi bu alana girmez.
  const keys = Object.keys(row).filter(key =>
    /(?:user|friend|requester|recipient|sender|receiver|addressee|initiator)/i.test(key)
      && typeof row[key] === "string"
      && UUID.test(String(row[key]))
  );
  return keys.length === 2 ? [keys[0], keys[1]] : null;
}

function isAccepted(row: FriendshipRow) {
  const status = row.status ?? row.state ?? row.relationship_status;
  if (typeof status === "string") return status.toLowerCase() === "accepted";
  if (typeof row.is_accepted === "boolean") return row.is_accepted;
  if (typeof row.accepted === "boolean") return row.accepted;
  if ("accepted_at" in row) return Boolean(row.accepted_at);
  // Kabul bilgisi saptanamadÄ±ÄŸÄ±nda bekleyen istekleri dÄ±ÅŸarÄ± sÄ±zdÄ±rma.
  return false;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("").toLocaleUpperCase("tr-TR") || "F1";
}

function batches<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

export default async function MemberPublicFriends({ memberId }: { memberId: string }) {
  if (!UUID.test(memberId)) return null;
  const admin = createAdminClient();

  // "dm_list_friends" yalnÄ±zca oturum aÃ§an kullanÄ±cÄ±nÄ±n arkadaÅŸlarÄ±nÄ± getirir.
  // Burada ziyaret edilen Ã¼yenin kabul edilmiÅŸ arkadaÅŸlÄ±klarÄ±nÄ± sunucu tarafÄ±nda
  // okuyoruz; Ã¶zel mesajlar ve bekleyen istekler hiÃ§ gÃ¶rÃ¼ntÃ¼lenmez.
  const sample = await admin.from("dm_friendships").select("*").limit(1);
  if (sample.error) {
    console.error("Public member friends: friendship table unavailable", sample.error.message);
    return <section className={styles.panel}><h2>ArkadaÅŸlar</h2><p className={styles.empty}>ArkadaÅŸ listesi ÅŸu anda yÃ¼klenemiyor.</p></section>;
  }
  const probe = (sample.data?.[0] ?? null) as FriendshipRow | null;
  if (!probe) return <section className={styles.panel}><h2>ArkadaÅŸlar</h2><p className={styles.empty}>HenÃ¼z arkadaÅŸ baÄŸlantÄ±sÄ± bulunmuyor.</p></section>;
  const pair = getPair(probe);
  if (!pair) {
    console.error("Public member friends: unsupported friendship column schema");
    return <section className={styles.panel}><h2>ArkadaÅŸlar</h2><p className={styles.empty}>ArkadaÅŸ listesi ÅŸu anda yÃ¼klenemiyor.</p></section>;
  }
  const [left, right] = pair;
  const connection = await admin.from("dm_friendships")
    .select("*")
    .or(`${left}.eq.${memberId},${right}.eq.${memberId}`)
    .limit(750);
  if (connection.error) {
    console.error("Public member friends: query failed", connection.error.message);
    return <section className={styles.panel}><h2>ArkadaÅŸlar</h2><p className={styles.empty}>ArkadaÅŸ listesi ÅŸu anda yÃ¼klenemiyor.</p></section>;
  }

  const friendIds = Array.from(new Set(((connection.data || []) as FriendshipRow[])
    .filter(isAccepted)
    .map(row => row[left] === memberId ? row[right] : row[left])
    .filter((id): id is string => typeof id === "string" && UUID.test(id) && id !== memberId)));

  if (friendIds.length === 0) {
    return <section className={styles.panel}><div className={styles.eyebrow}>F1 SOCIAL Â· SOSYAL</div><h2>ArkadaÅŸlar</h2><p className={styles.empty}>HenÃ¼z kabul edilmiÅŸ arkadaÅŸlÄ±k yok.</p></section>;
  }

  const chunks = batches(friendIds, BATCH);
  const results = await Promise.all(chunks.map(async ids => {
    // Supabase'in varsayilan 1000 satir sinirina takilmamak icin sayfala.
    const getPredictions = async (): Promise<PredictionPoints[]> => {
      const out: PredictionPoints[] = [];
      for (let start = 0; start < 20000; start += 1000) {
        const { data, error } = await admin.from("predictions")
          .select("user_id,points").in("user_id", ids).not("points", "is", null)
          .range(start, start + 999);
        if (error) { console.error("Member predictions XP:", error.message); break; }
        out.push(...((data || []) as PredictionPoints[]));
        if (!data || data.length < 1000) break;
      }
      return out;
    };
    const getAwards = async (): Promise<AchievementPoints[]> => {
      const out: AchievementPoints[] = [];
      for (let start = 0; start < 20000; start += 1000) {
        const { data, error } = await admin.from("user_achievements")
          .select("user_id,xp_awarded").in("user_id", ids)
          .range(start, start + 999);
        if (error) { console.error("Member achievement XP:", error.message); break; }
        out.push(...((data || []) as AchievementPoints[]));
        if (!data || data.length < 1000) break;
      }
      return out;
    };
    const [people, predictions, awards] = await Promise.all([
      admin.from("profiles").select("id,display_name,username,avatar_url,favorite_team").in("id", ids),
      getPredictions(), getAwards(),
    ]);
    if (people.error) console.error("Public member friends: profile load error", people.error.message);
    return {
      people: (people.data || []) as Person[],
      predictions,
      awards,
    };
  }));
  const xp = new Map<string, number>();
  for (const result of results) {
    for (const row of result.predictions) xp.set(row.user_id, (xp.get(row.user_id) || 0) + Math.max(0, Number(row.points || 0)));
    for (const row of result.awards) xp.set(row.user_id, (xp.get(row.user_id) || 0) + Math.max(0, Number(row.xp_awarded || 0)));
  }
  const friends = results.flatMap(result => result.people)
    .map(person => ({ ...person, level: levelFromXp(xp.get(person.id) || 0), xp: xp.get(person.id) || 0 }))
    .sort((a, b) => b.level - a.level || b.xp - a.xp || (a.display_name || "").localeCompare(b.display_name || "", "tr"));

  return <section className={styles.panel} aria-label="Ãœyenin arkadaÅŸlarÄ±">
    <div className={styles.top}>
      <div><span className={styles.eyebrow}>F1 SOCIAL Â· SOCIAL PADDOCK</span><h2>ArkadaÅŸlar <span>{friends.length}</span></h2><p>Kabul edilmiÅŸ arkadaÅŸlÄ±klar Â· En yÃ¼ksek seviyeden baÅŸlayarak</p></div>
    </div>
    {friends.length ? <div className={styles.list}>
      {friends.map((person, index) => {
        const name = person.display_name?.trim() || person.username || "F1 SOCIAL Ãœyesi";
        return <Link href={`/members/${person.id}`} className={styles.friend} key={person.id} title={`${name} profilini ziyaret et`}>
          <span className={styles.rank}>{String(index + 1).padStart(2, "0")}</span>
          <span className={styles.avatar}>{person.avatar_url ? <img src={person.avatar_url} alt="" loading="lazy" /> : initials(name)}</span>
          <span className={styles.info}><strong>{name}</strong><small>{person.username ? `@${person.username}` : "F1 SOCIAL ÃœYESÄ°"}{person.favorite_team ? ` Â· ${person.favorite_team}` : ""}</small></span>
          <span className={styles.level}><small>LEVEL</small><strong>{person.level}</strong></span>
          <span className={styles.arrow} aria-hidden="true">â†—</span>
        </Link>;
      })}
    </div> : <p className={styles.empty}>HenÃ¼z gÃ¶rÃ¼ntÃ¼lenebilen arkadaÅŸ yok.</p>}
  </section>;
}
