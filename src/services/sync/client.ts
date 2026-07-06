import { createClient } from '@supabase/supabase-js'

// Proyecto Supabase de Fresia. La llave publishable es pública por diseño
// (la seguridad la pone RLS: solo usuarios autenticados leen/escriben).
export const SUPABASE_URL = 'https://vcvxotvpmmuwxekruiiq.supabase.co'
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY ?? ''

export const cloudEnabled = SUPABASE_KEY.length > 0

export const supabase = createClient(SUPABASE_URL, cloudEnabled ? SUPABASE_KEY : 'sin-configurar')
