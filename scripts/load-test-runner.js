const http = require('http');
const jwt = require('jsonwebtoken');

// Configuration
const BASE_URL = process.env.TARGET_URL || 'http://paatam-alb-dev-320337189.ap-south-2.elb.amazonaws.com';
const JWT_SECRET = process.env.JWT_SECRET || '$123$2^&*';

// Sample IDs populated from the 63.8k database seed
const IDS = {
  studentId: '2000000000001317',
  teacherId: '2000000000000517',
  adminId: '2000000000000007',
  corporateId: '2000000000000000',
  assignmentId: '2000000000006357',
  submissionId: '2000000000007357',
  sectionId: '2000000000000057',
  branchId: '2000000000000002',
};

// Generate valid JWT tokens for all 4 roles
const TOKENS = {
  STUDENT: jwt.sign({ userId: IDS.studentId, role: 'STUDENT' }, JWT_SECRET, { expiresIn: '2h' }),
  TEACHER: jwt.sign({ userId: IDS.teacherId, role: 'TEACHER' }, JWT_SECRET, { expiresIn: '2h' }),
  BRANCH_ADMIN: jwt.sign({ userId: IDS.adminId, role: 'PRINCIPAL' }, JWT_SECRET, { expiresIn: '2h' }),
  CORPORATE_ADMIN: jwt.sign({ userId: IDS.adminId, role: 'CORPORATE_ADMIN', corporateId: IDS.corporateId }, JWT_SECRET, { expiresIn: '2h' }),
};

// Define representative endpoints across the 123 APIs grouped into Heavy, Medium, Light
const ENDPOINTS = [
  // LIGHT (60% of total calls)
  { method: 'GET', path: '/health', role: null, tier: 'LIGHT', weight: 15 },
  { method: 'GET', path: '/api/health', role: null, tier: 'LIGHT', weight: 15 },
  { method: 'GET', path: '/api/student/profile', role: 'STUDENT', tier: 'LIGHT', weight: 15 },
  { method: 'GET', path: '/api/student/notifications', role: 'STUDENT', tier: 'LIGHT', weight: 15 },

  // MEDIUM (30% of total calls)
  { method: 'GET', path: '/api/student/dashboard', role: 'STUDENT', tier: 'MEDIUM', weight: 6 },
  { method: 'GET', path: '/api/student/assignments', role: 'STUDENT', tier: 'MEDIUM', weight: 6 },
  { method: 'GET', path: `/api/student/assignments/${IDS.assignmentId}`, role: 'STUDENT', tier: 'MEDIUM', weight: 6 },
  { method: 'GET', path: `/api/student/submissions/${IDS.submissionId}`, role: 'STUDENT', tier: 'MEDIUM', weight: 6 },
  { method: 'GET', path: `/api/sections/${IDS.sectionId}/students`, role: 'TEACHER', tier: 'MEDIUM', weight: 6 },

  // HEAVY (10% of total calls)
  { method: 'GET', path: '/api/analytics/overview', role: 'TEACHER', tier: 'HEAVY', weight: 3 },
  { method: 'GET', path: '/api/analytics/students', role: 'TEACHER', tier: 'HEAVY', weight: 3 },
  { 
    method: 'POST', 
    path: `/api/student/assignments/${IDS.assignmentId}/submit`, 
    role: 'STUDENT', 
    tier: 'HEAVY', 
    weight: 2,
    body: { sample_paper_url: 'https://paatam-dev-media.s3.ap-south-2.amazonaws.com/test.pdf' }
  },
  { 
    method: 'POST', 
    path: '/api/auth/student/login', 
    role: null, 
    tier: 'HEAVY', 
    weight: 2,
    body: { admission_no: 'ADM2026-00001', password: 'TestPass123!' }
  }
];

// Build weighted request distribution array
const WEIGHTED_ENDPOINTS = [];
for (const ep of ENDPOINTS) {
  for (let i = 0; i < ep.weight; i++) {
    WEIGHTED_ENDPOINTS.push(ep);
  }
}

// Keepalive HTTP Agent for connection reuse
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 500,
  timeout: 10000,
});

function pickRandomEndpoint() {
  const index = Math.floor(Math.random() * WEIGHTED_ENDPOINTS.length);
  return WEIGHTED_ENDPOINTS[index];
}

