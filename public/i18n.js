(function(root,factory){
'use strict';
const api=factory();
if(typeof module==='object'&&module.exports)module.exports=api;
if(root){root.HtetKabarI18n=api;if(root.document){let storage;try{storage=root.localStorage;}catch(_){}api.init(root.document,storage);}}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
// Only exact dictionary matches are translated; no external translation API is used.
const toEnglish=Object.freeze({
'ဂရပ်ဖစ်ဒီဇိုင်း':'Graphic Design',
'Logo၊ Poster၊ Banner၊ Social Media Design၊ Branding နှင့် ကြော်ငြာဒီဇိုင်းများ။':'Logo, poster, banner, social media design, branding and advertising design.',
'ဒီဇိုင်းတစ်ခု၊ ပြင်ဆင်မှု ၂ ကြိမ်':'One design with two revisions.',
'ဒီဇိုင်း ၂ မျိုး၊ ပြင်ဆင်မှု ၃ ကြိမ်':'Two design options with three revisions.',
'Premium creative နှင့် source file':'Premium creative work and source files.',
'Telegram ဝန်ဆောင်မှု':'Telegram Services',
'Telegram setup၊ channel/group စီမံမှုနှင့် အသုံးပြုမှုအကူအညီ။':'Telegram setup, channel/group management and usage support.',
'အခြေခံ setup အကူအညီ':'Basic setup assistance.',
'Channel setup နှင့် အခြေခံပြင်ဆင်မှု':'Channel setup and basic configuration.',
'AI Prompt၊ image concept၊ creative workflow နှင့် AI image အကူအညီ။':'AI prompts, image concepts, creative workflows and AI image assistance.',
'Prompt ၅ ခု':'Five prompts.',
'Concept နှင့် image output ၅ ခု':'Concept and five image outputs.',
'Software ဝယ်ယူရေး':'Software Purchasing',
'Software ရွေးချယ်မှု၊ ဝယ်ယူရေးနှင့် license အကူအညီ။':'Software selection, purchasing and licensing assistance.',
'ရွေးချယ်မှုနှင့် ဝယ်ယူရေး အကူအညီ':'Selection and purchasing assistance.',
'Facebook/Instagram ကြော်ငြာ campaign setup နှင့် စီမံမှု။':'Facebook/Instagram advertising campaign setup and management.',
'Campaign setup ဝန်ဆောင်ခ (Ad budget မပါ)':'Campaign setup fee (ad budget not included).',
'Campaign စီမံမှုဝန်ဆောင်ခ (Ad budget မပါ)':'Campaign management fee (ad budget not included).',
'Social media post promotion နှင့် boost စီမံမှု။':'Social media post promotion and boost management.',
'Setup ဝန်ဆောင်ခ (ကြော်ငြာဘတ်ဂျက် မပါ)':'Setup fee (advertising budget not included).',
'Custom promotion (ကြော်ငြာဘတ်ဂျက် မပါ)':'Custom promotion (advertising budget not included).',
'အခြား IT ဝန်ဆောင်မှု':'Other IT Services',
'Computer၊ Software၊ Internet နှင့် နည်းပညာပြဿနာများ အကူအညီ။':'Computer, software, internet and technical support.',
'အခြေခံ IT အကြံပေးဝန်ဆောင်မှု':'Basic IT consultation.',
'နည်းပညာပြဿနာ စစ်ဆေး/ဖြေရှင်း':'Technical troubleshooting and support.',
'Computer သင်တန်း':'Computer Training',
'Computer အခြေခံ၊ Graphic Design နှင့် Digital Skill သင်တန်းများ။':'Basic computer, graphic design and digital skills training.',
'သင်တန်းကြေး':'Course fee.',
'အခြေခံ Graphic Design သင်တန်း':'Graphic design starter course.',
'ကျပ်':'MMK',
'Request မအောင်မြင်ပါ။':'The request failed.',
'အော်ဒါတင်ရန် ↗':'Place order ↗',
'— အော်ဒါတင်ရန်':'— Place order',
'Package ရွေးပါ':'Choose a package',
'အမည်':'Name',
'ဖုန်းနံပါတ်':'Phone number',
'အခြားဆက်သွယ်ရန် (optional)':'Additional contact (optional)',
'လုပ်ငန်းအကြောင်း / လိုအပ်ချက်':'Project details / requirements',
'Order တင်မည်':'Submit order',
'တင်နေပါသည်...':'Submitting...',
'Order အောင်မြင်ပါပြီ။ Code:':'Order created successfully. Code:',
'Code ကို သိမ်းထားပါ။ Payment တင်ရန်':'Save this code. Submit payment:',
'Payment တင်ရန်':'Submit payment',
'(Server/Database မချိတ်ထားပါက Admin ကို ဆက်သွယ်ပါ။)':'(If the server or database is unavailable, contact the admin.)',
'Payment အကောင့်စာရင်းကို ယခုရယူ၍မရပါ။ Admin ကို ဆက်သွယ်ပါ။':'Unable to load payment accounts. Please contact the admin.',
'Payment အကောင့်ကို Admin မှ မသတ်မှတ်ရသေးပါ။ Admin ကို ဆက်သွယ်ပါ။':'Payment accounts have not been configured. Please contact the admin.',
'အကောင့်အမည်':'Account name',
'အကောင့်နံပါတ်':'Account number',
'နံပါတ်ကူးယူရန်':'Copy number',
'Payment တင်ပြရန်':'Submit payment',
'အသုံးပြုနိုင်သော Payment အကောင့် မရှိသေးပါ။ Admin ကို ဆက်သွယ်ပါ။':'No payment accounts are available. Please contact the admin.',
'အောက်ပါအကောင့်တစ်ခုခုသို့ ငွေလွှဲပြီး Transaction Reference ကို ဖြည့်ပါ။ Admin မှ ကိုယ်တိုင်စစ်ဆေးပြီး အတည်ပြုပါမည်။':'Transfer to one of the accounts below and enter the transaction reference. The admin will review it manually.',
'ပေးချေရန်:':'Amount due:',
'Order တင်ထားသော ဖုန်း':'Phone used for the order',
'ငွေပေးချေမှုနည်းလမ်း':'Payment method',
'ရွေးချယ်ပါ':'Select',
'ငွေလွှဲသည့် ရက်စွဲ':'Transfer date',
'ငွေလွှဲသည့် အချိန်':'Transfer time',
'ငွေလွှဲပြေစာ နောက်ဆုံး ၆ လုံး':'Last six digits on the receipt',
'ဥပမာ 123456':'For example, 123456',
'ငွေလွှဲပြေစာပုံ (optional · PNG/JPG/WebP · 1MB အောက်)':'Payment receipt image (optional · PNG/JPG/WebP · under 1 MB)',
'Payment အချက်အလက်တင်ရန်':'Submit payment details',
'PNG/JPG/WebP ပြေစာပုံ 1MB အောက်သာ တင်နိုင်ပါသည်။':'Only PNG/JPG/WebP receipt images under 1 MB are allowed.',
'ပြေစာပုံ ဖတ်၍မရပါ။':'Unable to read the receipt image.',
'စစ်ဆေးနေပါသည်...':'Checking...',
'Google Login အောင်မြင်ပါသည်။':'Google sign-in successful.',
'Login မအောင်မြင်ပါ။ ပြန်ကြိုးစားပါ။':'Sign-in failed. Please try again.',
'Admin ဝင်ရန် ↗':'Admin login ↗',
'Login အောင်မြင်ပါသည်။':'Login successful.',
'Payment Account အသစ်ထည့် / ပြင်ဆင်ရန်':'Add / edit payment account',
'ညွှန်ကြားချက် (optional)':'Instructions (optional)',
'ပြသမည့်အစီအစဉ်':'Display order',
'သိမ်းဆည်းရန်':'Save',
'အသစ်ပြန်စရန်':'Reset form',
'Payment Account မရှိသေးပါ။ Customer များ Payment တင်နိုင်ရန် အနည်းဆုံး Account တစ်ခု ထည့်ပါ။':'No payment accounts yet. Add at least one account so customers can submit payments.',
'Payment Account ကို ပြန်ဖွင့်မလား?':'Enable this payment account?',
'Payment Account ကို ပိတ်မလား?':'Disable this payment account?',
'Order မရှိသေးပါ။':'No orders yet.',
'· နောက်ဆုံး ၆ လုံး:':'· Last six digits:',
'ပြေစာကြည့်ရန်':'View receipt',
'Payment မရှိသေးပါ။':'No payments yet.',
'Admin မှတ်ချက် (optional)':'Admin note (optional)',
'Announcement စာတို':'Short announcement',
'Website ပြင်ဆင်ချက် သိမ်းရန်':'Save website changes',
'သိမ်းဆည်းပြီးပါပြီ။ Customer Website ကို refresh လုပ်ပါ။':'Saved. Refresh the customer website.',
'Service အသစ်ထည့် / ပြင်ဆင်ရန်':'Add / edit service',
'Service အမည်':'Service name',
'ဖော်ပြချက်':'Description',
'Packages JSON format မမှန်ပါ။':'The packages JSON format is invalid.',
'သိမ်းဆည်းပြီးပါပြီ။':'Saved successfully.',
'Service ကို ပိတ်မလား?':'Deactivate this service?',
'ကူးယူပြီးပါပြီ ✓':'Copied ✓',
'ကူးယူမရပါ — နံပါတ်ကို ဖိ၍ရွေးပါ':'Unable to copy — select the number manually.',
'Install option မပေါ်သေးပါ။ Chrome/Edge Menu မှ Install app သို့မဟုတ် Add to Home Screen ကို စမ်းပါ။':'Install is not available yet. Try Install app or Add to Home Screen from the Chrome/Edge menu.',
'ဝန်ဆောင်မှုများ':'Services',
'အော်ဒါတင်ရန်':'Place an order',
'ငွေပေးချေမှု / အော်ဒါစစ်ရန်':'Payments / Track order',
'မေးမြန်းဆက်သွယ်ရန်':'Contact',
'သင့်အကြံအစည်တွေကို':'Your ideas',
'အကောင်အထည်ဖော်ပါ။':'into reality.',
'ဒီဇိုင်း၊ Digital နဲ့ နည်းပညာဆိုင်ရာ ဝန်ဆောင်မှုများကို တစ်နေရာတည်းမှာ ရယူနိုင်ပါပြီ။ သင်လိုအပ်တာကို ရွေးချယ်ပြီး အော်ဒါတင်လိုက်ပါ။':'Get design, digital and technology services in one place. Choose what you need and place an order.',
'ဝန်ဆောင်မှုများ ကြည့်ရန် ↗':'Explore services ↗',
'တိကျသောလုပ်ငန်းစဉ် · တိုက်ရိုက်ဆက်သွယ်မှု · အရည်အသွေး':'Clear process · Direct communication · Quality',
'အကောင့်ဝင်ပြီး အသစ်များကို ကြည့်ရှုပါ':'Sign in to view updates',
'Google အကောင့်ဖြင့် ဝင်ရောက်ပြီး သင့်အကောင့်အချက်အလက်ကို စီမံနိုင်ပါသည်။':'Sign in with Google to manage your account information.',
'Google ဖြင့် Login ဝင်ရန် ↗':'Continue with Google ↗',
'သင့်အတွက် ဝန်ဆောင်မှုများ':'Services for you',
'ဝန်ဆောင်မှုရွေးချယ်၊ Package ကြည့်ရှု၊':'Choose a service and explore packages,',
'အော်ဒါတင်နိုင်ပါသည်။':'then place an order.',
'အော်ဒါတင်ခြင်းမှ ပေးအပ်ခြင်းအထိ':'From order to delivery',
'ဝန်ဆောင်မှုရွေးပါ':'Choose a service',
'သင့်လိုအပ်ချက်နှင့် ကိုက်ညီသော ဝန်ဆောင်မှုကို ရွေးချယ်ပါ။':'Choose a service that fits your needs.',
'အချက်အလက်ပေးပါ':'Provide your details',
'သင့်အမည်၊ ဖုန်းနှင့် လုပ်ငန်းအကြောင်းအရာ ဖြည့်ပါ။':'Enter your name, phone number and project details.',
'ငွေပေးချေမှု':'Payment',
'ငွေလွှဲပြီး Transaction အချက်အလက်တင်ပြပါ။ Admin မှ စစ်ဆေးပါမည်။':'Transfer the payment and submit the transaction details. The admin will review them.',
'အော်ဒါအခြေအနေကြည့်ပါ':'Track order status',
'Order Code နှင့် ဖုန်းနံပါတ်ဖြင့် ပြန်လည်စစ်ဆေးနိုင်ပါသည်။':'Check your order using the order code and phone number.',
'အော်ဒါအခြေအနေ စစ်ဆေးရန်':'Track your order',
'စစ်ဆေးရန်':'Check status',
'ငွေပေးချေမှု နည်းလမ်းများ':'Payment methods',
'Admin မှ ဖွင့်ထားသော အကောင့်များသို့ ငွေလွှဲပြီး Transaction Reference ဖြင့် Payment တင်ပြနိုင်ပါသည်။':'Transfer to an active account and submit payment with the transaction reference.',
'ငွေလွှဲပြီးပါက Order တင်ထားသော ဖုန်းနံပါတ်နှင့် Transaction Reference ကို ဖြည့်ပါ။ ငွေလက်ခံရရှိမှုကို Admin မှ ကိုယ်တိုင်စစ်ဆေးအတည်ပြုပါမည်။':'After transferring, enter the phone number used for the order and the transaction reference. The admin will manually verify receipt of funds.',
'Admin ကို ဆက်သွယ်ရန်':'Contact the admin',
'ဝန်ဆောင်မှု၊ Order နှင့် Payment အကြောင်း မေးမြန်းလိုပါက အောက်ပါလမ်းကြောင်းများမှ တိုက်ရိုက်ဆက်သွယ်နိုင်ပါသည်။':'For questions about services, orders or payments, contact us directly through the channels below.',
'Message ပို့ရန်':'Send a message',
'Admin ဖုန်းနံပါတ် ကူးယူရန်':'Copy admin phone number',
'ဝန်ဆောင်မှု၊ အော်ဒါနှင့် ငွေပေးချေမှုများကို စီမံရန်':'Manage services, orders and payments',
'Customer Website တွင် ပြသမည့် ငွေလက်ခံအကောင့်များကို စီမံပါ။':'Manage the receiving accounts displayed on the customer website.',
'စီမံခန့်ခွဲမှု':'CONTROL CENTER',
'Customer အကောင့်':'CUSTOMER ACCOUNT',
'ကျွန်ုပ်တို့လုပ်ဆောင်ပေးသော ဝန်ဆောင်မှုများ':'WHAT WE DO',
'လွယ်ကူသော လုပ်ငန်းစဉ်':'SIMPLE WORKFLOW',
'အော်ဒါအခြေအနေ စစ်ဆေးခြင်း':'ORDER TRACKING',
'ငွေပေးချေမှု နည်းလမ်းများ':'PAYMENT METHODS',
'ဆက်သွယ်ရန်နှင့် အကူအညီ':'CONTACT & SUPPORT',
'Digital ဝန်ဆောင်မှုများကို လွယ်ကူစွာ။':'Digital services, made simple.',
'အော်ဒါများ':'Orders',
'ငွေပေးချေမှုများ':'Payments',
'ငွေလက်ခံအကောင့်များ':'Payment Accounts',
'ဝန်ဆောင်မှုများနှင့် Package များ':'Services & Packages',
'Admin စီမံခန့်ခွဲမှု':'Admin Dashboard',
'ပြန်လည်ရယူရန်':'Refresh',
'ထွက်ရန်':'Logout',
'ပြင်ဆင်ရန်':'Edit',
'အသုံးပြုနေသည်':'Active',
'ပိတ်ထားသည်':'Disabled',
'အခြေခံ':'Basic',
'စံ':'Standard',
'အဆင့်မြင့်':'Premium',
'အော်ဒါ:':'Order:',
'ဝန်ဆောင်မှု:':'Service:',
'စျေးနှုန်း:':'Price:',
'အော်ဒါအခြေအနေ:':'Order status:',
'ငွေပေးချေမှု:':'Payment:',
'Admin ဝင်ရောက်ရန်':'Admin Login',
'စကားဝှက်':'Password',
'Admin အီးမေးလ်':'Admin Email',
'အော်ဒါကုဒ် (HK-...)':'Order Code (HK-...)',
'Login ကြိုးစားမှုများလွန်းပါသည်။ ၁၅ မိနစ်အကြာ ပြန်ကြိုးစားပါ။':'Too many login attempts. Please try again in 15 minutes.',
'Order စစ်ဆေးမှုများလွန်းပါသည်။ ၁၅ မိနစ်အကြာ ပြန်ကြိုးစားပါ။':'Too many order lookups. Please try again in 15 minutes.',
'Site settings မရပါ။':'Unable to load site settings.',
'စာသားအရှည်ကန့်သတ်ချက် ကျော်နေပါသည်။':'The text exceeds the allowed length.',
'ပုံ URL သည် HTTPS သို့မဟုတ် PNG/JPG/WebP Upload ဖြစ်ရပါမည်။':'The image must use an HTTPS URL or be a PNG/JPG/WebP upload.',
'ပုံအရွယ်အစား 1MB ထက်နည်းရပါမည်။':'The image must be smaller than 1 MB.',
'Settings သိမ်းဆည်းမရပါ။':'Unable to save settings.',
'Admin login ဝင်ရန်လိုအပ်ပါသည်။':'Admin sign-in is required.',
'Login session သက်တမ်းကုန်ပါပြီ။':'Your admin session has expired.',
'Origin header လိုအပ်ပါသည်။':'The Origin header is required.',
'Origin မမှန်ပါ။':'The Origin is invalid.',
'Cross-origin request ပိတ်ထားပါသည်။':'Cross-origin requests are not allowed.',
'Google Login ကို Admin က OAuth Credentials ထည့်ပြီးမှ ဖွင့်နိုင်ပါမည်။':'Google sign-in can be enabled after the admin configures OAuth credentials.',
'Customer login ဝင်ရန်လိုအပ်ပါသည်။':'Customer sign-in is required.',
'Customer session သက်တမ်းကုန်ပါပြီ။':'Your customer session has expired.',
'Customer account မတွေ့ပါ။':'Customer account not found.',
'Customer account ရယူမရပါ။':'Unable to load the customer account.',
'Service စာရင်းရယူ၍မရပါ။':'Unable to load services.',
'Payment account စာရင်း ရယူ၍မရပါ။':'Unable to load payment accounts.',
'Email နှင့် Password ဖြည့်ပါ။':'Enter your email and password.',
'Email သို့မဟုတ် Password မှားနေပါသည်။':'The email or password is incorrect.',
'Login လုပ်၍မရပါ။':'Unable to sign in.',
'Admin service list မရပါ။':'Unable to load the admin service list.',
'Slug ထပ်နေခြင်း သို့မဟုတ် သိမ်းဆည်းမှု မအောင်မြင်ပါ။':'The slug may already exist, or the save failed.',
'Service ID မမှန်ပါ။':'Invalid service ID.',
'Service မတွေ့ပါ။':'Service not found.',
'Update မအောင်မြင်ပါ။ Slug ထပ်နေခြင်း ဖြစ်နိုင်ပါသည်။':'Update failed. The slug may already exist.',
'Service ပိတ်၍မရပါ။':'Unable to deactivate the service.',
'ဤ Payment Method အတွက် Active Account ရှိပြီးဖြစ်သည်၊ သို့မဟုတ် အကောင့်ကို ထည့်သွင်းပြီးဖြစ်ပါသည်။':'An active account already exists for this payment method, or the account has already been added.',
'Payment account သိမ်းဆည်း၍မရပါ။':'Unable to save the payment account.',
'Payment account ID မမှန်ပါ။':'Invalid payment account ID.',
'Payment account မတွေ့ပါ။':'Payment account not found.',
'Payment account ပြင်ဆင်၍မရပါ။':'Unable to update the payment account.',
'Payment account ပိတ်၍မရပါ။':'Unable to disable the payment account.',
'အမည်၊ ဖုန်း၊ ဝန်ဆောင်မှု၊ package နှင့် လိုအပ်ချက်ကို ဖြည့်ပါ။':'Enter your name, phone number, service, package and requirements.',
'Service ရွေးချယ်ပါ။':'Choose a service.',
'Package မတွေ့ပါ။':'Package not found.',
'Package ဈေးနှုန်းမမှန်ပါ။':'Invalid package price.',
'Order တင်ပြီးပါပြီ။ Order Code ကို သိမ်းထားပါ။':'Order created. Keep your order code.',
'Order သိမ်းဆည်းမှု မအောင်မြင်ပါ။':'Unable to save the order.',
'Order မတွေ့ပါ။':'Order not found.',
'ရွေးချယ်ထားသော Payment Method အတွက် အသုံးပြုနိုင်သည့် အကောင့် မရှိသေးပါ။':'No active account is available for the selected payment method.',
'Payment အတည်ပြုပြီးဖြစ်ပါသည်။':'Payment has been approved.',
'Payment တင်ပြပြီး Admin စစ်ဆေးနေဆဲဖြစ်ပါသည်။':'Payment submitted and awaiting admin review.',
'Payment တင်ပြပြီးပါပြီ။ Admin စစ်ဆေးပြီး အတည်ပြုပါမည်။':'Payment submitted. The admin will review and verify it manually.',
'Payment တင်ပြမှု မအောင်မြင်ပါ။':'Payment submission failed.',
'Order Code ပုံစံမမှန်ပါ။':'Invalid order code format.',
'Order စစ်ရန် ဖုန်းနံပါတ်လိုအပ်ပါသည်။':'A phone number is required to track the order.',
'Order စစ်ဆေး၍မရပါ။':'Unable to track the order.',
'Order list ရယူ၍မရပါ။':'Unable to load orders.',
'Payment list ရယူ၍မရပါ။':'Unable to load payments.',
'Payment ID မမှန်ပါ။':'Invalid payment ID.',
'ပြေစာပုံ မတွေ့ပါ။':'Receipt image not found.',
'ပြေစာပုံ ရယူ၍မရပါ။':'Unable to retrieve the receipt image.',
'Order ID မမှန်ပါ။':'Invalid order ID.',
'Order Status မမှန်ပါ။':'Invalid order status.',
'Order အခြေအနေ ပြင်ဆင်၍မရပါ။':'Unable to update the order status.',
'Payment review status မမှန်ပါ။':'Invalid payment review status.',
'Payment မတွေ့ပါ။':'Payment not found.',
'Payment ကို အကြိမ်တစ်ကြိမ်သာ စစ်ဆေးနိုင်ပါသည်။':'This payment can only be reviewed once.',
'Payment review မအောင်မြင်ပါ။':'Payment review failed.',
'အတည်ပြုရန်':'Approve',
'ပယ်ချရန်':'Reject',
'ပိတ်ရန်':'Deactivate',
'ပြန်ဖွင့်ရန်':'Enable',
'ဆိုင်းငံ့':'pending',
'စစ်ဆေးနေဆဲ':'reviewing',
'အတည်ပြုပြီး':'approved',
'ပယ်ချပြီး':'rejected',
'ပြီးစီး':'completed',
'မပေးချေရသေး':'unpaid',
'တင်ပြပြီး':'submitted',
'ပေးချေပြီး':'paid',
'Website Logo / ကြေညာချက် / Post':'Website Logo / Announcement / Post',
'ဝန်ဆောင်မှုအမည်':'Service name',
'ငွေလက်ခံအကောင့်များ':'Payment Accounts',
'အော်ဒါများ':'Orders',
'ငွေပေးချေမှုများ':'Payments',
'App ထည့်သွင်းရန် ↓':'Install App ↓'
});
const toBurmese=Object.create(null);
Object.keys(toEnglish).forEach(function(key){const value=toEnglish[key];if(!Object.prototype.hasOwnProperty.call(toBurmese,value))toBurmese[value]=key;});
function normalizeLanguage(value){return String(value||'').toLowerCase()==='en'?'en':'my';}
function translateText(value,language){
 const source=String(value==null?'':value);
 const leading=(source.match(/^\s*/u)||[''])[0];
 const trailing=(source.match(/\s*$/u)||[''])[0];
 const core=source.slice(leading.length,source.length-trailing.length);
 if(!core)return source;
 const table=normalizeLanguage(language)==='en'?toEnglish:toBurmese;
 return leading+(table[core]||core)+trailing;
}
function formatCurrency(amount,language){
 return Number(amount||0).toLocaleString('en-US')+(normalizeLanguage(language)==='en'?' MMK':' ကျပ်');
}
function init(doc,storage){
 let current='my';
 try{current=normalizeLanguage(storage&&storage.getItem('htet-kabar-language'));}catch(_){}
 const textStates=new WeakMap(),attributeStates=new WeakMap();
 const attributes=['placeholder','title','aria-label','alt','content'];
 function skip(el){
  if(!el||el.nodeType!==1)return true;
  if(/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(el.tagName)||el.id==='languageToggle')return true;
  return Boolean(el.closest&&el.closest('[data-no-translate]'));
 }
 function textNode(node){
  if(!node||node.nodeType!==3||skip(node.parentElement))return;
  let state=textStates.get(node);
  if(!state){state={original:node.nodeValue,lastApplied:node.nodeValue};textStates.set(node,state);}
  else if(node.nodeValue!==state.lastApplied)state.original=node.nodeValue;
  const next=translateText(state.original,current);
  if(node.nodeValue!==next)node.nodeValue=next;
  state.lastApplied=next;
 }
 function element(el){
  if(skip(el))return;
  let states=attributeStates.get(el);
  if(!states){states=Object.create(null);attributeStates.set(el,states);}
  attributes.forEach(function(name){
   const value=el.getAttribute(name);if(value==null)return;
   let state=states[name];
   if(!state){state={original:value,lastApplied:value};states[name]=state;}
   else if(value!==state.lastApplied)state.original=value;
   const next=translateText(state.original,current);
   if(value!==next)el.setAttribute(name,next);
   state.lastApplied=next;
  });
 }
 function scan(rootNode){
  if(!rootNode)return;
  if(rootNode.nodeType===3){textNode(rootNode);return;}
  if(rootNode.nodeType===1)element(rootNode);
  const walker=doc.createTreeWalker(rootNode,5);
  let node;while((node=walker.nextNode())){if(node.nodeType===1)element(node);else if(node.nodeType===3)textNode(node);}
 }
 function toggleLabel(){
  const button=doc.getElementById('languageToggle');if(!button)return;
  button.textContent=current==='en'?'မြန်မာ':'English';
  button.setAttribute('aria-label',current==='en'?'Switch to Burmese':'Switch to English');
  button.setAttribute('aria-pressed',current==='en'?'true':'false');
 }
 function setLanguage(language){
  current=normalizeLanguage(language);
  try{if(storage)storage.setItem('htet-kabar-language',current);}catch(_){}
  doc.documentElement.lang=current;
  scan(doc.documentElement);
  const locale=doc.querySelector('meta[property="og:locale"]');
  if(locale)locale.setAttribute('content',current==='en'?'en_US':'my_MM');
  doc.title=current==='en'?'HTET KABAR — Digital Services':'HTET KABAR — ဒစ်ဂျစ်တယ်ဝန်ဆောင်မှုများ';
  toggleLabel();return current;
 }
 setLanguage(current);
 const view=doc.defaultView;
 if(view&&view.MutationObserver){
  const observer=new view.MutationObserver(function(records){
   records.forEach(function(record){
    if(record.type==='childList')record.addedNodes.forEach(scan);
    else if(record.type==='characterData')textNode(record.target);
    else if(record.type==='attributes')element(record.target);
   });
  });
  observer.observe(doc.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
 }
 return {getLanguage:function(){return current;},setLanguage:setLanguage,toggle:function(){return setLanguage(current==='en'?'my':'en');}};
}
return {normalizeLanguage:normalizeLanguage,translateText:translateText,formatCurrency:formatCurrency,init:init,translations:toEnglish};
});
