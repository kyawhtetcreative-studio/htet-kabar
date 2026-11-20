const express=require('express');
const path=require('node:path');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const {Pool}=require('pg');
const helmet=require('helmet');
const {rateLimit}=require('express-rate-limit');

const app=express();
const PORT=Number(process.env.PORT||3000);
const SECRET=process.env.JWT_SECRET;
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL?.includes('neon.tech')||process.env.DATABASE_URL?.includes('render.com')?{rejectUnauthorized:false}:undefined});
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'300kb'}));
app.use(express.static(path.join(__dirname,'public')));
app.use((req,res,next)=>{req.cookies={};for(const item of (req.headers.cookie||'').split(';')){const [k,...v]=item.trim().split('=');if(k)req.cookies[k]=decodeURIComponent(v.join('='));}next();});
const loginLimit=rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:true,legacyHeaders:false,message:{error:'Login ကြိုးစားမှုများလွန်းပါသည်။ ၁၅ မိနစ်အကြာ ပြန်ကြိုးစားပါ။'}});
const seed=[
{name:'ဂရပ်ဖစ်ဒီဇိုင်း',slug:'graphic-design',icon:'✦',description:'Logo၊ Poster၊ Banner၊ Social Media Design၊ Branding နှင့် ကြော်ငြာဒီဇိုင်းများ။',packages:[{name:'Basic Design',price:25000,description:'ဒီဇိုင်းတစ်ခု၊ ပြင်ဆင်မှု ၂ ကြိမ်'},{name:'Standard Design',price:50000,description:'ဒီဇိုင်း ၂ မျိုး၊ ပြင်ဆင်မှု ၃ ကြိမ်'},{name:'Premium Design',price:100000,description:'Premium creative နှင့် source file'}]},
{name:'Telegram ဝန်ဆောင်မှု',slug:'telegram-service',icon:'✈',description:'Telegram setup၊ channel/group စီမံမှုနှင့် အသုံးပြုမှုအကူအညီ။',packages:[{name:'Basic Support',price:15000,description:'အခြေခံ setup အကူအညီ'},{name:'Channel Setup',price:30000,description:'Channel setup နှင့် အခြေခံပြင်ဆင်မှု'}]},
{name:'AI Prompt & Image',slug:'ai-prompt-image',icon:'✧',description:'AI Prompt၊ image concept၊ creative workflow နှင့် AI image အကူအညီ။',packages:[{name:'Prompt Pack',price:20000,description:'Prompt ၅ ခု'},{name:'Creative Image Pack',price:50000,description:'Concept နှင့် image output ၅ ခု'}]},
{name:'Software ဝယ်ယူရေး',slug:'software-purchase',icon:'▣',description:'Software ရွေးချယ်မှု၊ ဝယ်ယူရေးနှင့် license အကူအညီ။',packages:[{name:'Purchase Assistance',price:10000,description:'ရွေးချယ်မှုနှင့် ဝယ်ယူရေး အကူအညီ'}]},
{name:'Social Media Ads',slug:'social-media-ads',icon:'↗',description:'Facebook/Instagram ကြော်ငြာ campaign setup နှင့် စီမံမှု။',packages:[{name:'Campaign Setup',price:30000,description:'Campaign setup ဝန်ဆောင်ခ (Ad budget မပါ)'},{name:'Campaign Management',price:75000,description:'Campaign စီမံမှုဝန်ဆောင်ခ (Ad budget မပါ)'}]},
{name:'Boost Service',slug:'boost-service',icon:'◎',description:'Social media post promotion နှင့် boost စီမံမှု။',packages:[{name:'Promotion Setup',price:15000,description:'Setup ဝန်ဆောင်ခ (ကြော်ငြာဘတ်ဂျက် မပါ)'},{name:'Custom Boost',price:30000,description:'Custom promotion (ကြော်ငြာဘတ်ဂျက် မပါ)'}]},
{name:'အခြား IT ဝန်ဆောင်မှု',slug:'other-it-services',icon:'⌘',description:'Computer၊ Software၊ Internet နှင့် နည်းပညာပြဿနာများ အကူအညီ။',packages:[{name:'IT Consultation',price:15000,description:'အခြေခံ IT အကြံပေးဝန်ဆောင်မှု'},{name:'Technical Support',price:30000,description:'နည်းပညာပြဿနာ စစ်ဆေး/ဖြေရှင်း'}]},
{name:'Computer သင်တန်း',slug:'computer-training',icon:'▤',description:'Computer အခြေခံ၊ Graphic Design နှင့် Digital Skill သင်တန်းများ။',packages:[{name:'Basic Computer',price:50000,description:'သင်တန်းကြေး'},{name:'Graphic Design Starter',price:100000,description:'အခြေခံ Graphic Design သင်တန်း'}]}];
async function initialize(){
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL environment variable is required');
 if(!SECRET||SECRET.length<32)throw Error('JWT_SECRET must be set and at least 32 characters');
 await pool.query(`CREATE TABLE IF NOT EXISTS admins(id SERIAL PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS services(id SERIAL PRIMARY KEY,name TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,icon TEXT DEFAULT '✦',description TEXT NOT NULL,active BOOLEAN NOT NULL DEFAULT true,packages JSONB NOT NULL DEFAULT '[]',created_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
 const n=Number((await pool.query('SELECT COUNT(*) FROM services')).rows[0].count);
 if(!n)for(const s of seed)await pool.query('INSERT INTO services(name,slug,icon,description,packages) VALUES($1,$2,$3,$4,$5)',[s.name,s.slug,s.icon,s.description,JSON.stringify(s.packages)]);
 if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD){const hash=await bcrypt.hash(process.env.ADMIN_PASSWORD,12);await pool.query('INSERT INTO admins(email,password_hash) VALUES($1,$2) ON CONFLICT(email) DO NOTHING',[process.env.ADMIN_EMAIL.toLowerCase(),hash]);}
}
function requireAdmin(req,res,next){const token=req.cookies.hk_admin||req.headers.authorization?.replace(/^Bearer /,'');if(!token)return res.status(401).json({error:'Admin login ဝင်ရန်လိုအပ်ပါသည်။'});try{req.admin=jwt.verify(token,SECRET);next();}catch{return res.status(401).json({error:'Login session သက်တမ်းကုန်ပါပြီ။'});}}
function sameOrigin(req,res,next){const origin=req.get('origin');if(!origin)return next();const host=req.get('host');try{if(new URL(origin).host!==host)return res.status(403).json({error:'Cross-origin request ပိတ်ထားပါသည်။'});}catch{return res.status(403).json({error:'Origin မမှန်ပါ။'});}next();}
function publicService(s){return {...s,packages:typeof s.packages==='string'?JSON.parse(s.packages):s.packages};}
app.get('/api/health',(req,res)=>res.json({ok:true,app:'HTET KABAR',stage:'backend-foundation'}));
app.get('/api/services',async(req,res)=>{try{const result=await pool.query('SELECT * FROM services WHERE active=true ORDER BY id');res.json(result.rows.map(publicService));}catch(e){res.status(500).json({error:'Service စာရင်းရယူ၍မရပါ။'});}});
app.post('/api/admin/login',loginLimit,async(req,res)=>{try{const email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||'');if(!email||!password)return res.status(400).json({error:'Email နှင့် Password ဖြည့်ပါ။'});const admin=(await pool.query('SELECT * FROM admins WHERE email=$1',[email])).rows[0];if(!admin||!(await bcrypt.compare(password,admin.password_hash)))return res.status(401).json({error:'Email သို့မဟုတ် Password မှားနေပါသည်။'});const token=jwt.sign({adminId:admin.id,email:admin.email},SECRET,{expiresIn:'8h'});res.setHeader('Set-Cookie',`hk_admin=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV==='production'?'; Secure':''}`);res.json({ok:true,email:admin.email});}catch(e){res.status(500).json({error:'Login လုပ်၍မရပါ။'});}});
app.post('/api/admin/logout',sameOrigin,(req,res)=>{res.setHeader('Set-Cookie','hk_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');res.json({ok:true});});
app.get('/api/admin/me',requireAdmin,(req,res)=>res.json({ok:true,email:req.admin.email}));
app.get('/api/admin/services',requireAdmin,async(req,res)=>{try{res.json((await pool.query('SELECT * FROM services ORDER BY id')).rows.map(publicService));}catch{res.status(500).json({error:'Admin service list မရပါ။'});}});
app.post('/api/admin/services',requireAdmin,sameOrigin,async(req,res)=>{const {name,slug,icon,description,active,packages}=req.body||{};if(!name||!slug||!description||!Array.isArray(packages))return res.status(400).json({error:'အမည်၊ slug၊ ဖော်ပြချက်၊ package များ ဖြည့်ပါ။'});if(packages.some(p=>!p.name||!Number.isFinite(Number(p.price))||Number(p.price)<0))return res.status(400).json({error:'Package ဈေးနှုန်း မမှန်ပါ။'});try{const r=await pool.query('INSERT INTO services(name,slug,icon,description,active,packages) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[name.trim(),slug.trim(),icon||'✦',description.trim(),active!==false,JSON.stringify(packages)]);res.status(201).json(publicService(r.rows[0]));}catch{res.status(409).json({error:'Slug ထပ်နေခြင်း သို့မဟုတ် သိမ်းဆည်းမှု မအောင်မြင်ပါ။'});}});
app.put('/api/admin/services/:id',requireAdmin,sameOrigin,async(req,res)=>{const {name,slug,icon,description,active,packages}=req.body||{};if(!name||!slug||!description||!Array.isArray(packages)||packages.some(p=>!p.name||!Number.isFinite(Number(p.price))||Number(p.price)<0))return res.status(400).json({error:'Service အချက်အလက်နှင့် package ဈေးနှုန်းများ စစ်ဆေးပါ။'});try{const r=await pool.query('UPDATE services SET name=$1,slug=$2,icon=$3,description=$4,active=$5,packages=$6 WHERE id=$7 RETURNING *',[name.trim(),slug.trim(),icon||'✦',description.trim(),active!==false,JSON.stringify(packages),req.params.id]);if(!r.rows[0])return res.status(404).json({error:'Service မတွေ့ပါ။'});res.json(publicService(r.rows[0]));}catch{res.status(409).json({error:'Update မအောင်မြင်ပါ။ Slug ထပ်နေခြင်း ဖြစ်နိုင်ပါသည်။'});}});
app.delete('/api/admin/services/:id',requireAdmin,sameOrigin,async(req,res)=>{try{const r=await pool.query('UPDATE services SET active=false WHERE id=$1 RETURNING id',[req.params.id]);if(!r.rows[0])return res.status(404).json({error:'Service မတွေ့ပါ။'});res.json({ok:true});}catch{res.status(500).json({error:'Service ပိတ်၍မရပါ။'});}});

// Customer orders and manual payment review
async function ensureOrderTables(){
 await pool.query(`CREATE TABLE IF NOT EXISTS orders(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_code TEXT UNIQUE NOT NULL,
 customer_name TEXT NOT NULL, phone TEXT NOT NULL, contact TEXT, service_id INTEGER REFERENCES services(id),
 service_name TEXT NOT NULL, package_name TEXT NOT NULL, price NUMERIC(12,2) NOT NULL,
 brief TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
 payment_status TEXT NOT NULL DEFAULT 'unpaid', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS payments(
 id SERIAL PRIMARY KEY, order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 method TEXT NOT NULL, reference TEXT NOT NULL, amount NUMERIC(12,2) NOT NULL,
 paid_date DATE, paid_time TIME, reference_last6 TEXT, status TEXT NOT NULL DEFAULT 'pending', admin_note TEXT, submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(), reviewed_at TIMESTAMPTZ);
 ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_date DATE;
 ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_time TIME;
 ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_last6 TEXT;
`);
}
function validText(v,max){return typeof v==='string'&&v.trim().length>0&&v.trim().length<=max;}
app.post('/api/orders',rateLimit({windowMs:60*60*1000,limit:8,standardHeaders:true,legacyHeaders:false}),sameOrigin,async(req,res)=>{
 const b=req.body||{};if(!validText(b.customerName,120)||!validText(b.phone,40)||!validText(b.serviceName,160)||!validText(b.packageName,160)||!validText(b.brief,3000))return res.status(400).json({error:'အမည်၊ ဖုန်း၊ ဝန်ဆောင်မှု၊ package နှင့် လိုအပ်ချက်ကို ဖြည့်ပါ။'});
 try{
  if(!b.serviceId)return res.status(400).json({error:'Service ရွေးချယ်ပါ။'});
  const service=(await pool.query('SELECT * FROM services WHERE id=$1 AND active=true',[b.serviceId])).rows[0];
  if(!service)return res.status(400).json({error:'Service မတွေ့ပါ။'});
  const packages=typeof service.packages==='string'?JSON.parse(service.packages):service.packages;
  const pkg=packages.find(p=>p.name===b.packageName);
  if(!pkg)return res.status(400).json({error:'Package မတွေ့ပါ။'});
  const price=Number(pkg.price);if(!Number.isFinite(price)||price<0)return res.status(400).json({error:'Package ဈေးနှုန်းမမှန်ပါ။'});
  const serviceName=service.name;
  const code='HK-'+require('node:crypto').randomBytes(4).toString('hex').toUpperCase();
  const row=(await pool.query('INSERT INTO orders(order_code,customer_name,phone,contact,service_id,service_name,package_name,price,brief) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING order_code,created_at,status,payment_status',[code,b.customerName.trim(),b.phone.trim(),String(b.contact||'').slice(0,150),service?.id||null,serviceName,b.packageName.trim(),price,b.brief.trim()])).rows[0];
  res.status(201).json({message:'Order တင်ပြီးပါပြီ။ Order Code ကို သိမ်းထားပါ။',...row});
 }catch(e){res.status(500).json({error:'Order သိမ်းဆည်းမှု မအောင်မြင်ပါ။'});}
});
app.post('/api/orders/:code/payment',rateLimit({windowMs:60*60*1000,limit:10,standardHeaders:true,legacyHeaders:false}),sameOrigin,async(req,res)=>{
 const b=req.body||{};if(!validText(b.phone,40)||!validText(b.method,80)||!validText(b.reference,160)||!validText(b.referenceLast6,6)||!/^[0-9]{6}$/.test(b.referenceLast6)||!validText(b.paidDate,10)||!validText(b.paidTime,5)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(b.paidDate)||!/^[0-9]{2}:[0-9]{2}$/.test(b.paidTime))return res.status(400).json({error:'ဖုန်း၊ Payment Method၊ ငွေလွှဲသည့် ရက်စွဲ/အချိန်နှင့် Transaction Reference မှန်ကန်စွာဖြည့်ပါ။'});
 try{const order=(await pool.query('SELECT * FROM orders WHERE order_code=$1 AND phone=$2',[req.params.code,b.phone.trim()])).rows[0];if(!order)return res.status(404).json({error:'Order မတွေ့ပါ။'});if(order.payment_status==='paid')return res.status(409).json({error:'Payment အတည်ပြုပြီးဖြစ်ပါသည်။'});await pool.query('INSERT INTO payments(order_id,method,reference,amount,paid_date,paid_time,reference_last6) VALUES($1,$2,$3,$4,$5,$6,$7)',[order.id,b.method.trim(),b.reference.trim(),order.price,b.paidDate,b.paidTime,b.referenceLast6]);await pool.query("UPDATE orders SET payment_status='submitted',updated_at=now() WHERE id=$1",[order.id]);res.status(201).json({message:'Payment တင်ပြပြီးပါပြီ။ Admin စစ်ဆေးပြီး အတည်ပြုပါမည်။'});}catch{res.status(500).json({error:'Payment တင်ပြမှု မအောင်မြင်ပါ။'});}
});
app.get('/api/orders/:code',async(req,res)=>{const phone=String(req.query.phone||'').trim();if(!phone)return res.status(400).json({error:'Order စစ်ရန် ဖုန်းနံပါတ်လိုအပ်ပါသည်။'});try{const r=await pool.query('SELECT order_code,service_name,package_name,price,status,payment_status,created_at,updated_at FROM orders WHERE order_code=$1 AND phone=$2',[req.params.code,phone]);if(!r.rows[0])return res.status(404).json({error:'Order မတွေ့ပါ။'});res.json(r.rows[0]);}catch{res.status(500).json({error:'Order စစ်ဆေး၍မရပါ။'});}});
app.get('/api/admin/orders',requireAdmin,async(req,res)=>{try{res.json((await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 500')).rows);}catch{res.status(500).json({error:'Order list ရယူ၍မရပါ။'});}});
app.get('/api/admin/payments',requireAdmin,async(req,res)=>{try{res.json((await pool.query('SELECT p.*,o.order_code,o.customer_name,o.phone FROM payments p JOIN orders o ON o.id=p.order_id ORDER BY p.submitted_at DESC LIMIT 500')).rows);}catch{res.status(500).json({error:'Payment list ရယူ၍မရပါ။'});}});
app.patch('/api/admin/orders/:id/status',requireAdmin,sameOrigin,async(req,res)=>{const allowed=['pending','reviewing','approved','rejected','completed'];if(!allowed.includes(req.body.status))return res.status(400).json({error:'Status မမှန်ပါ။'});try{const r=await pool.query('UPDATE orders SET status=$1,updated_at=now() WHERE id=$2 RETURNING *',[req.body.status,req.params.id]);if(!r.rows[0])return res.status(404).json({error:'Order မတွေ့ပါ။'});res.json(r.rows[0]);}catch{res.status(500).json({error:'Order status ပြင်ဆင်၍မရပါ။'});}});
app.patch('/api/admin/payments/:id/review',requireAdmin,sameOrigin,async(req,res)=>{if(!['approved','rejected'].includes(req.body.status))return res.status(400).json({error:'Payment review status မမှန်ပါ။'});try{const result=await pool.query('UPDATE payments SET status=$1,admin_note=$2,reviewed_at=now() WHERE id=$3 RETURNING *',[req.body.status,String(req.body.note||'').slice(0,500),req.params.id]);if(!result.rows[0])return res.status(404).json({error:'Payment မတွေ့ပါ။'});if(req.body.status==='approved')await pool.query("UPDATE orders SET payment_status='paid',updated_at=now() WHERE id=$1",[result.rows[0].order_id]);else await pool.query("UPDATE orders SET payment_status='rejected',updated_at=now() WHERE id=$1",[result.rows[0].order_id]);res.json(result.rows[0]);}catch{res.status(500).json({error:'Payment review မအောင်မြင်ပါ။'});}});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
if(!process.env.DATABASE_URL||!SECRET||SECRET.length<32){console.warn('Database/admin secret configuration missing. Starting static preview mode; API data features remain unavailable until DATABASE_URL and JWT_SECRET are configured.');app.listen(PORT,()=>console.log('HTET KABAR static preview listening on '+PORT));}else{initialize().then(()=>ensureOrderTables()).then(()=>app.listen(PORT,()=>console.log('HTET KABAR API listening on '+PORT))).catch(e=>{console.error('Startup failed:',e.message);process.exit(1);});}
