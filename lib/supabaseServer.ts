import { createClient, type SupabaseClient } from "@supabase/supabase-js"

function requiredEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing environment variable: ${name}`)
  return v
}

export function createSupabasePublicClient(): SupabaseClient {
  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL")
  const anonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function createSupabaseAdminClient(): SupabaseClient {
  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL")
  const serviceKey = requiredEnv("SUPABASE_SERVICE_KEY")
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type SupabaseEmailStatus = {
  supabaseUserExists: boolean
  emailConfirmed: boolean
}

export async function getSupabaseEmailStatusByEmail(
  email: string
): Promise<SupabaseEmailStatus> {
  const supabase = createSupabaseAdminClient()

  // Supabase Auth admin API does not provide a direct "get by email" in all configs.
  // We page through users and match on email (fine for typical clinic-scale user counts).
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) throw error

    const users = (data?.users || []) as Array<{
      email?: string | null
      email_confirmed_at?: string | null
      confirmed_at?: string | null
    }>

    const found = users.find(
      (u) => (u.email || "").toLowerCase() === email.toLowerCase()
    )

    if (found) {
      const confirmedAt = found.email_confirmed_at || found.confirmed_at
      return { supabaseUserExists: true, emailConfirmed: !!confirmedAt }
    }

    if (!users.length || users.length < perPage) break
    page += 1
  }

  return { supabaseUserExists: false, emailConfirmed: false }
}

