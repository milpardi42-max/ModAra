/*
 * Local demo backend.
 *
 * Implements the small subset of the supabase-js API that this app uses
 * (`.from(table).select()/insert()/update()/delete()` with `eq/neq/ilike/order/
 * limit/single/maybeSingle`, plus `auth`), backed by localStorage.
 *
 * It is only used when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing,
 * so the site can be run and browsed without any external service. As soon as
 * real Supabase credentials are provided, the real client is used instead.
 */
import { seedBlogPosts, seedCategories, seedProducts, seedReviews } from './demoSeed';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type DB = Record<string, Row[]>;

const DB_KEY = 'modara-demo-db-v1';
const AUTH_KEY = 'technoshop-auth';

/* ---------------------------------------------------------------- storage */

function freshDB(): DB {
  return {
    categories: JSON.parse(JSON.stringify(seedCategories)),
    products: JSON.parse(JSON.stringify(seedProducts)),
    blog_posts: JSON.parse(JSON.stringify(seedBlogPosts)),
    reviews: JSON.parse(JSON.stringify(seedReviews)),
    coupons: [
      { id: 'coupon-welcome', code: 'WELCOME10', type: 'percentage', value: 10, min_order: 0, max_uses: 100, used_count: 0, active: true, expires_at: null, created_at: new Date().toISOString() },
    ],
    customer_profiles: [],
    store_settings: [{ id: 'store', store_name: 'مُدارا', support_phone: '۰۲۱-۱۲۳۴۵۶۷۸', support_email: 'info@technoshop.ir', shipping_threshold: 500000, currency: 'تومان', announcement: 'ارسال رایگان برای سفارش‌های بالای ۵۰۰ هزار تومان', maintenance_mode: false, updated_at: new Date().toISOString() }],
    cart_items: [],
    orders: [],
    order_items: [],
  };
}

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      const base = freshDB();
      // keep catalogue in sync with the seed, keep user-generated rows
      return {
        ...base,
        reviews: parsed.reviews?.length ? parsed.reviews : base.reviews,
        coupons: parsed.coupons ?? base.coupons,
        customer_profiles: parsed.customer_profiles ?? base.customer_profiles,
        store_settings: parsed.store_settings ?? base.store_settings,
        cart_items: parsed.cart_items ?? [],
        orders: parsed.orders ?? [],
        order_items: parsed.order_items ?? [],
      };
    }
  } catch {
    /* ignore corrupted storage */
  }
  return freshDB();
}

const db: DB = typeof localStorage !== 'undefined' ? loadDB() : freshDB();

function saveDB() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* ignore quota errors */
  }
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/* -------------------------------------------------------------- relations */

type Relation = { table: string; localKey: string; foreignKey: string; many: boolean };

const relations: Record<string, Record<string, Relation>> = {
  products: {
    categories: { table: 'categories', localKey: 'category_id', foreignKey: 'id', many: false },
  },
  cart_items: {
    products: { table: 'products', localKey: 'product_id', foreignKey: 'id', many: false },
  },
  order_items: {
    products: { table: 'products', localKey: 'product_id', foreignKey: 'id', many: false },
  },
  orders: {
    order_items: { table: 'order_items', localKey: 'id', foreignKey: 'order_id', many: true },
  },
  reviews: {
    products: { table: 'products', localKey: 'product_id', foreignKey: 'id', many: false },
  },
};

type Embed = { alias: string; table: string; select: string };

/** Parses `*, product:products(*), order_items:order_items(*, product:products(*))` */
function parseEmbeds(select: string): Embed[] {
  const embeds: Embed[] = [];
  let i = 0;
  while (i < select.length) {
    const open = select.indexOf('(', i);
    if (open === -1) break;
    // find matching close paren
    let depth = 0;
    let close = -1;
    for (let j = open; j < select.length; j++) {
      if (select[j] === '(') depth++;
      else if (select[j] === ')') {
        depth--;
        if (depth === 0) {
          close = j;
          break;
        }
      }
    }
    if (close === -1) break;
    const head = select.slice(i, open).split(',').pop()!.trim();
    const [aliasOrTable, maybeTable] = head.split(':').map((s) => s.trim());
    const table = maybeTable || aliasOrTable;
    const alias = maybeTable ? aliasOrTable : aliasOrTable;
    embeds.push({ alias, table, select: select.slice(open + 1, close) });
    i = close + 1;
  }
  return embeds;
}

