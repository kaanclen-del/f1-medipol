import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/utils/supabase/admin";

/** Public data only. 45-second cache avoids querying Supabase on every visit. */
export const loadPublishedEvents = unstable_cache(
  async () => {
    const { data, error } = await createAdminClient()
      .from("events")
      .select("id,title,description,event_type,location_name,location_address,location_map_url,start_at,end_at,cover_image_url,registration_url,featured,is_published")
      .eq("is_published", true)
      .order("start_at", { ascending: false });
    if (error) throw new Error("Etkinlikler yüklenemedi.");
    return data ?? [];
  },
  ["f1social-published-events-g6176"],
  { revalidate: 45, tags: ["published-events"] },
);