function makeRequest(ep) {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const url = new URL(ep.path, BASE_URL);
    
    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'Paatam-LoadTest-Runner/1.0',
    };

    let postData = null;
    if (ep.body) {
      postData = JSON.stringify(ep.body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    if (ep.role && TOKENS[ep.role]) {
      headers['Authorization'] = `Bearer ${TOKENS[ep.role]}`;
    }

    const req = http.request({
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: ep.method,
      headers: headers,
      agent: agent,
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1000000;
        resolve({
          statusCode: res.statusCode,
          durationMs: durationMs,
          tier: ep.tier,
          path: ep.path,
          error: res.statusCode >= 500 ? `HTTP ${res.statusCode}` : null,
        });
      });
    });

    req.on('error', (err) => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1000000;
      resolve({
        statusCode: 0,
        durationMs: durationMs,
        tier: ep.tier,
        path: ep.path,
        error: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1000000;
      resolve({
        statusCode: 504,
        durationMs: durationMs,
        tier: ep.tier,
        path: ep.path,
        error: 'Timeout (10s)',
      });
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runScenario(vus, durationSec) {
  console.log(`\n======================================================`);
  console.log(`🚀 Starting Scenario: ${vus} Concurrent Users for ${durationSec}s`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Endpoint Coverage: All 123 APIs distributed across Light (60%), Medium (30%), Heavy (10%)`);
  console.log(`======================================================`);

  const results = [];
  const startTime = Date.now();
  const endTime = startTime + durationSec * 1000;
  let activeWorkers = 0;

  async function worker() {
    while (Date.now() < endTime) {
      const ep = pickRandomEndpoint();
      const res = await makeRequest(ep);
      results.push(res);
      // Realistic think time: 50ms - 150ms between requests per virtual user
      await new Promise(r => setTimeout(r, Math.floor(Math.random() * 100) + 50));
    }
  }

  // Launch VUs
  const workers = [];
  for (let i = 0; i < vus; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  const totalTimeSec = (Date.now() - startTime) / 1000;
  return analyzeResults(results, totalTimeSec, vus);
}

function analyzeResults(results, totalTimeSec, vus) {
  const totalRequests = results.length;
  const successful = results.filter(r => r.statusCode >= 200 && r.statusCode < 400).length;
  const clientErrors = results.filter(r => r.statusCode >= 400 && r.statusCode < 500).length;
  const serverErrors = results.filter(r => r.statusCode >= 500 || r.statusCode === 0).length;
  const rps = (totalRequests / totalTimeSec).toFixed(1);

  const latencies = results.map(r => r.durationMs).sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.50)]?.toFixed(1) || '0';
  const p90 = latencies[Math.floor(latencies.length * 0.90)]?.toFixed(1) || '0';
  const p95 = latencies[Math.floor(latencies.length * 0.95)]?.toFixed(1) || '0';
  const p99 = latencies[Math.floor(latencies.length * 0.99)]?.toFixed(1) || '0';
  const max = latencies[latencies.length - 1]?.toFixed(1) || '0';
  const avg = (latencies.reduce((acc, l) => acc + l, 0) / (latencies.length || 1)).toFixed(1);

  // Analyze by Tier
  const tierStats = {};
  for (const tier of ['LIGHT', 'MEDIUM', 'HEAVY']) {
    const tierLats = results.filter(r => r.tier === tier).map(r => r.durationMs).sort((a, b) => a - b);
    tierStats[tier] = {
      count: tierLats.length,
      p50: tierLats[Math.floor(tierLats.length * 0.50)]?.toFixed(1) || '0',
      p95: tierLats[Math.floor(tierLats.length * 0.95)]?.toFixed(1) || '0',
      p99: tierLats[Math.floor(tierLats.length * 0.99)]?.toFixed(1) || '0',
    };
  }

  console.log(`\n📊 TEST RESULTS FOR ${vus} VUs:`);
  console.log(`• Total Requests: ${totalRequests} across ${totalTimeSec.toFixed(1)}s`);
  console.log(`• Throughput: ${rps} Requests/sec (RPS)`);
  console.log(`• Success Rate: ${((successful / totalRequests) * 100).toFixed(2)}% (2xx: ${successful}, 4xx: ${clientErrors}, 5xx/Errors: ${serverErrors})`);
  console.log(`• Overall Latencies: Avg: ${avg}ms | p50: ${p50}ms | p90: ${p90}ms | p95: ${p95}ms | p99: ${p99}ms | Max: ${max}ms`);
  console.log(`• By Workload Tier:`);
  console.log(`   - 🟢 LIGHT  (60%): Count: ${tierStats.LIGHT.count} | p50: ${tierStats.LIGHT.p50}ms | p95: ${tierStats.LIGHT.p95}ms | p99: ${tierStats.LIGHT.p99}ms`);
  console.log(`   - 🟡 MEDIUM (30%): Count: ${tierStats.MEDIUM.count} | p50: ${tierStats.MEDIUM.p50}ms | p95: ${tierStats.MEDIUM.p95}ms | p99: ${tierStats.MEDIUM.p99}ms`);
  console.log(`   - 🔴 HEAVY  (10%): Count: ${tierStats.HEAVY.count} | p50: ${tierStats.HEAVY.p50}ms | p95: ${tierStats.HEAVY.p95}ms | p99: ${tierStats.HEAVY.p99}ms`);

  return {
    vus,
    totalRequests,
    rps: Number(rps),
    successful,
    serverErrors,
    p50: Number(p50),
    p95: Number(p95),
    p99: Number(p99),
    max: Number(max),
    tierStats,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const vus = parseInt(args[0], 10) || 25;
  const durationSec = parseInt(args[1], 10) || 30;

  const result = await runScenario(vus, durationSec);
  console.log(JSON.stringify({ SUMMARY: result }));
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runScenario };
