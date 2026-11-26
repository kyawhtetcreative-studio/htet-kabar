'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { createServer } = require('node:net');
const { randomBytes } = require('node:crypto');
const path = require('node:path');
const { Pool } = require('pg');

const root = path.resolve(__dirname, '..');
const enabled = process.env.RUN_DB_INTEGRATION_TESTS === '1';
const pngFixture = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfV8AAAAASUVORK5CYII=';

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise(resolve => child.once('exit', resolve));
  child.kill('SIGTERM');
  await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 5000))]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL');
    await exited;
  }
}

test('PostgreSQL order and manual payment workflow', {
  skip: !enabled && 'Set RUN_DB_INTEGRATION_TESTS=1 with the dedicated local test database.',
  timeout: 120000
}, async () => {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  assert.ok(databaseUrl, 'TEST_DATABASE_URL is required.');
  const parsed = new URL(databaseUrl);
  assert.ok(['127.0.0.1', 'localhost', '::1', '[::1]'].includes(parsed.hostname), 'Only a local PostgreSQL server is allowed.');
  assert.equal(decodeURIComponent(parsed.pathname), '/htet_kabar_test', 'Use only the dedicated htet_kabar_test database.');

  const pool = new Pool({ connectionString: databaseUrl, max: 3 });
  await pool.query('SELECT 1');

  const suffix = randomBytes(6).toString('hex');
  const email = 'integration-' + suffix + '@example.invalid';
  const password = randomBytes(24).toString('base64url');
  const jwtSecret = randomBytes(48).toString('base64url');
  const phone = '09' + randomBytes(5).toString('hex');
  const port = await reservePort();
  const base = 'http://127.0.0.1:' + port;
  const orderCodes = [];
  let serviceId = null;
  let createdAccountId = null;
  let cookie = null;
  let output = '';

  const child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      JWT_SECRET: jwtSecret,
      ADMIN_EMAIL: email,
      ADMIN_PASSWORD: password,
      NODE_ENV: 'production',
      TRUST_PROXY_HOPS: '0',
      PORT: String(port),
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
      GOOGLE_REDIRECT_URI: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const collect = chunk => { output = (output + chunk.toString()).slice(-5000); };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);

  async function api(route, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.origin !== null) headers.set('Origin', options.origin || base);
    if (options.cookie) headers.set('Cookie', options.cookie);
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');
    const response = await fetch(base + route, {
      method: options.method || 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const raw = await response.text();
    let data = null;
    try { data = JSON.parse(raw); } catch {}
    return { response, data, raw };
  }

  async function waitForHealth() {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error('Test server exited: ' + output);
      try {
        const response = await fetch(base + '/api/health');
        if (response.status === 200) return;
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error('Test server did not become healthy: ' + output);
  }

  async function submitPayment(code, method, reference, receiptDataUrl) {
    return api('/api/orders/' + code + '/payment', {
      method: 'POST',
      body: {
        phone,
        method,
        reference,
        referenceLast6: '123456',
        paidDate: new Date().toISOString().slice(0, 10),
        paidTime: '12:34',
        ...(receiptDataUrl ? { receiptDataUrl } : {})
      }
    });
  }

  try {
    await waitForHealth();

    const anonymous = await api('/api/admin/orders');
    assert.equal(anonymous.response.status, 401);

    const login = await api('/api/admin/login', {
      method: 'POST', body: { email, password }
    });
    assert.equal(login.response.status, 200, login.raw);
    const setCookie = login.response.headers.get('set-cookie') || '';
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Strict/i);
    assert.match(setCookie, /Secure/i);
    cookie = setCookie.split(';', 1)[0];
    assert.match(cookie, /^hk_admin=/);
    assert.equal((await api('/api/admin/me', { cookie })).response.status, 200);

    const csrf = await api('/api/admin/payment-accounts', {
      method: 'POST',
      cookie,
      origin: 'https://attacker.invalid',
      body: { method: 'KBZPay', accountName: 'Blocked', accountNumber: 'BLOCK-' + suffix }
    });
    assert.equal(csrf.response.status, 403);

    const servicePayload = {
      name: 'Integration Test Service',
      slug: 'integration-' + suffix,
      icon: '🧪',
      description: 'Temporary PostgreSQL integration-test service.',
      active: true,
      packages: [{ name: 'Integration Package', price: 12345, description: 'CI only' }]
    };
    const service = await api('/api/admin/services', {
      method: 'POST', cookie, body: servicePayload
    });
    assert.equal(service.response.status, 201, service.raw);
    serviceId = service.data.id;
    const catalog = await api('/api/services');
    assert.equal(catalog.response.status, 200);
    assert.ok(catalog.data.some(item => item.id === serviceId));

    let accounts = await api('/api/payment-accounts');
    assert.equal(accounts.response.status, 200);
    let method = accounts.data[0] && accounts.data[0].method;
    if (!method) {
      const account = await api('/api/admin/payment-accounts', {
        method: 'POST',
        cookie,
        body: {
          method: 'KBZPay',
          accountName: 'Disposable CI account',
          accountNumber: 'CI-' + suffix,
          instructions: 'Integration test only',
          active: true,
          displayOrder: 999
        }
      });
      assert.equal(account.response.status, 201, account.raw);
      createdAccountId = account.data.id;
      method = account.data.method;
    }
    assert.ok(method);

    const order = await api('/api/orders', {
      method: 'POST',
      body: {
        customerName: 'CI Customer',
        phone,
        serviceId,
        serviceName: 'Tampered client service name',
        packageName: 'Integration Package',
        price: 1,
        brief: 'Confirm that the server uses the saved package price.'
      }
    });
    assert.equal(order.response.status, 201, order.raw);
    const code = order.data.order_code;
    orderCodes.push(code);
    const stored = await pool.query(
      'SELECT id, service_name, package_name, price FROM orders WHERE order_code = $1',
      [code]
    );
    assert.equal(stored.rowCount, 1);
    assert.equal(stored.rows[0].service_name, servicePayload.name);
    assert.equal(stored.rows[0].package_name, 'Integration Package');
    assert.equal(Number(stored.rows[0].price), 12345);

    const tracking = await api('/api/orders/' + code + '?phone=' + encodeURIComponent(phone));
    assert.equal(tracking.response.status, 200);
    assert.equal(tracking.data.payment_status, 'unpaid');
    assert.equal(Object.hasOwn(tracking.data, 'phone'), false);
    assert.equal((await api('/api/orders/' + code + '?phone=0000000000')).response.status, 404);

    const orderId = stored.rows[0].id;
    const premature = await api('/api/admin/orders/' + orderId + '/status', {
      method: 'PATCH', cookie, body: { status: 'approved' }
    });
    assert.equal(premature.response.status, 409);
    const reviewing = await api('/api/admin/orders/' + orderId + '/status', {
      method: 'PATCH', cookie, body: { status: 'reviewing' }
    });
    assert.equal(reviewing.response.status, 200, reviewing.raw);

    const paymentSubmit = await submitPayment(code, method, 'CI-' + suffix, 'data:image/png;base64,' + pngFixture);
    assert.equal(paymentSubmit.response.status, 201, paymentSubmit.raw);
    const unpaidReview = await pool.query('SELECT payment_status FROM orders WHERE order_code = $1', [code]);
    assert.equal(unpaidReview.rows[0].payment_status, 'submitted');

    const adminPayments = await api('/api/admin/payments', { cookie });
    assert.equal(adminPayments.response.status, 200);
    const payment = adminPayments.data.find(item => item.order_code === code);
    assert.ok(payment);
    assert.equal(payment.has_receipt, true);
    assert.equal(Object.hasOwn(payment, 'receipt_data'), false);

    const deniedReceipt = await fetch(base + '/api/admin/payments/' + payment.id + '/receipt');
    assert.equal(deniedReceipt.status, 401);
    const receipt = await fetch(base + '/api/admin/payments/' + payment.id + '/receipt', {
      headers: { Cookie: cookie }
    });
    assert.equal(receipt.status, 200);
    assert.match(receipt.headers.get('content-type') || '', /^image\/png/);
    assert.match(receipt.headers.get('cache-control') || '', /private, no-store/);
    const receiptBytes = Buffer.from(await receipt.arrayBuffer());
    assert.deepEqual(receiptBytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

    const beforePaymentReview = await api('/api/admin/orders/' + orderId + '/status', {
      method: 'PATCH', cookie, body: { status: 'approved' }
    });
    assert.equal(beforePaymentReview.response.status, 409);

    const paymentApproval = await api('/api/admin/payments/' + payment.id + '/review', {
      method: 'PATCH', cookie,
      body: { status: 'approved', note: 'Manual approval integration test.' }
    });
    assert.equal(paymentApproval.response.status, 200, paymentApproval.raw);
    assert.equal(paymentApproval.data.status, 'approved');

    const approved = await api('/api/admin/orders/' + orderId + '/status', {
      method: 'PATCH', cookie, body: { status: 'approved' }
    });
    assert.equal(approved.response.status, 200, approved.raw);
    const completed = await api('/api/admin/orders/' + orderId + '/status', {
      method: 'PATCH', cookie, body: { status: 'completed' }
    });
    assert.equal(completed.response.status, 200, completed.raw);
    const terminal = await api('/api/admin/orders/' + orderId + '/status', {
      method: 'PATCH', cookie, body: { status: 'pending' }
    });
    assert.equal(terminal.response.status, 409);

    const completedTracking = await api('/api/orders/' + code + '?phone=' + encodeURIComponent(phone));
    assert.equal(completedTracking.data.status, 'completed');
    assert.equal(completedTracking.data.payment_status, 'paid');

    const secondOrder = await api('/api/orders', {
      method: 'POST',
      body: {
        customerName: 'CI Customer', phone, serviceId,
        serviceName: servicePayload.name, packageName: 'Integration Package',
        brief: 'Verify payment rejection and resubmission.'
      }
    });
    assert.equal(secondOrder.response.status, 201, secondOrder.raw);
    orderCodes.push(secondOrder.data.order_code);
    const firstAttempt = await submitPayment(secondOrder.data.order_code, method, 'CI-REJECT-' + suffix);
    assert.equal(firstAttempt.response.status, 201, firstAttempt.raw);
    const list = await api('/api/admin/payments', { cookie });
    const secondPayment = list.data.find(item => item.order_code === secondOrder.data.order_code);
    assert.ok(secondPayment);

    const rejected = await api('/api/admin/payments/' + secondPayment.id + '/review', {
      method: 'PATCH', cookie, body: { status: 'rejected', note: 'Test rejection.' }
    });
    assert.equal(rejected.response.status, 200, rejected.raw);
    const rejectedOrder = await pool.query('SELECT payment_status FROM orders WHERE order_code = $1', [secondOrder.data.order_code]);
    assert.equal(rejectedOrder.rows[0].payment_status, 'rejected');

    const retry = await submitPayment(secondOrder.data.order_code, method, 'CI-RETRY-' + suffix);
    assert.equal(retry.response.status, 201, retry.raw);
    const duplicatePending = await submitPayment(secondOrder.data.order_code, method, 'CI-DUP-' + suffix);
    assert.equal(duplicatePending.response.status, 409);

    const retryList = await api('/api/admin/payments', { cookie });
    const retryPayment = retryList.data.find(item => item.order_code === secondOrder.data.order_code && item.status === 'pending');
    assert.ok(retryPayment);
    const finalReject = await api('/api/admin/payments/' + retryPayment.id + '/review', {
      method: 'PATCH', cookie, body: { status: 'rejected', note: 'Close integration test.' }
    });
    assert.equal(finalReject.response.status, 200, finalReject.raw);

    const logout = await api('/api/admin/logout', { method: 'POST', cookie });
    assert.equal(logout.response.status, 200);
    assert.match(logout.response.headers.get('set-cookie') || '', /Max-Age=0/i);
    assert.equal((await api('/api/admin/me')).response.status, 401);
  } finally {
    await stopProcess(child);
    try {
      if (orderCodes.length) await pool.query('DELETE FROM orders WHERE order_code = ANY($1::text[])', [orderCodes]);
      if (serviceId) await pool.query('DELETE FROM services WHERE id = $1', [serviceId]);
      if (createdAccountId) await pool.query('DELETE FROM payment_accounts WHERE id = $1', [createdAccountId]);
      await pool.query('DELETE FROM admins WHERE email = $1', [email]);
    } catch {
      // The CI database is disposable; cleanup must never target a non-test database.
    }
    await pool.end();
  }
});
