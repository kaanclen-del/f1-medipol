import { createAdminClient } from '@/utils/supabase/admin';

// Supabase API varsayilan satir limiti 1000'dir. Tum kayitli cihazlari parca parca oku.
// Bu islev abonelik adedine yapay bir ust limit koymaz.
export async function listUserPushDevices<T>(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  fields: string,
): Promise<T[]> {
  const pageSize = 400;
  const result: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin.from('push_subscriptions')
      .select(fields)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as T[];
    result.push(...page);
    if (page.length < pageSize) break;
  }
  return result;
}
