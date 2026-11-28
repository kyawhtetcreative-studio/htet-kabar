require('dotenv').config();

const express=require('express');
const path=require('node:path');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const {Pool}=require('pg');
const helmet=require('helmet');
const {rateLimit}=require('express-rate-limit');
const {checkDatabase}=require('./lib/health');
const {resolveTrustProxyHops}=require('./lib/proxy-settings');
const {parseCookieHeader,checkOrigin}=require('./lib/request-security');
const {validateServiceInput}=require('./lib/service-validation');
const {validatePaymentInput}=require('./lib/payment-validation');
const {validatePaymentAccountInput}=require('./lib/payment-account-validation');
const {validatePaymentReceipt}=require('./lib/payment-receipt');
const {validateOrderStatusTransition}=require('./lib/order-status');
const {runMigrations}=require('./lib/migrations');

const app=express();
app.set('trust proxy',resolveTrustProxyHops(process.env));
const PORT=Number(process.env.PORT||3000);
const SECRET=process.env.JWT_SECRET;
function databaseSslOptions(databaseUrl){
 if(!databaseUrl)return undefined;
 const url=databaseUrl.toLowerCase();
 const requiresSsl=url.includes('sslmode=require')||url.includes('sslmode=no-verify')||url.includes('supabase.co')||url.includes('neon.tech')||url.includes('render.com');
 return requiresSsl?{rejectUnauthorized:false}:undefined;
}
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:databaseSslOptions(process.env.DATABASE_URL)});
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'2mb'}));
app.use(express.static(path.join(__dirname,'public')));
app.use((req,res,next)=>{req.cookies=parseCookieHeader(req.headers.cookie);next();});
const loginLimit=rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:true,legacyHeaders:false,message:{error:'Login ကြိုးစားမှုများလွန်းပါသည်။ ၁၅ မိနစ်အကြာ ပြန်ကြိုးစားပါ။'}});
const orderTrackLimit=rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:true,legacyHeaders:false,message:{error:'Order စစ်ဆေးမှုများလွန်းပါသည်။ ၁၅ မိနစ်အကြာ ပြန်ကြိုးစားပါ။'}});
const seed=[
{name:'ဂရပ်ဖစ်ဒီဇိုင်း',slug:'graphic-design',icon:'✦',description:'Logo၊ Poster၊ Banner၊ Social Media Design၊ Branding နှင့် ကြော်ငြာဒီဇိုင်းများ။',packages:[{name:'Basic Design',price:25000,description:'ဒီဇိုင်းတစ်ခု၊ ပြင်ဆင်မှု ၂ ကြိမ်'},{name:'Standard Design',price:50000,description:'ဒီဇိုင်း ၂ မျိုး၊ ပြင်ဆင်မှု ၃ ကြိမ်'},{name:'Premium Design',price:100000,description:'Premium creative နှင့် source file'}]},
{name:'Telegram ဝန်ဆောင်မှု',slug:'telegram-service',icon:'✈',description:'Telegram setup၊ channel/group စီမံမှုနှင့် အသုံးပြုမှုအကူအညီ။',packages:[{name:'Basic Support',price:15000,description:'အခြေခံ setup အကူအညီ'},{name:'Channel Setup',price:30000,description:'Channel setup နှင့် အခြေခံပြင်ဆင်မှု'}]},
{name:'AI Prompt & Image',slug:'ai-prompt-image',icon:'✧',description:'AI Prompt၊ image concept၊ creative workflow နှင့် AI image အကူအညီ။',packages:[{name:'Prompt Pack',price:20000,description:'Prompt ၅ ခု'},{name:'Creative Image Pack',price:50000,description:'Concept နှင့် image output ၅ ခု'}]},
{name:'Software ဝယ်ယူရေး',slug:'software-purchase',icon:'▣',description:'Software ရွေးချယ်မှု၊ ဝယ်ယူရေးနှင့် license အကူအညီ။',packages:[{name:'Purchase Assistance',price:10000,description:'ရွေးချယ်မှုနှင့် ဝယ်ယူရေး အကူအညီ'}]},
{name:'Social Media Ads',slug:'social-media-ads',icon:'↗',description:'Facebook/Instagram ကြော်ငြာ campaign setup နှင့် စီမံမှု။',packages:[{name:'Campaign Setup',price:30000,description:'Campaign setup ဝန်ဆောင်ခ (Ad budget မပါ)'},{name:'Campaign Management',price:75000,description:'Campaign စီမံမှုဝန်ဆောင်ခ (Ad budget မပါ)'}]},
{name:'Boost Service',slug:'boost-service',icon:'◎',description:'Social media post promotion နှင့် boost စီမံမှု။',packages:[{name:'Promotion Setup',price:15000,description:'Setup ဝန်ဆောင်ခ (ကြော်ငြာဘတ်ဂျက် မပါ)'},{name:'Custom Boost',price:30000,description:'Custom promotion (ကြော်ငြာဘတ်ဂျက် မပါ)'}]},
{name:'အခြား IT ဝန်ဆောင်မှု',slug:'other-it-services',icon:'⌘',description:'Computer၊ Software၊ Internet နှင့် နည်းပညာပြဿနာများ အကူအညီ။',packages:[{name:'IT Consultation',price:15000,description:'အခြေခံ IT အကြံပေးဝန်ဆောင်မှု'},{name:'Technical Support',price:30000,description:'နည်းပညာပြဿနာ စစ်ဆေး/ဖြေရှင်း'}]},
{name:'Computer သင်တန်း',slug:'computer-training',icon:'▤',description:'Computer အခြေခံ၊ Graphic Design နှင့် Digital Skill သင်တန်းများ။',packages:[{name:'Basic Computer',price:50000,description:'သင်တန်းကြေး'},{name:'Graphic Design Starter',price:100000,description:'အခြေခံ Graphic Design သင်တန်း'}]}];
function validateRuntimeConfiguration(){
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL environment variable is required');
 if(!SECRET||SECRET.length<32)throw Error('JWT_SECRET must be set and at least 32 characters');
 if(process.env.ADMIN_PASSWORD&&process.env.ADMIN_PASSWORD.length<12)throw Error('ADMIN_PASSWORD must be at least 12 characters');
}
async function seedInitialData(){
 const n=Number((await pool.query('SELECT COUNT(*) FROM services')).rows[0].count);
 if(!n)for(const s of seed)await pool.query('INSERT INTO services(name,slug,icon,description,packages) VALUES($1,$2,$3,$4,$5)',[s.name,s.slug,s.icon,s.description,JSON.stringify(s.packages)]);
 if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD){
  const hash=await bcrypt.hash(process.env.ADMIN_PASSWORD,12);
  await pool.query('INSERT INTO admins(email,password_hash) VALUES($1,$2) ON CONFLICT(email) DO NOTHING',[process.env.ADMIN_EMAIL.toLowerCase(),hash]);
 }
}
app.get('/api/site-settings',async(req,res)=>{try{const rows=(await pool.query("SELECT key,value FROM site_settings WHERE key IN ('brand_name','logo_url','announcement','post_title','post_body','post_image_url')")).rows;res.json(Object.fromEntries(rows.map(x=>[x.key,x.value])));}catch{res.json({});}});
app.get('/api/admin/site-settings',requireAdmin,async(req,res)=>{try{const rows=(await pool.query('SELECT key,value FROM site_settings')).rows;res.json(Object.fromEntries(rows.map(x=>[x.key,x.value])));}catch{res.status(500).json({error:'Site settings မရပါ။'});}});
app.put('/api/admin/site-settings',requireAdmin,sameOrigin,async(req,res)=>{const keys=['brand_name','logo_url','announcement','post_title','post_body','post_image_url'];const values=req.body||{};for(const k of keys){const v=String(values[k]||'');if(v.length>(['logo_url','post_image_url'].includes(k)?1400000:k==='post_body'?5000:k==='announcement'?1000:500))return res.status(400).json({error:'စာသားအရှည်ကန့်သတ်ချက် ကျော်နေပါသည်။'});if(['logo_url','post_image_url'].includes(k)&&v&&!(/^https:\/\//i.test(v)||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(v)))return res.status(400).json({error:'ပုံ URL သည် HTTPS သို့မဟုတ် PNG/JPG/WebP Upload ဖြစ်ရပါမည်။'});if(['logo_url','post_image_url'].includes(k)&&v.startsWith('data:')&&v.length>1400000)return res.status(400).json({error:'ပုံအရွယ်အစား 1MB ထက်နည်းရပါမည်။'});}try{for(const k of keys)await pool.query('INSERT INTO site_settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()',[k,String(values[k]||'')]);res.json({ok:true});}catch{res.status(500).json({error:'Settings သိမ်းဆည်းမရပါ။'});}});
function requireAdmin(req,res,next){const token=req.cookies.hk_admin;if(!token)return res.status(401).json({error:'Admin login ဝင်ရန်လိုအပ်ပါသည်။'});try{req.admin=jwt.verify(token,SECRET);next();}catch{return res.status(401).json({error:'Login session သက်တမ်းကုန်ပါပြီ။'});}}
function sameOrigin(req,res,next){const check=checkOrigin(req.get('origin'),req.get('host'),req.protocol);if(!check.ok){const messages={missing:'Origin header လိုအပ်ပါသည်။',invalid:'Origin မမှန်ပါ။',mismatch:'Cross-origin request ပိတ်ထားပါသည်။'};return res.status(403).json({error:messages[check.reason]||'Origin မမှန်ပါ။'});}next();}
function publicService(s){return {...s,packages:typeof s.packages==='string'?JSON.parse(s.packages):s.packages};}

function auditServiceState(row){
 if(!row)return {};
 const packages=typeof row.packages==='string'?JSON.parse(row.packages):row.packages;
 return {
  name:row.name,slug:row.slug,icon:row.icon,description:row.description,
  active:Boolean(row.active),
  packages:Array.isArray(packages)?packages.map(item=>({name:item.name,description:item.description||'',price:item.price})):[],
 };
}
function auditPaymentAccountState(row){
 if(!row)return {};
 const compact=String(row.account_number||'').replace(/\s+/g,'');
 return {
  method:row.method,account_name:row.account_name,
  account_number_last4:compact.length>=4?compact.slice(-4):'***',
  instructions:row.instructions||'',active:Boolean(row.active),display_order:Number(row.display_order),
 };
}
async function runAdminTransaction(work){
 const client=await pool.connect();
 let open=false;
 try{
  await client.query('BEGIN');open=true;
  const result=await work(client);
  await client.query('COMMIT');open=false;
  return result;
 }catch(error){
  if(open){try{await client.query('ROLLBACK');}catch{}}
  throw error;
 }finally{client.release();}
}
async function insertAdminAuditLog(client,adminId,action,entityType,entityId,beforeState,afterState){
 await client.query(
  'INSERT INTO admin_audit_logs(admin_id,action,entity_type,entity_id,before_state,after_state,note) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)',
  [adminId,action,entityType,String(entityId),JSON.stringify(beforeState||{}),JSON.stringify(afterState||{}),'']
 );
}
function adminMutationError(status,message){const error=new Error(message);error.httpStatus=status;return error;}
function sendAdminMutationError(res,error,fallback,conflictMessage){
 if(error&&error.httpStatus)return res.status(error.httpStatus).json({error:error.message});
 if(error&&error.code==='23505')return res.status(409).json({error:conflictMessage});
 return res.status(500).json({error:fallback});
}

// Customer Google OAuth (credentials are supplied only through deployment environment variables)
const customerAuthLimit=rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:true,legacyHeaders:false});
function cookieOpts(maxAge){return `HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${process.env.NODE_ENV==='production'?'; Secure':''}`;}
app.get('/auth/google/start',customerAuthLimit,(req,res)=>{
 if(!process.env.GOOGLE_CLIENT_ID||!process.env.GOOGLE_CLIENT_SECRET||!process.env.GOOGLE_REDIRECT_URI)return res.status(503).send('Google Login ကို Admin က OAuth Credentials ထည့်ပြီးမှ ဖွင့်နိုင်ပါမည်။');
 const state=require('node:crypto').randomBytes(24).toString('hex');
 res.setHeader('Set-Cookie',`hk_oauth_state=${state}; ${cookieOpts(600)}`);
 const params=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,redirect_uri:process.env.GOOGLE_REDIRECT_URI,response_type:'code',scope:'openid email profile',state,prompt:'select_account'});
 res.redirect('https://accounts.google.com/o/oauth2/v2/auth?'+params.toString());
});
app.get('/auth/google/callback',customerAuthLimit,async(req,res)=>{
 const state=String(req.query.state||''),saved=req.cookies.hk_oauth_state||'',code=String(req.query.code||'');
 const cookieHeaders=[`hk_oauth_state=; ${cookieOpts(0)}`];
 if(!state||!saved||state!==saved||!code)return res.redirect('/?login=failed');
 try{
  const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,redirect_uri:process.env.GOOGLE_REDIRECT_URI,grant_type:'authorization_code'})});
  if(!tokenResponse.ok)return res.redirect('/?login=failed');
  const tokens=await tokenResponse.json();
  const userResponse=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+tokens.access_token}});
  if(!userResponse.ok)return res.redirect('/?login=failed');
  const profile=await userResponse.json();
  if(!profile.sub||!profile.email||profile.email_verified!==true)return res.redirect('/?login=failed');
  const customer=(await pool.query('INSERT INTO customers(provider,provider_id,email,name,avatar_url) VALUES($1,$2,$3,$4,$5) ON CONFLICT(provider,provider_id) DO UPDATE SET email=EXCLUDED.email,name=EXCLUDED.name,avatar_url=EXCLUDED.avatar_url,last_login_at=now() RETURNING id,provider,email,name,avatar_url',[ 'google',String(profile.sub),String(profile.email).toLowerCase(),String(profile.name||''),String(profile.picture||'')])).rows[0];
  const token=jwt.sign({customerId:customer.id,provider:customer.provider,email:customer.email},SECRET,{expiresIn:'7d'});
  cookieHeaders.push(`hk_customer=${encodeURIComponent(token)}; ${cookieOpts(604800)}`);res.setHeader('Set-Cookie',cookieHeaders);
  res.redirect('/?login=success');
 }catch(e){res.redirect('/?login=failed');}
});
function requireCustomer(req,res,next){const token=req.cookies.hk_customer;if(!token)return res.status(401).json({error:'Customer login ဝင်ရန်လိုအပ်ပါသည်။'});try{req.customer=jwt.verify(token,SECRET);next();}catch{return res.status(401).json({error:'Customer session သက်တမ်းကုန်ပါပြီ။'});}}
app.get('/api/customer/me',requireCustomer,async(req,res)=>{try{const c=(await pool.query('SELECT id,provider,email,name,avatar_url FROM customers WHERE id=$1',[req.customer.customerId])).rows[0];if(!c)return res.status(401).json({error:'Customer account မတွေ့ပါ။'});res.setHeader('Cache-Control','no-store');res.json(c);}catch{res.status(500).json({error:'Customer account ရယူမရပါ။'});}});
app.post('/api/customer/logout',sameOrigin,(req,res)=>{res.setHeader('Set-Cookie',`hk_customer=; ${cookieOpts(0)}`);res.setHeader('Cache-Control','no-store');res.json({ok:true});});

