// helpers
function rnd(base, variance) { return base + (Math.random() - 0.5) * variance }

function makeServers(count, appId) {
  const locs = ['New York, US','London, UK','Frankfurt, DE','Singapore, SG','Tokyo, JP']
  const ccs  = ['US','UK','DE','SG','JP']
  return Array.from({ length: count }, (_, i) => ({
    id: `${appId}_s${i+1}`,
    sessionId: `sess_${(Date.now() + i).toString(36)}`,
    userCountry: ccs[i % ccs.length],
    location: locs[i % locs.length],
    protocols: ['openvpn','shadowsocks'],
    priority: i < 3,
    disabled: i === 4,
    managementPort: 7505 + (i % 3),
    configTag: `tag-${i+1}`,
    cnMatch: `vpn${i+1}.example.com`,
    ovpnBase64: 'LS0tLS1CRUdJTiBPUEVOVlBO...',
    ssPort: 8388 + i,
    ssPassword: `pass_${i}_abc`,
    ssEncryption: i % 2 === 0 ? 'aes-256-gcm' : 'chacha20-ietf-poly1305',
  }))
}

// Apps
export const mockApps = [
  { id:'app_vpn_pro',        name:'VPN Pro',        appId:'app_vpn_pro',        status:'active', activeUsers:45230, totalSessions:1234567, servers:makeServers(12,'app_vpn_pro') },
  { id:'app_secure_net',     name:'SecureNet VPN',  appId:'app_secure_net',     status:'active', activeUsers:23450, totalSessions:567890,  servers:makeServers(4,'app_secure_net') },
  { id:'app_fast_tunnel',    name:'FastTunnel',     appId:'app_fast_tunnel',    status:'active', activeUsers:12340, totalSessions:234567,  servers:makeServers(3,'app_fast_tunnel') },
  { id:'app_privacy_shield', name:'Privacy Shield', appId:'app_privacy_shield', status:'active', activeUsers:8900,  totalSessions:123456,  servers:makeServers(2,'app_privacy_shield') },
]

// Overview
export const mockStats = { activeServers:4, totalServers:5, activeSessions:50, sessionCapacityPct:1.5, successRate:96.2, successRateLabel:'Excellent', avgConnectTime:2.4, avgConnectTimeLabel:'Fast' }
export const protocolDistribution = [{ name:'OpenVPN', value:51, color:'#6366f1' },{ name:'Shadowsocks', value:49, color:'#22d3ee' }]
export const serverLoadData = [{ city:'New York', load:78 },{ city:'London', load:82 },{ city:'Frankfurt', load:76 },{ city:'Singapore', load:80 },{ city:'Tokyo', load:79 }]
export const successRateData = Array.from({length:24},(_,h)=>({ time:`${String(h).padStart(2,'0')}:00`, openvpn:93+Math.sin(h/3)*4+(h%3)*0.5, shadowsocks:89+Math.sin(h/2.5)*5+(h%2)*0.8 }))
export const recentAlerts = [
  { id:1, type:'warning', title:'High load on Tokyo server', message:'Server srv_jp_tokyo_01 is approaching capacity (89%)' },
  { id:2, type:'info',    title:'Protocol fallover detected', message:'Shadowsocks fallback used in China region (15 instances)' },
]

// Live sessions
export const mockLiveSessions = Array.from({length:20},(_,i)=>({
  id:`sess_e9q7aammv${i}`,
  userCountry:['US','CN','DE','JP','GB','IN'][i%6],
  serverLocation:['New York, US','London, UK','Frankfurt, DE','Singapore, SG','Tokyo, JP'][i%5],
  protocol: i%3===2 ? 'shadowsocks' : 'openvpn',
  duration:`0h ${42+i%10}m ${14+i%30}s`,
  upload:`${(100+i*7).toFixed(2)} MB`,
  download:`${(3.1+i*0.12).toFixed(2)} GB`,
  connectedAt:'1/29/2026, 3:37:45 PM',
}))

// Server management
export const mockServers = Array.from({length:9},(_,i)=>({
  id:`srv_us_east_0${i+1}`,
  status: i===3 ? 'inactive' : 'active',
  location:['New York, US','London, UK','Frankfurt, DE','Singapore, SG','Tokyo, JP'][i%5],
  ipAddress:`52.23.${145+i}.78`,
  used:742, total:1000,
  load:74+(i%3)*5,
  type: i%3===0 ? 'free' : 'premium',
  country:['US','UK','DE','SG','JP'][i%5],
  city:['New York','London','Frankfurt','Singapore','Tokyo'][i%5],
  flagUrl:'',
  maxCapacity:1000,
  disabled: i===3,
}))

// VPN Analytics
export const analyticsServers = [
  { order:1, location:'New York, USA', ip:'52.23.145.78', type:'premium', SmartVPNBlue:245, FastVPN:189, GraceVPN:156, SecureConnect:0, VPNLite:0, load:92, cpu:87, ram:78, ping:'12ms', peakUsers:735, peakCpu:94, peakRam:89 },
  { order:1, location:'London, UK',    ip:'18.134.22.15', type:'premium', SmartVPNBlue:189, FastVPN:143, GraceVPN:201, SecureConnect:0, VPNLite:0, load:88, cpu:82, ram:74, ping:'8ms',  peakUsers:680, peakCpu:91, peakRam:85 },
  { order:1, location:'Frankfurt, DE', ip:'3.64.120.44',  type:'free',    SmartVPNBlue:134, FastVPN:98,  GraceVPN:112, SecureConnect:0, VPNLite:0, load:86, cpu:79, ram:71, ping:'10ms', peakUsers:590, peakCpu:88, peakRam:82 },
]