function applyEmbeds(table: string, rows: Row[], select: string): Row[] {
  const embeds = parseEmbeds(select);
  if (!embeds.length) return rows;
  return rows.map((row) => {
    const out: Row = { ...row };
    for (const embed of embeds) {
      const rel = relations[table]?.[embed.table];
      if (!rel) continue;
      const source = db[rel.table] ?? [];
      if (rel.many) {
        const children = source.filter((c) => c[rel.foreignKey] === row[rel.localKey]);
        out[embed.alias] = applyEmbeds(rel.table, children, embed.select);
      } else {
        const child = source.find((c) => c[rel.foreignKey] === row[rel.localKey]) ?? null;
        out[embed.alias] = child ? applyEmbeds(rel.table, [child], embed.select)[0] : null;
      }
    }
    return out;
  });
}

/* ------------------------------------------------------------ query chain */

type Filter = (row: Row) => boolean;
type Result<T> = { data: T; error: { message: string } | null };

class QueryBuilder<T = Row[]> implements PromiseLike<Result<any>> {
  private filters: Filter[] = [];
  private selectStr = '*';
  private orderBy: { column: string; ascending: boolean }[] = [];
  private limitN: number | null = null;
  private mode: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: Row[] = [];
  private singleMode: 'one' | 'maybe' | null = null;
  private returning = false;

  constructor(private table: string) {}

  select(columns = '*') {
    if (this.mode === 'select') this.selectStr = columns;
    else this.returning = true;
    return this;
  }

  insert(values: Row | Row[]) {
    this.mode = 'insert';
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }

  update(values: Row) {
    this.mode = 'update';
    this.payload = [values];
    return this;
  }