app.get('/api/health',async(req,res)=>{const health=await checkDatabase(pool);res.status(health.status).json(health.body);});
app.get('/api/services',async(req,res)=>{try{const result=await pool.query('SELECT * FROM services WHERE active=true ORDER BY id');res.json(result.rows.map(publicService));}catch(e){res.status(500).json({error:'Service စာရင်းရယူ၍မရပါ။'});}});
app.get('/api/payment-accounts',async(req,res)=>{try{const result=await pool.query('SELECT id,method,account_name,account_number,instructions,display_order FROM payment_accounts WHERE active=true ORDER BY display_order,id');res.json(result.rows);}catch{res.status(500).json({error:'Payment account စာရင်း ရယူ၍မရပါ။'});}});
app.post('/api/admin/login',sameOrigin,loginLimit,async(req,res)=>{try{const email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||'');if(!email||!password)return res.status(400).json({error:'Email နှင့် Password ဖြည့်ပါ။'});const admin=(await pool.query('SELECT * FROM admins WHERE lower(btrim(email))=$1',[email])).rows[0];if(!admin||!(await bcrypt.compare(password,admin.password_hash)))return res.status(401).json({error:'Email သို့မဟုတ် Password မှားနေပါသည်။'});const token=jwt.sign({adminId:admin.id,email:admin.email},SECRET,{expiresIn:'8h'});res.setHeader('Set-Cookie',`hk_admin=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV==='production'?'; Secure':''}`);res.json({ok:true,email:admin.email});}catch(e){res.status(500).json({error:'Login လုပ်၍မရပါ။'});}});
app.post('/api/admin/logout',sameOrigin,(req,res)=>{res.setHeader('Set-Cookie',`hk_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${process.env.NODE_ENV==='production'?'; Secure':''}`);res.setHeader('Cache-Control','no-store');res.json({ok:true});});
app.get('/api/admin/me',requireAdmin,(req,res)=>res.json({ok:true,email:req.admin.email}));
app.get('/api/admin/services',requireAdmin,async(req,res)=>{try{res.json((await pool.query('SELECT * FROM services ORDER BY id')).rows.map(publicService));}catch{res.status(500).json({error:'Admin service list မရပါ။'});}});