// Protocol health
export const protocolHealthStats = {
  openvpn:     { successRate:95.76, avgConnectTime:2.70, totalAttempts:16010, successful:15331, failed:679 },
  shadowsocks: { successRate:96.97, avgConnectTime:2.10, totalAttempts:12858, successful:12468, failed:390 },
}
export const protocolByCountry = [
  { sno:1, country:'United States', openvpn:97.3, shadowsocks:97.9 },
  { sno:2, country:'Germany',       openvpn:93.8, shadowsocks:95.7 },
  { sno:3, country:'China',         openvpn:72.1, shadowsocks:94.2 },
  { sno:4, country:'Russia',        openvpn:68.5, shadowsocks:91.3 },
  { sno:5, country:'Japan',         openvpn:96.1, shadowsocks:95.8 },
]

// Country intelligence
export const countryPolicies = [
  { id:1, country:'CN', censorship:'High', preferred:'shadowsocks', fallback:'openvpn',     notes:'OpenVPN frequently blocked by GFW. Shadowsocks preferred.' },
  { id:2, country:'RU', censorship:'High', preferred:'shadowsocks', fallback:'openvpn',     notes:'Increased DPI. Shadowsocks more reliable.' },
  { id:3, country:'IR', censorship:'High', preferred:'shadowsocks', fallback:'openvpn',     notes:'Heavy censorship. Shadowsocks recommended.' },
  { id:4, country:'US', censorship:'Low',  preferred:'openvpn',     fallback:'shadowsocks', notes:'No restrictions. OpenVPN provides better security.' },
]

// ISP intelligence
export const ispPolicies = [
  { id:1, country:'CN', ispName:'China Telecom', asn:'AS4134',  protocol:'openvpn',     status:'blocked',   expiry:'No expiry' },
  { id:2, country:'CN', ispName:'China Telecom', asn:'AS4134',  protocol:'shadowsocks', status:'preferred', expiry:'No expiry' },
  { id:3, country:'RU', ispName:'Rostelecom',    asn:'AS12389', protocol:'openvpn',     status:'degraded',  expiry:'No expiry' },
]

// Policies
export const defaultPolicies = { enableOpenvpnGlobally:true, enableShadowsocksGlobally:false, autoProtocolSwitching:true, enforceCountryPolicies:true, softCooldown:5, mediumCooldown:15, hardCooldown:60 }

// Logs
export const mockLogs = [
  { id:1, timestamp:'1/20/2025, 2:45:23 PM',  user:'Super Admin',      action:'server.create',          resourceType:'server',          resourceId:'srv_us_east_01', app:'app_vpn_pro', details:{ country:'US', city:'New York' } },
  { id:2, timestamp:'1/20/2025, 1:30:15 PM',  user:'Operations Admin', action:'protocol_config.update', resourceType:'protocol_config', resourceId:'cfg_001',        app:'app_vpn_pro', details:{ protocol:'openvpn', change:'port updated' } },
  { id:3, timestamp:'1/20/2025, 12:15:42 PM', user:'Super Admin',      action:'country_policy.create',  resourceType:'policy',          resourceId:'-',              app:'app_vpn_pro', details:{ country:'CN', preferred:'shadowsocks' } },
]

// Reports
export const dailyConnections = Array.from({length:30},(_,i)=>({ day:i+1, total:4000+Math.sin(i/3)*1500+(i%4)*200, successful:3500+Math.sin(i/3)*1200+(i%4)*160 }))
export const protocolUsage24h = Array.from({length:24},(_,h)=>({ time:`${String(h+1).padStart(2,'0')}:00`, openvpn:800+Math.sin(h/3)*350+(h%3)*50, shadowsocks:600+Math.sin(h/2.5)*250+(h%2)*40 }))
export const topCountries = [{ country:'US',sessions:13800 },{ country:'GB',sessions:9500 },{ country:'DE',sessions:7200 },{ country:'CN',sessions:6100 },{ country:'JP',sessions:5400 }]
export const bandwidthData = Array.from({length:24},(_,h)=>({ time:`${String(h).padStart(2,'0')}:00`, upload:700+Math.sin(h/4)*400+(h%3)*80, download:2100+Math.sin(h/3)*600+(h%4)*120 }))
export const reportStats = { totalConnections:'1.2M', totalConnectionsChange:'+12.5%', successRate:'97.8%', successRateLabel:'Excellent', avgSessionDuration:'42m', avgSessionNote:'Per user', totalBandwidth:'856 TB', bandwidthNote:'Combined transfer' }
export const userStats        = { totalUsers:89432, activeToday:45230, newThisWeek:2341 }
export const connectionQuality = { avgConnectTime:'2.4s', successRate:'97.8%', fallbackUsed:'3.2%' }
export const performanceTrends = { weekOverWeek:'+12.5%', monthOverMonth:'+23.8%', peakHour:'18:00 UTC' }

// Shared helpers
export const serverLocations = ['New York, US','London, UK','Frankfurt, DE','Singapore, SG','Tokyo, JP','Sydney, AU','Toronto, CA','Mumbai, IN']
export const countryOptions  = [
  { code:'US',name:'United States' },{ code:'CN',name:'China' },{ code:'RU',name:'Russia' },
  { code:'DE',name:'Germany' },      { code:'GB',name:'United Kingdom' },{ code:'JP',name:'Japan' },
  { code:'IR',name:'Iran' },         { code:'IN',name:'India' },{ code:'AU',name:'Australia' },{ code:'CA',name:'Canada' },
]