  delete() {
    this.mode = 'delete';
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  ilike(column: string, pattern: string) {
    const needle = String(pattern).replace(/%/g, '').toLowerCase();
    this.filters.push((row) => String(row[column] ?? '').toLowerCase().includes(needle));
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orderBy.push({ column, ascending: opts?.ascending ?? true });
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  maybeSingle() {
    this.singleMode = 'maybe';
    return this;
  }

  single() {
    this.singleMode = 'one';
    return this;
  }

  private rows() {
    return db[this.table] ?? (db[this.table] = []);
  }

  private matched() {
    return this.rows().filter((row) => this.filters.every((f) => f(row)));
  }

  private run(): Result<any> {
    let rows: Row[];

    switch (this.mode) {
      case 'insert': {
        const created = this.payload.map((values) => ({
          id: uid(this.table.slice(0, 3)),
          created_at: new Date().toISOString(),
          ...values,
        }));
        this.rows().push(...created);
        saveDB();
        rows = created;
        break;
      }
      case 'update': {
        rows = this.matched();
        rows.forEach((row) => Object.assign(row, this.payload[0]));
        saveDB();
        break;
      }
      case 'delete': {
        rows = this.matched();
        db[this.table] = this.rows().filter((row) => !rows.includes(row));
        saveDB();
        break;
      }
      default: {
        rows = this.matched().map((row) => ({ ...row }));
        for (const { column, ascending } of [...this.orderBy].reverse()) {
          rows.sort((a, b) => {
            const av = a[column];
            const bv = b[column];
            if (av === bv) return 0;
            const cmp = av > bv ? 1 : -1;
            return ascending ? cmp : -cmp;
          });
        }
        if (this.limitN !== null) rows = rows.slice(0, this.limitN);
        rows = applyEmbeds(this.table, rows, this.selectStr);
      }
    }

    if (this.mode !== 'select' && !this.returning && this.singleMode === null) {
      return { data: null, error: null };
    }

    if (this.singleMode === 'one') {
      if (!rows.length) return { data: null, error: { message: 'No rows found' } };
      return { data: rows[0], error: null };
    }
    if (this.singleMode === 'maybe') {
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null };
  }

  then<R1 = Result<T>, R2 = never>(
    onfulfilled?: ((value: Result<any>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return new Promise<Result<any>>((resolve) => {
      // small delay keeps the async behaviour of the real client
      setTimeout(() => resolve(this.run()), 0);
    }).then(onfulfilled, onrejected);
  }
}

/* ------------------------------------------------------------------- auth */

type DemoUser = { id: string; email: string; user_metadata: Record<string, unknown>; app_metadata: Record<string, unknown>; aud: string; created_at: string };
type DemoSession = { access_token: string; token_type: string; expires_in: number; expires_at: number; refresh_token: string; user: DemoUser };

const USERS_KEY = 'modara-demo-users-v1';
const DEMO_ADMIN_USERNAME = 'admin';
const DEMO_ADMIN_PASSWORD = 'admin 1234';

function loadUsers(): Record<string, { id: string; email: string; password: string; created_at: string }> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, unknown>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function makeSession(user: { id: string; email: string; created_at: string }, role?: string): DemoSession {
  return {
    access_token: 'demo-' + user.id,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'demo-refresh',
    user: {
      id: user.id,
      email: user.email,
      user_metadata: {},
      app_metadata: { provider: 'demo', ...(role ? { role } : {}) },
      aud: 'authenticated',
      created_at: user.created_at,
    },
  };
}

function storedSession(): DemoSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as DemoSession) : null;
  } catch {
    return null;
  }
}

const listeners = new Set<(event: string, session: DemoSession | null) => void>();

function setSession(session: DemoSession | null, event: string) {
  if (session) localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  else localStorage.removeItem(AUTH_KEY);
  listeners.forEach((cb) => cb(event, session));
}

const auth = {
  async getSession() {
    return { data: { session: storedSession() }, error: null };
  },
  async getUser() {
    return { data: { user: storedSession()?.user ?? null }, error: null };
  },
  onAuthStateChange(cb: (event: string, session: DemoSession | null) => void) {
    listeners.add(cb);
    setTimeout(() => cb('INITIAL_SESSION', storedSession()), 0);
    return {
      data: {
        subscription: {
          id: uid('sub'),
          callback: cb,
          unsubscribe: () => listeners.delete(cb),
        },
      },
    };
  },
  async signUp({ email, password }: { email: string; password: string }) {
    const users = loadUsers();
    const key = email.trim().toLowerCase();
    if (!key || !password || password.length < 6) {
      return { data: { user: null, session: null }, error: { message: 'رمز عبور باید حداقل ۶ کاراکتر باشد' } };
    }
    if (users[key]) {
      return { data: { user: null, session: null }, error: { message: 'این ایمیل قبلاً ثبت شده است' } };
    }
    const user = { id: uid('user'), email: key, password, created_at: new Date().toISOString() };
    users[key] = user;
    saveUsers(users);
    const session = makeSession(user);
    setSession(session, 'SIGNED_IN');
    return { data: { user: session.user, session }, error: null };
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const users = loadUsers();
    const key = email.trim().toLowerCase();
    if (key === DEMO_ADMIN_USERNAME && password === DEMO_ADMIN_PASSWORD) {
      const adminUser = { id: 'demo-admin', email: DEMO_ADMIN_USERNAME, created_at: '2026-01-01T00:00:00.000Z' };
      const session = makeSession(adminUser, 'admin');
      setSession(session, 'SIGNED_IN');
      return { data: { user: session.user, session }, error: null };
    }
    const user = users[key];
    if (!user || user.password !== password) {
      return { data: { user: null, session: null }, error: { message: 'نام کاربری یا رمز عبور نادرست است' } };
    }
    const session = makeSession(user);
    setSession(session, 'SIGNED_IN');
    return { data: { user: session.user, session }, error: null };
  },
  async signOut() {
    setSession(null, 'SIGNED_OUT');
    return { error: null };
  },
};

/* ----------------------------------------------------------------- client */

export const localBackend = {
  from: (table: string) => new QueryBuilder(table),
  auth,
  isDemo: true as const,
};

export type LocalBackend = typeof localBackend;
