import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lzionhqssgzjuduguijm.supabase.co'
const SUPABASE_KEY = 'sb_publishable_NH3xzv10vasqxJsQf2tnMw_vknRN_2J'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