app.post('/api/admin/services',requireAdmin,sameOrigin,async(req,res)=>{
 const validation=validateServiceInput(req.body);
 if(!validation.ok)return res.status(400).json({error:validation.error});
 const value=validation.value;
 try{
  const row=await runAdminTransaction(async client=>{
   const result=await client.query('INSERT INTO services(name,slug,icon,description,active,packages) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[value.name,value.slug,value.icon,value.description,value.active,JSON.stringify(value.packages)]);
   const created=result.rows[0];
   await insertAdminAuditLog(client,req.admin.adminId,'service.created','service',created.id,{},auditServiceState(created));
   return created;
  });
  return res.status(201).json(publicService(row));
 }catch(error){
  return sendAdminMutationError(res,error,'Service သိမ်းဆည်းမှု မအောင်မြင်ပါ။','Slug ထပ်နေခြင်း ဖြစ်နိုင်ပါသည်။');
 }
});
app.put('/api/admin/services/:id',requireAdmin,sameOrigin,async(req,res)=>{
 const validation=validateServiceInput(req.body);
 if(!validation.ok)return res.status(400).json({error:validation.error});
 const value=validation.value,id=Number(req.params.id);
 if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'Service ID မမှန်ပါ။'});
 try{
  const row=await runAdminTransaction(async client=>{
   const current=(await client.query('SELECT * FROM services WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!current)throw adminMutationError(404,'Service မတွေ့ပါ။');
   const before=auditServiceState(current);
   const updated=(await client.query('UPDATE services SET name=$1,slug=$2,icon=$3,description=$4,active=$5,packages=$6 WHERE id=$7 RETURNING *',[value.name,value.slug,value.icon,value.description,value.active,JSON.stringify(value.packages),id])).rows[0];
   const after=auditServiceState(updated);
   if(JSON.stringify(before)!==JSON.stringify(after)){
    await insertAdminAuditLog(client,req.admin.adminId,'service.updated','service',id,before,after);
   }
   return updated;
  });
  return res.json(publicService(row));
 }catch(error){
  return sendAdminMutationError(res,error,'Service ပြင်ဆင်၍မရပါ။','Slug ထပ်နေခြင်း ဖြစ်နိုင်ပါသည်။');
 }
});
app.delete('/api/admin/services/:id',requireAdmin,sameOrigin,async(req,res)=>{
 const id=Number(req.params.id);
 if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'Service ID မမှန်ပါ။'});
 try{
  const result=await runAdminTransaction(async client=>{
   const current=(await client.query('SELECT * FROM services WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!current)throw adminMutationError(404,'Service မတွေ့ပါ။');
   if(!current.active)return {unchanged:true};
   const updated=(await client.query('UPDATE services SET active=false WHERE id=$1 RETURNING *',[id])).rows[0];
   await insertAdminAuditLog(client,req.admin.adminId,'service.disabled','service',id,auditServiceState(current),auditServiceState(updated));
   return {unchanged:false};
  });
  return res.json({ok:true,...result});
 }catch(error){
  return sendAdminMutationError(res,error,'Service ပိတ်၍မရပါ။','Service ပိတ်၍မရပါ။');
 }
});

app.get('/api/admin/payment-accounts',requireAdmin,async(req,res)=>{try{res.json((await pool.query('SELECT id,method,account_name,account_number,instructions,active,display_order,created_at,updated_at FROM payment_accounts ORDER BY display_order,id')).rows);}catch{res.status(500).json({error:'Payment account စာရင်း ရယူ၍မရပါ။'});}});

app.post('/api/admin/payment-accounts',requireAdmin,sameOrigin,async(req,res)=>{
 const validation=validatePaymentAccountInput(req.body);
 if(!validation.ok)return res.status(400).json({error:validation.error});
 const value=validation.value;
 try{
  const row=await runAdminTransaction(async client=>{
   const result=await client.query('INSERT INTO payment_accounts(method,account_name,account_number,instructions,active,display_order) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,method,account_name,account_number,instructions,active,display_order,created_at,updated_at',[value.method,value.accountName,value.accountNumber,value.instructions,value.active,value.displayOrder]);
   const created=result.rows[0];
   await insertAdminAuditLog(client,req.admin.adminId,'payment_account.created','payment_account',created.id,{},auditPaymentAccountState(created));
   return created;
  });
  return res.status(201).json(row);
 }catch(error){
  return sendAdminMutationError(res,error,'Payment account သိမ်းဆည်း၍မရပါ။','ဤ Payment Method အတွက် Active Account ရှိပြီးဖြစ်သည်၊ သို့မဟုတ် အကောင့်ကို ထည့်သွင်းပြီးဖြစ်ပါသည်။');
 }
});
app.put('/api/admin/payment-accounts/:id',requireAdmin,sameOrigin,async(req,res)=>{
 const id=Number(req.params.id);
 if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'Payment account ID မမှန်ပါ။'});
 const validation=validatePaymentAccountInput(req.body);
 if(!validation.ok)return res.status(400).json({error:validation.error});
 const value=validation.value;
 try{
  const row=await runAdminTransaction(async client=>{
   const current=(await client.query('SELECT id,method,account_name,account_number,instructions,active,display_order,created_at,updated_at FROM payment_accounts WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!current)throw adminMutationError(404,'Payment account မတွေ့ပါ။');
   const changed=current.method!==value.method||current.account_name!==value.accountName||current.account_number!==value.accountNumber||current.instructions!==value.instructions||Boolean(current.active)!==value.active||Number(current.display_order)!==value.displayOrder;
   if(!changed)return current;
   const updated=(await client.query('UPDATE payment_accounts SET method=$1,account_name=$2,account_number=$3,instructions=$4,active=$5,display_order=$6,updated_at=now() WHERE id=$7 RETURNING id,method,account_name,account_number,instructions,active,display_order,created_at,updated_at',[value.method,value.accountName,value.accountNumber,value.instructions,value.active,value.displayOrder,id])).rows[0];
   await insertAdminAuditLog(client,req.admin.adminId,'payment_account.updated','payment_account',id,auditPaymentAccountState(current),auditPaymentAccountState(updated));
   return updated;
  });
  return res.json(row);
 }catch(error){
  return sendAdminMutationError(res,error,'Payment account ပြင်ဆင်၍မရပါ။','ဤ Payment Method အတွက် Active Account ရှိပြီးဖြစ်သည်၊ သို့မဟုတ် အကောင့်ကို ထည့်သွင်းပြီးဖြစ်ပါသည်။');
 }
});
app.delete('/api/admin/payment-accounts/:id',requireAdmin,sameOrigin,async(req,res)=>{
 const id=Number(req.params.id);
 if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'Payment account ID မမှန်ပါ။'});
 try{
  const result=await runAdminTransaction(async client=>{
   const current=(await client.query('SELECT id,method,account_name,account_number,instructions,active,display_order,created_at,updated_at FROM payment_accounts WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!current)throw adminMutationError(404,'Payment account မတွေ့ပါ။');
   if(!current.active)return {unchanged:true};
   const updated=(await client.query('UPDATE payment_accounts SET active=false,updated_at=now() WHERE id=$1 RETURNING id,method,account_name,account_number,instructions,active,display_order,created_at,updated_at',[id])).rows[0];
   await insertAdminAuditLog(client,req.admin.adminId,'payment_account.disabled','payment_account',id,auditPaymentAccountState(current),auditPaymentAccountState(updated));
   return {unchanged:false};
  });
  return res.json({ok:true,...result});
 }catch(error){
  return sendAdminMutationError(res,error,'Payment account ပိတ်၍မရပါ။','Payment account ပိတ်၍မရပါ။');
 }
});

// Customer orders and manual payment review
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
 const validation=validatePaymentInput(req.body);
 if(!validation.ok)return res.status(400).json({error:validation.error});
 const b=validation.value;
 const receiptValidation=validatePaymentReceipt(req.body?.receiptDataUrl);
 if(!receiptValidation.ok)return res.status(400).json({error:receiptValidation.error});
 const receipt=receiptValidation.value;
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const order=(await client.query('SELECT * FROM orders WHERE order_code=$1 AND phone=$2 FOR UPDATE',[req.params.code,b.phone.trim()])).rows[0];
  if(!order){await client.query('ROLLBACK');return res.status(404).json({error:'Order မတွေ့ပါ။'});}
  const activeAccount=(await client.query('SELECT id FROM payment_accounts WHERE method=$1 AND active=true LIMIT 1',[b.method])).rows[0];
  if(!activeAccount){await client.query('ROLLBACK');return res.status(400).json({error:'ရွေးချယ်ထားသော Payment Method အတွက် အသုံးပြုနိုင်သည့် အကောင့် မရှိသေးပါ။'});}
  if(order.payment_status==='paid'){await client.query('ROLLBACK');return res.status(409).json({error:'Payment အတည်ပြုပြီးဖြစ်ပါသည်။'});}
  const pending=(await client.query("SELECT id FROM payments WHERE order_id=$1 AND status='pending' LIMIT 1",[order.id])).rows[0];
  if(pending){await client.query('ROLLBACK');return res.status(409).json({error:'Payment တင်ပြပြီး Admin စစ်ဆေးနေဆဲဖြစ်ပါသည်။'});}
  await client.query('INSERT INTO payments(order_id,method,reference,amount,paid_date,paid_time,reference_last6,receipt_mime_type,receipt_data,receipt_size) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[order.id,b.method.trim(),(b.reference||'').trim(),order.price,b.paidDate,b.paidTime,b.referenceLast6,receipt?.mimeType||null,receipt?.data||null,receipt?.size||null]);
  await client.query("UPDATE orders SET payment_status='submitted',updated_at=now() WHERE id=$1",[order.id]);
  await client.query('COMMIT');
  res.status(201).json({message:'Payment တင်ပြပြီးပါပြီ။ Admin စစ်ဆေးပြီး အတည်ပြုပါမည်။'});
 }catch(e){
  await client.query('ROLLBACK');
  res.status(500).json({error:'Payment တင်ပြမှု မအောင်မြင်ပါ။'});
 }finally{client.release();}
});
app.get('/api/orders/:code',orderTrackLimit,async(req,res)=>{const code=String(req.params.code||'').trim().toUpperCase(),phone=String(req.query.phone||'').trim();if(!/^HK-[A-F0-9]{8}$/.test(code))return res.status(400).json({error:'Order Code ပုံစံမမှန်ပါ။'});if(!validText(phone,40))return res.status(400).json({error:'Order စစ်ရန် ဖုန်းနံပါတ်လိုအပ်ပါသည်။'});try{const r=await pool.query('SELECT order_code,service_name,package_name,price,status,payment_status,created_at,updated_at FROM orders WHERE order_code=$1 AND phone=$2',[code,phone]);if(!r.rows[0])return res.status(404).json({error:'Order မတွေ့ပါ။'});res.json(r.rows[0]);}catch{res.status(500).json({error:'Order စစ်ဆေး၍မရပါ။'});}});
app.get('/api/admin/orders',requireAdmin,async(req,res)=>{try{res.json((await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 500')).rows);}catch{res.status(500).json({error:'Order list ရယူ၍မရပါ။'});}});
app.get('/api/admin/payments',requireAdmin,async(req,res)=>{try{res.json((await pool.query('SELECT p.id,p.order_id,p.method,p.reference,p.amount,p.paid_date,p.paid_time,p.reference_last6,p.status,p.admin_note,p.submitted_at,p.reviewed_at,(p.receipt_data IS NOT NULL) AS has_receipt,o.order_code,o.customer_name,o.phone FROM payments p JOIN orders o ON o.id=p.order_id ORDER BY p.submitted_at DESC LIMIT 500')).rows);}catch{res.status(500).json({error:'Payment list ရယူ၍မရပါ။'});}});
app.get('/api/admin/audit-logs',requireAdmin,async(req,res)=>{
 const rawLimit=req.query.limit;
 const limit=rawLimit===undefined?50:Number(rawLimit);
 if(!Number.isSafeInteger(limit)||limit<1||limit>100)return res.status(400).json({error:'မှတ်တမ်းအရေအတွက် မမှန်ပါ။'});
 try{
  const result=await pool.query('SELECT l.id,l.admin_id,a.email AS admin_email,l.action,l.entity_type,l.entity_id,l.before_state,l.after_state,l.note,l.created_at FROM admin_audit_logs l LEFT JOIN admins a ON a.id=l.admin_id ORDER BY l.id DESC LIMIT $1',[limit]);
  res.setHeader('Cache-Control','private, no-store');
  res.json(result.rows);
 }catch{
  res.status(500).json({error:'စီမံခန့်ခွဲမှု မှတ်တမ်း ရယူ၍မရပါ။'});
 }
});
app.get('/api/admin/payments/:id/receipt',requireAdmin,async(req,res)=>{const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'Payment ID မမှန်ပါ။'});try{const row=(await pool.query('SELECT receipt_mime_type,receipt_data FROM payments WHERE id=$1',[id])).rows[0];const extensions={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};const extension=extensions[row?.receipt_mime_type];if(!row?.receipt_data||!extension)return res.status(404).json({error:'ပြေစာပုံ မတွေ့ပါ။'});const data=Buffer.isBuffer(row.receipt_data)?row.receipt_data:Buffer.from(row.receipt_data);res.setHeader('Content-Type',row.receipt_mime_type);res.setHeader('Content-Length',String(data.length));res.setHeader('Content-Disposition','inline; filename="payment-receipt-'+id+'.'+extension+'"');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Security-Policy',"default-src 'none'; sandbox");return res.status(200).send(data);}catch{return res.status(500).json({error:'ပြေစာပုံ ရယူ၍မရပါ။'});}});
app.patch('/api/admin/orders/:id/status',requireAdmin,sameOrigin,async(req,res)=>{
 const id=String(req.params.id||'').trim();
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return res.status(400).json({error:'Order ID မမှန်ပါ။'});
 const nextStatus=req.body?.status;
 if(typeof nextStatus!=='string')return res.status(400).json({error:'Order Status မမှန်ပါ။'});
 const client=await pool.connect();
 let transactionOpen=false;
 try{
  await client.query('BEGIN');
  transactionOpen=true;
  const order=(await client.query('SELECT id,status,payment_status FROM orders WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!order){await client.query('ROLLBACK');transactionOpen=false;return res.status(404).json({error:'Order မတွေ့ပါ။'});}
  const transition=validateOrderStatusTransition(order.status,nextStatus,order.payment_status);
  if(!transition.ok){await client.query('ROLLBACK');transactionOpen=false;return res.status(transition.code).json({error:transition.error});}
  if(transition.unchanged){await client.query('COMMIT');transactionOpen=false;return res.json({ok:true,id:order.id,status:order.status,unchanged:true});}
  const updated=(await client.query('UPDATE orders SET status=$1,updated_at=now() WHERE id=$2 RETURNING id,status,payment_status,updated_at',[transition.value,id])).rows[0];
  await client.query('INSERT INTO admin_audit_logs(admin_id,action,entity_type,entity_id,before_state,after_state,note) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)',[req.admin.adminId,'order.status_changed','order',String(id),JSON.stringify({status:order.status,payment_status:order.payment_status}),JSON.stringify({status:updated.status,payment_status:updated.payment_status}),'']);
  await client.query('COMMIT');
  transactionOpen=false;
  return res.json(updated);
 }catch{
  if(transactionOpen){try{await client.query('ROLLBACK');}catch{}}
  return res.status(500).json({error:'Order အခြေအနေ ပြင်ဆင်၍မရပါ။'});
 }finally{client.release();}
});
app.patch('/api/admin/payments/:id/review',requireAdmin,sameOrigin,async(req,res)=>{
 const id=Number(req.params.id);
 if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'Payment ID မမှန်ပါ။'});
 const body=req.body;
 if(!body||typeof body!=='object'||Array.isArray(body)||!['approved','rejected'].includes(body.status))return res.status(400).json({error:'Payment review status မမှန်ပါ။'});
 const note=body.note===undefined?'':body.note;
 if(typeof note!=='string'||note.length>500||/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(note))return res.status(400).json({error:'Admin မှတ်ချက်သည် စာသား ၅၀၀ လုံးအောက် ဖြစ်ရပါမည်။'});
 const normalizedNote=note.trim();
 const client=await pool.connect();
 let transactionOpen=false;
 try{
  await client.query('BEGIN');transactionOpen=true;
  const payment=(await client.query('SELECT * FROM payments WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!payment){await client.query('ROLLBACK');transactionOpen=false;return res.status(404).json({error:'Payment မတွေ့ပါ။'});}
  if(payment.status!=='pending'){await client.query('ROLLBACK');transactionOpen=false;return res.status(409).json({error:'Payment ကို အကြိမ်တစ်ကြိမ်သာ စစ်ဆေးနိုင်ပါသည်။'});}
  const order=(await client.query('SELECT id,payment_status FROM orders WHERE id=$1 FOR UPDATE',[payment.order_id])).rows[0];
  if(!order){await client.query('ROLLBACK');transactionOpen=false;return res.status(404).json({error:'Order မတွေ့ပါ။'});}
  const result=(await client.query("UPDATE payments SET status=$1,admin_note=$2,reviewed_at=now() WHERE id=$3 AND status='pending' RETURNING id,order_id,method,reference,amount,paid_date,paid_time,reference_last6,status,admin_note,submitted_at,reviewed_at,(receipt_data IS NOT NULL) AS has_receipt",[body.status,normalizedNote,id])).rows[0];
  const updatedOrder=(await client.query("UPDATE orders SET payment_status=$1,updated_at=now() WHERE id=$2 RETURNING payment_status",[body.status==='approved'?'paid':'rejected',payment.order_id])).rows[0];
  await client.query('INSERT INTO admin_audit_logs(admin_id,action,entity_type,entity_id,before_state,after_state,note) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)',[req.admin.adminId,'payment.reviewed','payment',String(id),JSON.stringify({status:payment.status,order_payment_status:order.payment_status}),JSON.stringify({status:result.status,order_payment_status:updatedOrder.payment_status}),normalizedNote]);
  await client.query('COMMIT');transactionOpen=false;res.json(result);
 }catch{
  if(transactionOpen){try{await client.query('ROLLBACK');}catch{}}
  res.status(500).json({error:'Payment review မအောင်မြင်ပါ။'});
 }finally{client.release();}
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
if(!process.env.DATABASE_URL||!SECRET||SECRET.length<32){console.error('Startup failed: DATABASE_URL and JWT_SECRET must be configured.');process.exit(1);}else{initialize().then(()=>ensureOrderTables()).then(()=>runMigrations(pool)).then(result=>{if(result.applied.length)console.log('Applied database migrations: '+result.applied.join(', '));console.log('Database migrations verified ('+result.applied.length+' applied, '+result.skipped.length+' already applied).');}).then(()=>app.listen(PORT,()=>console.log('HTET KABAR API listening on '+PORT))).catch(e=>{console.error('Startup failed:',e.message);process.exit(1);});}
try{
 validateRuntimeConfiguration();
 runMigrations(pool)
  .then(result=>{
   if(result.applied.length)console.log('Applied database migrations: '+result.applied.join(', '));
   console.log('Database migrations verified ('+result.applied.length+' applied, '+result.skipped.length+' already applied).');
  })
  .then(()=>seedInitialData())
  .then(()=>app.listen(PORT,()=>console.log('HTET KABAR API listening on '+PORT)))
  .catch(error=>{console.error('Startup failed:',error.message);process.exit(1);});
}catch(error){
 console.error('Startup failed:',error.message);
 process.exit(1);
}
