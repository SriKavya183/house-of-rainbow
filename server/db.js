import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const { Pool } = pg
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required. Add your Supabase PostgreSQL connection string to the server environment.')
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
})

export async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
      price_paise BIGINT NOT NULL, description TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '', images JSONB NOT NULL DEFAULT '[]'::jsonb,
      featured BOOLEAN NOT NULL DEFAULT FALSE, stock_quantity INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, customer_email TEXT,
      customer_phone TEXT NOT NULL, address_line TEXT NOT NULL, city TEXT NOT NULL,
      state TEXT NOT NULL, pincode TEXT NOT NULL, payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL, amount_paise BIGINT NOT NULL, currency TEXT NOT NULL DEFAULT 'INR',
      notes TEXT, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id BIGSERIAL PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL, name TEXT NOT NULL, quantity INTEGER NOT NULL,
      unit_price_paise BIGINT NOT NULL, image TEXT
    );
    CREATE TABLE IF NOT EXISTS payments (
      id BIGSERIAL PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      method TEXT NOT NULL, status TEXT NOT NULL, razorpay_order_id TEXT,
      razorpay_payment_id TEXT, razorpay_signature TEXT, razorpay_refund_id TEXT,
      amount_paise BIGINT NOT NULL, raw_json TEXT, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
    );
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='images' AND data_type='text') THEN
        ALTER TABLE products ALTER COLUMN images DROP DEFAULT;
        ALTER TABLE products ALTER COLUMN images TYPE JSONB USING CASE WHEN images IS NULL OR images = '' THEN '[]'::jsonb ELSE images::jsonb END;
        ALTER TABLE products ALTER COLUMN images SET DEFAULT '[]'::jsonb;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='featured' AND data_type='integer') THEN
        ALTER TABLE products ALTER COLUMN featured DROP DEFAULT;
        ALTER TABLE products ALTER COLUMN featured TYPE BOOLEAN USING (featured <> 0);
        ALTER TABLE products ALTER COLUMN featured SET DEFAULT FALSE;
      END IF;
    END $$;
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
    CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
  `)
  const seed = [
    ['meenakari-haar','Meenakari Bridal Haar','Necklaces',4850000,'Hand-set kundan and meenakari necklace with matching drops. 22K gold-plated finish for bridal wear.','https://images.unsplash.com/photo-1601121141461-9d7917fa2f54?auto=format&fit=crop&w=900&q=80',true],
    ['polki-choker','Polki Pearl Choker','Necklaces',3290000,'Close-set polki choker with Basra-style pearls. Lightweight for all-day wedding ceremonies.','https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80',true],
    ['temple-jhumkas','Temple Lakshmi Jhumkas','Earrings',1850000,'South Indian temple work jhumkas with goddess motifs and antique gold tone.','https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=900&q=80',true],
    ['chandbali-drops','Chandbali Emerald Drops','Earrings',2190000,'Crescent chandbalis with green glass and kundan. Pair with pastel lehengas.','https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80',false],
    ['kada-bangles','Royal Kada Pair','Bangles',2750000,'Openable kada pair with ruby-tone stones and engraved paisley borders.','https://images.unsplash.com/photo-1611652022419-a73b6dcd47c7?auto=format&fit=crop&w=900&q=80',true],
    ['glass-bangles','Festive Stack Bangles','Bangles',890000,'A stack of gold-tone and enamel bangles for Navratri and sangeet nights.','https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=80',false],
    ['solitaire-ring','Navratna Statement Ring','Rings',1450000,'Nine-stone navratna ring in a high-polish gold setting. Adjustable inner band.','https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80',true],
    ['bridal-set','Jaipur Bridal Set','Bridal Sets',8990000,'Complete haar, earrings, maang tikka and bangles. Designed for pheras and reception.','https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80',true],
  ]
  for (const p of seed) await pool.query(`INSERT INTO products(id,name,category,price_paise,description,image,images,featured,stock_quantity) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,0) ON CONFLICT(id) DO NOTHING`, [p[0],p[1],p[2],p[3],p[4],p[5],JSON.stringify([p[5]]),p[6]])
}
function parseProduct(p) { if (!p) return p; let images = p.images; if (typeof images === 'string') { try { images = JSON.parse(images) } catch { images=[] } }; if (!Array.isArray(images)) images=[]; if (!images.length && p.image) images=[p.image]; return {...p, price_paise:Number(p.price_paise), featured:Boolean(p.featured), images} }
export async function listProducts({category,featured}={}) { let q='SELECT * FROM products', vals=[]; if(category){q+=' WHERE category=$1';vals.push(category)} else if(featured){q+=' WHERE featured=TRUE'} q+=' ORDER BY category,name'; const {rows}=await pool.query(q,vals); return rows.map(parseProduct) }
export async function getProduct(id) { const {rows}=await pool.query('SELECT * FROM products WHERE id=$1',[id]); return parseProduct(rows[0]) }
export async function createProduct(p) { const images=Array.isArray(p.images)&&p.images.length?p.images:(p.image?[p.image]:[]); const image=images[0]||p.image||''; await pool.query(`INSERT INTO products(id,name,category,price_paise,description,image,images,featured,stock_quantity) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)`,[p.id,p.name,p.category,p.price_paise,p.description||'',image,JSON.stringify(images),!!p.featured,Number(p.stock_quantity)||0]); return getProduct(p.id) }
export async function updateProduct(id,p) { const old=await getProduct(id); if(!old)return null; const images=Array.isArray(p.images)&&p.images.length?p.images:(p.image?[p.image]:(old.images||[])); const image=images[0]||p.image||old.image||''; await pool.query(`UPDATE products SET name=$1,category=$2,price_paise=$3,description=$4,image=$5,images=$6::jsonb,featured=$7,stock_quantity=$8 WHERE id=$9`,[p.name??old.name,p.category??old.category,p.price_paise??old.price_paise,p.description??old.description,image,JSON.stringify(images),p.featured===undefined?old.featured:!!p.featured,p.stock_quantity??old.stock_quantity,id]); return getProduct(id) }
export async function deleteProduct(id) { const r=await pool.query('DELETE FROM products WHERE id=$1',[id]); return r.rowCount>0 }
export async function createOrder(o) { const c=await pool.connect(); const now=new Date(); try { await c.query('BEGIN'); await c.query(`INSERT INTO orders(id,customer_name,customer_email,customer_phone,address_line,city,state,pincode,payment_method,payment_status,amount_paise,currency,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'INR',$12,$12)`,[o.id,o.customer_name,o.customer_email||'',o.customer_phone,o.address_line,o.city,o.state,o.pincode,o.payment_method,o.payment_status,o.amount_paise,now]); for(const i of o.items) await c.query(`INSERT INTO order_items(order_id,product_id,name,quantity,unit_price_paise,image) VALUES($1,$2,$3,$4,$5,$6)`,[o.id,i.product_id,i.name,i.quantity,i.unit_price_paise,i.image||'']); await c.query(`INSERT INTO payments(order_id,method,status,amount_paise,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$5)`,[o.id,o.payment_method,o.payment_status,o.amount_paise,now]); await c.query('COMMIT') } catch(e) { await c.query('ROLLBACK'); throw e } finally { c.release() } return getOrder(o.id) }
export async function getOrder(id) { const {rows}=await pool.query('SELECT * FROM orders WHERE id=$1',[id]); const o=rows[0]; if(!o)return null; const [items,payments]=await Promise.all([pool.query('SELECT * FROM order_items WHERE order_id=$1 ORDER BY id',[id]),pool.query('SELECT * FROM payments WHERE order_id=$1 ORDER BY id DESC',[id])]); return {...o,amount_paise:Number(o.amount_paise),items:items.rows.map(x=>({...x,unit_price_paise:Number(x.unit_price_paise)})),payments:payments.rows.map(x=>({...x,amount_paise:Number(x.amount_paise)}))} }
export async function listOrders() { const {rows}=await pool.query('SELECT id FROM orders ORDER BY created_at DESC'); return Promise.all(rows.map(x=>getOrder(x.id))) }
export async function updateOrderStatus(id,status) { await pool.query('UPDATE orders SET payment_status=$1,updated_at=$2 WHERE id=$3',[status,new Date(),id]) }
export async function updateLatestPayment(orderId,fields) { const allowed=['status','razorpay_order_id','razorpay_payment_id','razorpay_signature','razorpay_refund_id','raw_json']; const sets=['updated_at=$1']; const vals=[new Date()]; for(const k of allowed)if(fields[k]!==undefined){vals.push(fields[k]);sets.push(`${k}=$${vals.length}`)} vals.push(orderId); await pool.query(`UPDATE payments SET ${sets.join(',')} WHERE id=(SELECT id FROM payments WHERE order_id=$${vals.length} ORDER BY id DESC LIMIT 1)`,vals) }
export async function findOrderByRazorpayOrderId(id) { const {rows}=await pool.query('SELECT order_id FROM payments WHERE razorpay_order_id=$1 LIMIT 1',[id]); return rows[0]?getOrder(rows[0].order_id):null }
