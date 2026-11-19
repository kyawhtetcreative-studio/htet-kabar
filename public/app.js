const services = [
 {icon:'✦',name:'Graphic Design',desc:'Creative visuals, branding and design support for your business.'},
 {icon:'✈',name:'Telegram Service',desc:'Telegram-related setup, support and digital service requests.'},
 {icon:'✧',name:'AI Prompt & Image',desc:'AI-assisted prompts, image concepts and creative workflows.'},
 {icon:'▣',name:'Software Purchase',desc:'Software purchase guidance and license-related assistance.'},
 {icon:'↗',name:'Social Media Ads',desc:'Campaign setup and advertising support for your social platforms.'},
 {icon:'◎',name:'Boost Service',desc:'Social post and content promotion service requests.'},
 {icon:'⌘',name:'Other IT Services',desc:'Technology support and other digital service requirements.'},
 {icon:'▤',name:'Computer Training',desc:'Computer, design and digital skill learning support.'}
];
const grid=document.getElementById('serviceGrid');
services.forEach(s=>{const el=document.createElement('article');el.className='service-card';el.innerHTML=`<div class="service-icon">${s.icon}</div><h3>${s.name}</h3><p>${s.desc}</p><span class="learn">REQUEST SERVICE ↗</span>`;el.addEventListener('click',()=>alert(`${s.name}\n\nOrder submission and customer login will be connected in the next development phase.`));grid.appendChild(el)});
document.getElementById('adminServices').innerHTML=services.map((s,i)=>`<div class="admin-row"><span>${String(i+1).padStart(2,'0')} &nbsp; ${s.name}</span><span>Catalog preview</span></div>`).join('');
document.getElementById('adminToggle').addEventListener('click',()=>{const admin=document.getElementById('adminView'),customer=document.getElementById('customerView');const showing=admin.classList.contains('hidden');admin.classList.toggle('hidden');customer.classList.toggle('hidden');document.getElementById('adminToggle').textContent=showing?'Customer Preview':'Admin Preview';window.scrollTo({top:0,behavior:'smooth'});});
document.getElementById('year').textContent=new Date().getFullYear();
