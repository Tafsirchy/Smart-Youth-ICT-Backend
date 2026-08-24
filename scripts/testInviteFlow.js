/* E2E test for staff invite flow. Run: node scripts/testInviteFlow.js */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const crypto = require('crypto');

const User = require('../src/models/User');
const Branch = require('../src/models/Branch');
const { generateToken } = require('../src/utils/jwt');

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI missing');
  // SRV DNS lookups can be flaky on Windows; retry a few times
  let connected = false;
  for (let i = 1; i <= 5 && !connected; i++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
      connected = true;
    } catch (err) {
      console.log(`[retry ${i}] connect failed: ${err.message}`);
      if (i === 5) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.log('[1] DB connected');

  // Find or create a test branch
  let branch = await Branch.findOne({ code: 'TEST' });
  if (!branch) {
    branch = await Branch.create({
      name: 'Test Branch E2E', code: 'TEST', isActive: true, slug: 'test-branch-e2e',
      location: { type: 'Point', coordinates: [90.4125, 23.8103] }
    });
    console.log('[2] Created test branch', branch._id.toString());
  } else {
    console.log('[2] Using existing test branch', branch._id.toString());
  }

  // Find or create a super admin
  let admin = await User.findOne({ role: 'super_admin' }).select('+password');
  if (!admin) throw new Error('No super_admin exists in DB to run the test');
  console.log('[3] Super admin:', admin.email);

  const token = generateToken(admin);
  const base = 'http://localhost:5000/api';

  // Start server
  const { spawn } = require('child_process');
  const server = spawn('node', ['src/server.js'], {
    cwd: require('path').join(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', (d) => process.stdout.write(`[srv] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[srv-err] ${d}`));

  // Poll until API responds
  const ready = await new Promise((resolve) => {
    let tries = 0;
    const tick = async () => {
      tries++;
      try {
        const res = await fetch(`${base}/branches/public/list`);
        if (res.ok) return resolve(true);
      } catch {}
      if (tries > 30) return resolve(false);
      setTimeout(tick, 1000);
    };
    setTimeout(tick, 1500);
  });
  if (!ready) throw new Error('Server did not become ready');

  try {
    // A. Invite
    const inviteRes = await fetch(`${base}/users/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'E2E Instructor', email: `e2e-instructor-${Date.now()}@test.local`, role: 'instructor', branchId: branch._id.toString() })
    });
    const inviteJson = await inviteRes.json();
    console.log('[4] INVITE status:', inviteRes.status, '| message:', inviteJson.message);

    // B. Check user in DB
    const invited = await User.findOne({ email: inviteJson.data.email }).select('+inviteToken +password');
    console.log('[5] DB user => role:', invited.role, '| branchId matches:', String(invited.branchId) === branch._id.toString(), '| hasPassword:', !!invited.password, '| hasInviteToken:', !!invited.inviteToken);

    // C. Forge raw token matching stored hash (simulating email link)
    const rawToken = crypto.randomBytes(32).toString('hex');
    invited.inviteToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    invited.inviteExpiry = new Date(Date.now() + 3600000);
    await invited.save({ validateBeforeSave: false });

    // D. Accept invite with weak password -> should fail validation
    const weakRes = await fetch(`${base}/users/invite/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken, password: 'weakpass' })
    });
    console.log('[6] WEAK PASSWORD status (expect 400):', weakRes.status);

    // E. Accept invite properly
    const acceptRes = await fetch(`${base}/users/invite/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken, password: 'StrongPass1' })
    });
    const acceptJson = await acceptRes.json();
    console.log('[7] ACCEPT status:', acceptRes.status, '|', acceptJson.message);

    // F. Verify password works + login
    const after = await User.findById(invited._id).select('+password +providers');
    console.log('[8] Password set:', !!after.password, '| providers:', after.providers, '| inviteToken cleared:', !after.inviteToken);
    const loginOk = await after.comparePassword('StrongPass1');
    console.log('[9] comparePassword("StrongPass1"):', loginOk);

    // G. Reuse same token again -> should fail
    const reuseRes = await fetch(`${base}/users/invite/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken, password: 'StrongPass1' })
    });
    console.log('[10] TOKEN REUSE status (expect 400):', reuseRes.status);

    // H. Non-super cannot invite
    const staffToken = generateToken(after); // instructor token
    const forbiddenRes = await fetch(`${base}/users/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ name: 'X', email: 'x@x.com', role: 'instructor', branchId: branch._id.toString() })
    });
    console.log('[11] INSTRUCTOR INVITING status (expect 403):', forbiddenRes.status);

    console.log('\n=== ALL E2E CHECKS DONE ===');
  } finally {
    server.kill();
    await mongoose.disconnect();
  }
}

main().catch((err) => { console.error('E2E FAILED:', err.message); process.exit(1); });

