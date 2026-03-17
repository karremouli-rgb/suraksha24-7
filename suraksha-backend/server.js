const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ===== DATA =====
const SERVICES = [
  { id:'hospital', name:'Hospital', icon:'🏥', desc:'Medical emergency', color:'#E8344A', bg:'#FFF1F2', shadow:'rgba(232,52,74,0.15)', injury:true },
  { id:'fire',     name:'Fire',     icon:'🔥', desc:'Fire hazard',       color:'#EA580C', bg:'#FFF7ED', shadow:'rgba(234,88,12,0.15)',  injury:false },
  { id:'police',   name:'Police',   icon:'🚔', desc:'Law & order',       color:'#1B4FD8', bg:'#EFF6FF', shadow:'rgba(27,79,216,0.15)',  injury:false },
  { id:'sos',      name:'SOS',      icon:'🆘', desc:'General emergency', color:'#DC2626', bg:'#FEF2F2', shadow:'rgba(220,38,38,0.18)', injury:true  },
  { id:'women',    name:'Women Safety',icon:'👩',desc:'Women\'s safety', color:'#DB2777', bg:'#FDF2F8', shadow:'rgba(219,39,119,0.15)',injury:false },
  { id:'pregnancy',name:'Pregnancy',icon:'🤱', desc:'Maternity urgent',  color:'#7C3AED', bg:'#F5F3FF', shadow:'rgba(124,58,237,0.15)',injury:true  },
  { id:'elder',    name:'Elder Safety',icon:'👴',desc:'Senior emergency', color:'#0D9488', bg:'#F0FDFA', shadow:'rgba(13,148,136,0.15)',injury:false },
  { id:'highway',  name:'Highway',  icon:'🛣️', desc:'Road emergency',    color:'#D97706', bg:'#FFFBEB', shadow:'rgba(217,119,6,0.15)', injury:false },
];

const SOS_MESSAGES = [
  "Contacting emergency services...",
  "GPS location locked 📍",
  "Dispatching units to your location...",
  "Alerting your emergency contacts...",
  "Help is on the way! 🚨"
];

const NEARBY = {
  hospital: [
    { icon:'🏥', name:'AIIMS Emergency', addr:'Ansari Nagar, New Delhi', dist:'1.2 km', phone:'011-26588500' },
    { icon:'🏥', name:'Apollo Hospital', addr:'Sarita Vihar, Delhi', dist:'2.8 km', phone:'1860-500-1066' },
    { icon:'🚑', name:'Safdarjung Hospital', addr:'Ring Road, New Delhi', dist:'3.5 km', phone:'011-26165060' },
  ],
  police: [
    { icon:'🚔', name:'Local Police Station', addr:'Sector 14, Near Market', dist:'0.8 km', phone:'100' },
    { icon:'🚔', name:'Traffic Control Room', addr:'City Centre', dist:'1.5 km', phone:'103' },
  ],
  fire: [
    { icon:'🚒', name:'Fire Station No.3', addr:'Industrial Area', dist:'1.1 km', phone:'101' },
    { icon:'🚒', name:'Civil Fire Station', addr:'Market Road', dist:'2.3 km', phone:'101' },
  ],
  highway: [
    { icon:'⛽', name:'HP Petrol Pump', addr:'NH-44, Km 23', dist:'3.2 km', phone:'1800-222-222' },
    { icon:'⛽', name:'Indian Oil Station', addr:'Highway Junction', dist:'5.1 km', phone:'1800-419-4357' },
    { icon:'🔧', name:'24hr Roadside Assist', addr:'Highway Service Zone', dist:'4.0 km', phone:'1800-103-0077' },
  ],
};

const ALERT_TEMPLATES = {
  hospital: [
    { icon:'🚑', text:'Ambulance dispatch request sent', status:'sent' },
    { icon:'🏥', text:'Nearest hospital alerted with your location', status:'sent' },
    { icon:'📱', text:'Emergency contact notified via SMS', status:'sent' },
    { icon:'💊', text:'Medical supplies request → nearby pharmacy', status:'calling' },
  ],
  police: [
    { icon:'🚔', text:'Police SOS sent to local station', status:'sent' },
    { icon:'📍', text:'GPS coordinates transmitted to control room', status:'sent' },
    { icon:'📱', text:'Emergency contact notified', status:'sent' },
  ],
  fire: [
    { icon:'🚒', text:'Fire brigade dispatch request sent', status:'sent' },
    { icon:'🏢', text:'Building management alerted', status:'calling' },
    { icon:'📱', text:'Emergency contact notified', status:'sent' },
  ],
  default: [
    { icon:'📡', text:'National emergency number 112 alerted', status:'sent' },
    { icon:'📍', text:'GPS location shared with responders', status:'sent' },
    { icon:'📱', text:'Emergency contact notified via SMS & call', status:'sent' },
  ]
};

// In-memory mock database of users
const users = [];

// ===== API ENDPOINTS =====

// Get all emergency services
app.get('/api/services', (req, res) => {
  res.json(SERVICES);
});

// Get nearby services based on category
app.get('/api/nearby/:serviceId', (req, res) => {
  const serviceId = req.params.serviceId;
  res.json(NEARBY[serviceId] || []);
});

// Get SOS typing messages
app.get('/api/sos/messages', (req, res) => {
  res.json(SOS_MESSAGES);
});

// Get alert simulation steps
app.get('/api/sos/alerts/:serviceId', (req, res) => {
  const serviceId = req.params.serviceId;
  res.json(ALERT_TEMPLATES[serviceId] || ALERT_TEMPLATES['default']);
});

// Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = users.find(u => u.email === email);
  if (user) {
    if (user.password === password) {
      // Don't send password back
      const { password: _, ...userWithoutPassword } = user;
      res.json({ message: 'Login successful', user: userWithoutPassword });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } else {
    // For local fallback behavior requested in frontend
    res.status(404).json({ message: 'User not found. Please sign up.' });
  }
});

// Auth: Signup
app.post('/api/auth/signup', (req, res) => {
  const newUser = req.body;
  
  if (!newUser.email || !newUser.password || !newUser.name) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const exists = users.find(u => u.email === newUser.email);
  if (exists) {
    return res.status(400).json({ message: 'User with this email already exists' });
  }
  
  users.push(newUser);
  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json({ message: 'Account created', user: userWithoutPassword });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});
