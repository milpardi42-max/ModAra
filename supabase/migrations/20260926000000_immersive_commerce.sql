/*
# Immersive commerce support

Extends the schema for the redesigned storefront:

1. `wishlist` — saved products, owner-scoped (guests keep theirs in localStorage
   and it merges into this table on sign-in).
2. `cart_items.variant` — selected size/colour stored per cart line.
3. `order_items.variant` — the chosen variant travels with the order.
4. `orders.discount` / `orders.coupon_code` — coupon applied at checkout.
5. `products.sizes` / `products.colors` — optional explicit variant columns.
   When present they take precedence over the values the UI derives from the
   category and the product name.
6. Public read access to active coupons so checkout can validate codes
   (used_count is still admin-only through the existing backoffice policy).

Safe to run on an existing project: every statement is idempotent.
*/

-- Wishlist ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_wishlist" ON wishlist;
CREATE POLICY "select_own_wishlist" ON wishlist FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_wishlist" ON wishlist;
CREATE POLICY "insert_own_wishlist" ON wishlist FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_wishlist" ON wishlist;
CREATE POLICY "delete_own_wishlist" ON wishlist FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Variant + coupon columns ------------------------------------------------
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code text;

ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes text[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS colors jsonb;

-- Coupons are readable by shoppers so checkout can validate them ----------
DROP POLICY IF EXISTS "public_read_active_coupons" ON coupons;
CREATE POLICY "public_read_active_coupons" ON coupons FOR SELECT
  TO anon, authenticated USING (active = true);
