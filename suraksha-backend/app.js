const API_URL = 'http://localhost:3000/api';

// ===== STATE =====
let SERVICES = [];
let SOS_MESSAGES = [];
let selectedService = null;
let currentUser = null;
let userLocation = null;
let sosActive = false;
let fakeSOSCount = 0;

// ===== INIT =====
window.onload = async () => {
  const stored = localStorage.getItem('suraksha_user');
  if(stored) {
    currentUser = JSON.parse(stored);
    loginSuccess(currentUser);
  }
  
  try {
    // Fetch common data from backend
    const [servicesRes, messagesRes] = await Promise.all([
      fetch(`${API_URL}/services`),
      fetch(`${API_URL}/sos/messages`)
    ]);
    
    if(servicesRes.ok) SERVICES = await servicesRes.json();
    if(messagesRes.ok) SOS_MESSAGES = await messagesRes.json();
    
    // If logged in, render the services we just fetched
    if(currentUser) renderServices();
  } catch (err) {
    console.error('Failed to grab backend data', err);
    showToast('Failed to connect to backend.');
  }
};

// ===== RENDER SERVICES =====
function renderServices() {
  const grid = document.getElementById('servicesGrid');
  grid.innerHTML = SERVICES.map(s => `
    <div class="service-card" id="sc-${s.id}"
         style="--card-color:${s.color};--card-bg:${s.bg};--card-shadow:${s.shadow};"
         onclick="selectService('${s.id}')">
      <div class="badge"></div>
      <span class="icon">${s.icon}</span>
      <div class="name">${s.name}</div>
      <div class="desc">${s.desc}</div>
    </div>
  `).join('');
}

// ===== SELECT SERVICE =====
function selectService(id) {
  selectedService = SERVICES.find(s => s.id === id);
  if (!selectedService) return;
  
  document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('sc-'+id).classList.add('selected');
  document.getElementById('sosHint').textContent = `Ready: ${selectedService.icon} ${selectedService.name} emergency`;

  // Show/hide first aid
  document.getElementById('firstAidSection').style.display = selectedService.injury ? 'block' : 'none';

  // Show nearby services
  showNearby(id);

  showToast(`${selectedService.icon} ${selectedService.name} selected`);
}

// ===== SHOW NEARBY =====
async function showNearby(serviceId) {
  try {
    const res = await fetch(`${API_URL}/nearby/${serviceId}`);
    if (!res.ok) throw new Error('Failed to fetch nearby');
    const items = await res.json();
    
    const section = document.getElementById('nearbySection');
    const list = document.getElementById('nearbyList');
    
    if(!items || items.length === 0) { 
        section.style.display='none'; 
        return; 
    }
    
    list.innerHTML = items.map(item => `
      <div class="nearby-item">
        <span class="ni-icon">${item.icon}</span>
        <div class="ni-info">
          <div class="ni-name">${item.name}</div>
          <div class="ni-addr">${item.addr}</div>
        </div>
        <span class="ni-dist">📍 ${item.dist}</span>
        <button class="ni-call" onclick="callNumber('${item.phone}')">📞 Call</button>
      </div>
    `).join('');
    section.style.display = 'block';
  } catch (err) {
    console.error('Nearby error:', err);
  }
}

function callNumber(num) {
  window.location.href = 'tel:' + num;
}

// ===== SOS =====
async function triggerSOS() {
  if(sosActive) return;

  // Fake SOS detection
  fakeSOSCount++;
  if(fakeSOSCount > 3) {
    showToast('⚠️ Warning: Repeated false SOS may incur penalties.');
    return;
  }

  sosActive = true;
  const btn = document.getElementById('sosBtn');
  btn.classList.add('triggered');

  // Sound (beep via AudioContext)
  playAlarm();

  // Reset UI
  document.getElementById('sosConfirm').style.display = 'none';
  document.getElementById('alertSim').style.display = 'none';

  // Progress bar
  const prog = document.getElementById('sosProgress');
  const bar = document.getElementById('sosProgressBar');
  prog.style.display = 'block';
  bar.style.width = '0%';

  // Type messages sequentially
  const msgEl = document.getElementById('sosMessages');
  for(let i = 0; i < SOS_MESSAGES.length; i++) {
    await delay(600);
    msgEl.innerHTML = `<div class="typing-msg">${SOS_MESSAGES[i]}</div>`;
    bar.style.width = ((i+1)/SOS_MESSAGES.length * 90) + '%';
  }
  bar.style.width = '100%';
  await delay(400);

  // Show alert simulation
  await showAlerts();

  // Show confirm
  await delay(800);
  const confirm = document.getElementById('sosConfirm');
  confirm.style.display = 'block';
  const svc = selectedService;
  document.getElementById('confirmDetails').textContent = svc
    ? `${svc.name} emergency services dispatched. ETA: 8–12 minutes.`
    : 'Emergency services dispatched to your GPS location.';

  msgEl.innerHTML = '';
  prog.style.display = 'none';
  btn.classList.remove('triggered');
  sosActive = false;

  showToast('🚨 SOS sent! Help is on the way.');
  setTimeout(() => { fakeSOSCount = 0; }, 60000);
}

