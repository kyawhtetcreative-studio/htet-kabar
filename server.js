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
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
initialize().then(()=>app.listen(PORT,()=>console.log('HTET KABAR API listening on '+PORT))).catch(e=>{console.error('Startup failed:',e.message);process.exit(1);});
