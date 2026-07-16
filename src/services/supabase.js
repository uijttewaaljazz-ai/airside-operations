import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://setdutiktnvvvenbvwfp.supabase.co'
const supabasePublishableKey =
  'sb_publishable_KH2DyAyueky-75XkRvv_Og_7tUEeMkC'

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
)