async function showAlerts() {
  const svc = selectedService;
  const key = svc ? svc.id : 'default';
  
  try {
    const res = await fetch(`${API_URL}/sos/alerts/${key}`);
    const items = await res.json();
    const sim = document.getElementById('alertSim');
    document.getElementById('alertItems').innerHTML = items.map(a => `
      <div class="alert-item">
        <span class="ai-icon">${a.icon}</span>
        <span>${a.text}</span>
        <span class="ai-status ${a.status}">${a.status === 'sent' ? '✓ Sent' : a.status === 'calling' ? '📞 Calling' : '⏳ Pending'}</span>
      </div>
    `).join('');
    sim.style.display = 'block';
  } catch(e) {
    console.error(e);
  }
}

// ===== ALARM SOUND =====
function playAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.2, 0.4].forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime + t);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.15);
    });
  } catch(e) {}
}

// ===== LOCATION =====
function getLocation() {
  const badge = document.getElementById('locBadge');
  badge.textContent = 'Detecting...';
  if(!navigator.geolocation) { showToast('Geolocation not supported.'); return; }

  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude: lat, longitude: lng } = pos.coords;
    userLocation = { lat, lng };
    document.getElementById('locationCoords').textContent = `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    badge.textContent = 'GPS Active';
    badge.style.color = 'var(--teal)';

    const src = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
    const frame = document.getElementById('mapFrame');
    frame.src = src;
    frame.classList.remove('hidden');
    document.getElementById('mapPlaceholder').style.display = 'none';
    showToast('📍 Location found!');
  }, err => {
    badge.textContent = 'Location denied';
    showToast('Location access denied. Please enable GPS.');
  }, { enableHighAccuracy: true });
}

// ===== SAFETY MODULES TABS =====
function switchModule(id, btn) {
  document.querySelectorAll('.module-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.module-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('mod-'+id).classList.add('active');
}

// ===== AUTH =====
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if(!email || !password) { showToast('Please fill all fields.'); return; }

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    
    if(res.ok) {
      currentUser = data.user;
      localStorage.setItem('suraksha_user', JSON.stringify(currentUser));
      loginSuccess(currentUser);
    } else {
      showToast(data.message || 'Login failed');
    }
  } catch (err) {
    console.error(err);
    showToast('Failed to connect to backend.');
  }
}

async function doSignup() {
  const name = document.getElementById('su_name').value.trim();
  const email = document.getElementById('su_email').value.trim();
  const password = document.getElementById('su_password').value;
  const pass2 = document.getElementById('su_password2').value;
  const phone = document.getElementById('su_phone').value.trim();
  const gender = document.getElementById('su_gender').value;
  const age = document.getElementById('su_age').value;
  const dob = document.getElementById('su_dob').value;
  const blood = document.getElementById('su_blood').value;
  const emergency = document.getElementById('su_emergency').value.trim();
  const lang = document.getElementById('su_lang').value;

  if(!name||!email||!password||!phone){ showToast('Please fill required fields.'); return; }
  if(password !== pass2){ showToast('Passwords do not match.'); return; }

  const initials = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const userPayload = { name, email, password, phone, gender, age, dob, blood, emergency, lang, initials };

  try {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload)
    });
    const data = await res.json();

    if(res.ok) {
      currentUser = data.user;
      localStorage.setItem('suraksha_user', JSON.stringify(currentUser));
      showToast('Account created! Welcome.');
      loginSuccess(currentUser);
    } else {
      showToast(data.message || 'Signup failed');
    }
  } catch (err) {
    console.error(err);
    showToast('Failed to connect to backend.');
  }
}

function loginSuccess(user) {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('signupPage').classList.add('hidden');
  document.getElementById('app').style.display = 'flex';
  document.getElementById('userName').textContent = user.name.split(' ')[0];
  document.getElementById('userInitials').textContent = user.initials || user.name[0].toUpperCase();
  if(user.lang) document.getElementById('langSelect').value = user.lang;
  
  // Render services if they are already loaded
  if(SERVICES.length > 0) renderServices();
}

function doLogout() {
  currentUser = null;
  selectedService = null;
  localStorage.removeItem('suraksha_user');
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginPage').classList.remove('hidden');
  
  // Clear grids for security
  document.getElementById('servicesGrid').innerHTML = '';
  document.getElementById('nearbySection').style.display = 'none';
}

function showSignup() {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('signupPage').classList.remove('hidden');
}
function showLogin() {
  document.getElementById('signupPage').classList.add('hidden');
  document.getElementById('loginPage').classList.remove('hidden');
}

// ===== LANGUAGE =====
const LANG_GREET = {
  en: 'Emergency services ready.',
  hi: 'आपातकालीन सेवाएं तैयार हैं।',
  te: 'అత్యవసర సేవలు సిద్ధంగా ఉన్నాయి.',
  ta: 'அவசர சேவைகள் தயாராக உள்ளன.',
};
function changeLanguage(lang) {
  showToast(LANG_GREET[lang] || 'Language updated.');
}

// ===== UTILS =====
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
