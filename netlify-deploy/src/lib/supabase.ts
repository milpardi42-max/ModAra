import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { localBackend } from './localBackend';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * When Supabase credentials are configured we talk to the real project.
 * Otherwise the app falls back to a fully local, in-browser demo backend so
 * the site can be run and browsed without any external service.
 */
export const isDemoMode = !supabaseUrl || !supabaseAnonKey;

export const supabase = (
  isDemoMode
    ? localBackend
    : createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storage: window.localStorage,
          storageKey: 'technoshop-auth',
          detectSessionInUrl: true,
          flowType: 'implicit',
        },
      })
) as SupabaseClient;

if (isDemoMode) {
  console.info('[ModAra] Running in local demo mode (no Supabase credentials found).');
}

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  rating: number;
  stock: number;
  created_at: string;
};

export type CartItem = {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  product?: Product;
};

export type Order = {
  id: string;
  user_id: string;
  total: number;
  status: string;
  address: string | null;
  phone: string | null;
  created_at: string;
  tracking_code?: string | null;
  payment_gateway?: string | null;
  payment_ref_id?: string | null;
  order_items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  product?: Product;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  author: string;
  created_at: string;
};

export type Review = {
  id: string;
  product_id: string;
  user_id: string | null;
  name: string;
  rating: number;
  comment: string | null;
  status?: 'published' | 'pending' | 'hidden' | string;
  created_at: string;
  product?: Product;
};

export type Coupon = {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | string;
  value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
};

export type CustomerProfile = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: 'active' | 'blocked' | string;
  created_at: string;
};

export type StoreSettings = {
  id: string;
  store_name: string;
  support_phone: string;
  support_email: string;
  shipping_threshold: number;
  currency: string;
  announcement: string;
  maintenance_mode: boolean;
  updated_at: string;
};
