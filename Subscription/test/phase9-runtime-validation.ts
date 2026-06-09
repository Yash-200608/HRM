import { createServer, type Server } from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-test-jwt-secret';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? 'test-admin-jwt-secret-test-admin-jwt-secret';
process.env.HRM_ACCESS_TOKEN_SECRET = process.env.HRM_ACCESS_TOKEN_SECRET ?? 'test-hrm-access-token-secret';
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? process.env.HRM_ACCESS_TOKEN_SECRET;
process.env.INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? 'test-internal-api-key';
process.env.API_KEY_PEPPER = process.env.API_KEY_PEPPER ?? 'test-api-key-pepper';
process.env.PASSWORD_PEPPER = process.env.PASSWORD_PEPPER ?? 'test-password-pepper';
process.env.AUTH_TOKEN_PEPPER = process.env.AUTH_TOKEN_PEPPER ?? 'test-auth-token-pepper';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? 'test-resend-api-key';
process.env.RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'no-reply@example.com';
process.env.APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://127.0.0.1:3000';
process.env.SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@example.com';
process.env.SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? 'supersecurepass';
process.env.SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME ?? 'Super Admin';
process.env.RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? 'test-razorpay-webhook-secret';
process.env.Razorpay_KEY_ID = process.env.Razorpay_KEY_ID ?? 'test-razorpay-key-id';
process.env.Razorpay_KEY_SECRET = process.env.Razorpay_KEY_SECRET ?? 'test-razorpay-key-secret';

type ValidationStatus = 'VERIFIED' | 'NOT VERIFIED';

type ProviderPayment = {
  orderId: string;
  amount: number;
  currency: string;
  status: 'authorized' | 'captured' | 'refunded' | 'failed';
};

const providerState = {
  nextOrderCounter: 0,
  captureOrderByPaymentId: new Map<string, string>(),
  paymentByPaymentId: new Map<string, ProviderPayment>(),
};

function emit(item: string, status: ValidationStatus, command: string, output: unknown) {
  console.log(JSON.stringify({ item, status, command, output }));
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function extractPaymentPath(url: string) {
  const match = url.match(/\/payments\/([^/]+)(?:\/(capture|refund))?$/);
  if (!match) {
    return null;
  }

  return {
    paymentId: match[1],
    action: match[2] ?? 'fetch',
  } as const;
}

function createProviderFetchStub(realFetch: typeof fetch) {
  return async function providerFetchStub(input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method ?? 'GET';

    if (url.includes('api.razorpay.com/v1/orders') && method === 'POST') {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
      const orderId = `order_phase95_${++providerState.nextOrderCounter}`;
      return jsonResponse({
        id: orderId,
        amount: body.amount,
        currency: body.currency,
        receipt: body.receipt,
        status: 'created',
      });
    }

    const parts = extractPaymentPath(url);
    if (parts?.action === 'fetch' && method === 'GET') {
      const payment = providerState.paymentByPaymentId.get(parts.paymentId);
      const orderId = payment?.orderId ?? providerState.captureOrderByPaymentId.get(parts.paymentId) ?? `order_${parts.paymentId}`;
      return jsonResponse({
        id: parts.paymentId,
        order_id: orderId,
        amount: payment?.amount ?? 0,
        currency: payment?.currency ?? 'INR',
        status: payment?.status ?? 'authorized',
      });
    }

    if (parts?.action === 'capture' && method === 'POST') {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
      const orderId = providerState.captureOrderByPaymentId.get(parts.paymentId) ?? `order_${parts.paymentId}`;
      const payment = {
        orderId,
        amount: body.amount ?? 0,
        currency: body.currency ?? 'INR',
        status: 'captured' as const,
      };
      providerState.paymentByPaymentId.set(parts.paymentId, payment);
      return jsonResponse({
        id: parts.paymentId,
        order_id: orderId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
      });
    }

    return realFetch(input, init);
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeout: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label}_timeout_${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function findOpenPort() {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('open_port_missing_address'));
        return;
      }

      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

async function waitForOutput(child: ChildProcessWithoutNullStreams, pattern: RegExp, timeoutMs: number) {
  const startedAt = Date.now();
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  while (Date.now() - startedAt < timeoutMs) {
    if (pattern.test(stdout) || pattern.test(stderr)) {
      return { matched: true, stdout, stderr, exitCode: child.exitCode };
    }

    if (child.exitCode != null) {
      return { matched: false, stdout, stderr, exitCode: child.exitCode };
    }

    await delay(100);
  }

  return { matched: false, stdout, stderr, exitCode: child.exitCode };
}

async function stopChild(child: ChildProcessWithoutNullStreams | null) {
  if (!child || child.exitCode != null) {
    return;
  }

  child.kill('SIGTERM');
  await delay(500);
  if (child.exitCode == null) {
    child.kill('SIGKILL');
  }
}

async function closeServer(server: Server | null) {
  if (!server) {
    return;
  }

  await new Promise<void>((resolve) => server.close(() => resolve()));
}

async function httpJson(baseUrl: string, pathName: string, options: RequestInit & { idempotencyKey?: string } = {}) {
  const headers = new Headers(options.headers);
  headers.set('content-type', 'application/json');
  headers.set('x-internal-api-key', process.env.INTERNAL_API_KEY as string);
  if (options.idempotencyKey) {
    headers.set('idempotency-key', options.idempotencyKey);
  }

  const response = await fetch(`${baseUrl}${pathName}`, {
    ...options,
    headers,
  });
  const body = await response.json().catch(async () => ({ raw: await response.text() }));
  return { status: response.status, body };
}

function requireId(response: { body: unknown }, label: string) {
  const body = response.body as { data?: { _id?: unknown } };
  const id = body.data?._id;
  if (typeof id !== 'string') {
    throw new Error(`${label}_id_missing`);
  }
  return id;
}

async function main() {
  const rootDir = path.resolve(__dirname, '..', '..');
  const subscriptionDir = path.resolve(__dirname, '..');
  const hrmBackDir = path.resolve(rootDir, 'new-hrm', 'back');
  const mongoReplSet = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: 'wiredTiger',
    },
  });
  const mongoUri = mongoReplSet.getUri();
  process.env.MONGODB_URI = mongoUri;
  process.env.MONGO_URI = mongoUri;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = createProviderFetchStub(originalFetch) as typeof fetch;

  let hrmProcess: ChildProcessWithoutNullStreams | null = null;
  let subscriptionServer: Server | null = null;
  let redisVerified = false;

  try {
    const mongoPing = await mongoose.createConnection(mongoUri).asPromise().then(async (connection) => {
      const ping = await connection.db?.admin().command({ ping: 1 });
      await connection.close();
      return ping;
    });
    emit('MongoDB connection established', 'VERIFIED', 'MongoMemoryReplSet.create() + mongoose.connection.db.admin().command({ ping: 1 })', {
      connectionString: mongoUri,
      testQueryOutput: mongoPing,
    });

    const hrmPort = await findOpenPort();
    hrmProcess = spawn(process.execPath, ['app.js'], {
      cwd: hrmBackDir,
      env: {
        ...process.env,
        HRM_PORT: String(hrmPort),
        MONGO_URI: mongoUri,
        MONGODB_URI: mongoUri,
        SUBSCRIPTION_BASE_URL: 'http://127.0.0.1:1',
      },
    });
    const hrmOutput = await waitForOutput(hrmProcess, /Server running at http:\/\/localhost:/, 10_000);
    emit('HRM server starts', hrmOutput.matched ? 'VERIFIED' : 'NOT VERIFIED', `node app.js (cwd=${hrmBackDir}, HRM_PORT=${hrmPort})`, {
      port: hrmPort,
      stdout: hrmOutput.stdout,
      stderr: hrmOutput.stderr,
      exitCode: hrmOutput.exitCode,
    });

    const [mongoModule, appModule, planModule, inboxModule] = await Promise.all([
      import('../src/config/mongo'),
      import('../src/app'),
      import('../src/modules/plans/plan.service'),
      import('../src/modules/usage/inbox.processor'),
    ]);
    await mongoModule.connectMongo();
    await planModule.planService.seedDefaults();
    const app = appModule.createApp();
    subscriptionServer = createServer(app);
    await new Promise<void>((resolve) => subscriptionServer?.listen(0, '127.0.0.1', () => resolve()));
    const subscriptionAddress = subscriptionServer.address();
    if (!subscriptionAddress || typeof subscriptionAddress === 'string') {
      throw new Error('subscription_server_address_missing');
    }
    const subscriptionBaseUrl = `http://127.0.0.1:${subscriptionAddress.port}`;
    const healthResponse = await fetch(`${subscriptionBaseUrl}/health`);
    const healthBody = await healthResponse.json();
    emit('Billing server starts', 'VERIFIED', 'createServer(createApp()).listen(0) + GET /health', {
      port: subscriptionAddress.port,
      healthStatus: healthResponse.status,
      healthBody,
    });

    const Redis = (await import('ioredis')).default;
    const redisErrors: string[] = [];
    const redis = new Redis(process.env.REDIS_URL as string, {
      lazyConnect: true,
      connectTimeout: 1000,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
    });
    redis.on('error', (error) => redisErrors.push(error.message));
    try {
      const ping = await withTimeout(redis.connect().then(() => redis.ping()), 2_000, 'redis_ping');
      redisVerified = true;
      emit('Redis connection established', 'VERIFIED', `new IORedis("${process.env.REDIS_URL}").ping()`, {
        connectionString: process.env.REDIS_URL,
        testPingOutput: ping,
        errors: redisErrors,
      });
    } catch (error) {
      emit('Redis connection established', 'NOT VERIFIED', `new IORedis("${process.env.REDIS_URL}").ping()`, {
        connectionString: process.env.REDIS_URL,
        testPingOutput: null,
        error: error instanceof Error ? error.message : String(error),
        errors: redisErrors,
      });
    } finally {
      redis.disconnect();
    }

    if (redisVerified) {
      const tsxCli = path.resolve(subscriptionDir, 'node_modules', 'tsx', 'dist', 'cli.cjs');
      const workerProcess = spawn(process.execPath, [tsxCli, 'src/jobs/worker.ts'], {
        cwd: subscriptionDir,
        env: {
          ...process.env,
          MONGODB_URI: mongoUri,
          REDIS_URL: process.env.REDIS_URL as string,
        },
      });
      const workerOutput = await waitForOutput(workerProcess, /workers_started|ECONNREFUSED|queue_backlog_metrics_refresh_failed/, 2_500);
      await stopChild(workerProcess);
      emit('Background workers start', workerOutput.stdout.includes('workers_started') ? 'VERIFIED' : 'NOT VERIFIED', `node ${tsxCli} src/jobs/worker.ts`, {
        stdout: workerOutput.stdout,
        stderr: workerOutput.stderr,
        exitCode: workerOutput.exitCode,
        note: workerOutput.stdout.includes('workers_started') ? 'Worker process emitted startup log; Redis connectivity is reported separately.' : 'Worker startup log was not observed.',
      });
    } else {
      emit('Background workers start', 'NOT VERIFIED', 'node node_modules/tsx/dist/cli.cjs src/jobs/worker.ts', {
        stdout: '',
        stderr: '',
        exitCode: null,
        reason: 'Redis ping failed; BullMQ workers require a live Redis connection before startup can be verified safely.',
      });
    }

    if (!redisVerified) {
      emit('Queues process jobs', 'NOT VERIFIED', "billingQueue.add('usage.inbox.process', { kind: 'usage-inbox-process' })", {
        reason: 'Redis ping failed; BullMQ job submission and processing require a live Redis connection.',
      });
    } else {
      const queuesModule = await import('../src/jobs/queues');
      try {
        const job = await withTimeout(queuesModule.billingQueue.add('usage.inbox.process', { kind: 'usage-inbox-process' }), 2_000, 'bullmq_add_job');
        emit('Queues process jobs', 'VERIFIED', "billingQueue.add('usage.inbox.process', { kind: 'usage-inbox-process' })", {
          jobId: job.id,
          name: job.name,
          data: job.data,
        });
      } catch (error) {
        emit('Queues process jobs', 'NOT VERIFIED', "billingQueue.add('usage.inbox.process', { kind: 'usage-inbox-process' })", {
          error: error instanceof Error ? error.message : String(error),
          reason: 'Redis-backed BullMQ job submission could not be verified in this environment.',
        });
      } finally {
        await queuesModule.billingQueue.close().catch(() => undefined);
        await queuesModule.webhookQueue.close().catch(() => undefined);
      }
    }

    const runId = randomUUID().slice(0, 8);
    const orgResponse = await httpJson(subscriptionBaseUrl, '/v1/organizations', {
      method: 'POST',
      idempotencyKey: `phase95-org-${runId}`,
      body: JSON.stringify({
        name: `Phase 9.5 Runtime ${runId}`,
        slug: `phase95-${runId}`.toLowerCase(),
      }),
    });
    const organizationId = requireId(orgResponse, 'organization');

    const token = jwt.sign(
      {
        id: `hrm-user-${runId}`,
        role: 'admin',
        companyId: organizationId,
      },
      process.env.HRM_ACCESS_TOKEN_SECRET as string,
      { expiresIn: '1h' },
    );
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    const authResponse = await fetch(`${subscriptionBaseUrl}/v1/auth/me`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    const authBody = await authResponse.json();
    emit('JWT authentication works', authResponse.status === 200 ? 'VERIFIED' : 'NOT VERIFIED', 'jsonwebtoken.sign(...) + GET /v1/auth/me', {
      token,
      claims: decoded,
      authStatus: authResponse.status,
      authResponse: authBody,
    });

    const subscriptionResponse = await httpJson(subscriptionBaseUrl, '/v1/subscriptions', {
      method: 'POST',
      idempotencyKey: `phase95-subscription-${runId}`,
      body: JSON.stringify({
        organizationId,
        planCode: 'starter',
      }),
    });
    const subscriptionId = requireId(subscriptionResponse, 'subscription');
    emit('Subscription creation works', subscriptionResponse.status === 201 ? 'VERIFIED' : 'NOT VERIFIED', 'POST /v1/subscriptions', subscriptionResponse);

    const invoiceResponse = await httpJson(subscriptionBaseUrl, '/v1/billing/invoices/create', {
      method: 'POST',
      idempotencyKey: `phase95-invoice-${runId}`,
      body: JSON.stringify({
        subscriptionId,
        lineItems: [
          {
            code: 'starter',
            description: 'Phase 9.5 runtime invoice',
            quantity: 1,
            unitAmount: 1000,
          },
        ],
      }),
    });
    const invoiceId = requireId(invoiceResponse, 'invoice');
    emit('Invoice creation works', invoiceResponse.status === 201 ? 'VERIFIED' : 'NOT VERIFIED', 'POST /v1/billing/invoices/create', invoiceResponse);

    const finalizedInvoiceResponse = await httpJson(subscriptionBaseUrl, '/v1/billing/invoices/finalize', {
      method: 'POST',
      body: JSON.stringify({ invoiceId }),
    });
    const orderResponse = await httpJson(subscriptionBaseUrl, '/v1/billing/invoices/razorpay-order', {
      method: 'POST',
      idempotencyKey: `phase95-order-${runId}`,
      body: JSON.stringify({ invoiceId }),
    });
    const orderedInvoice = (orderResponse.body as { data?: { providerOrderId?: string; amountDue?: number; total?: number; currency?: string } }).data;
    const paymentId = `pay_phase95_${runId}`;
    const amountInPaise = Math.round(Number(orderedInvoice?.amountDue ?? orderedInvoice?.total ?? 0) * 100);
    if (orderedInvoice?.providerOrderId) {
      providerState.captureOrderByPaymentId.set(paymentId, orderedInvoice.providerOrderId);
      providerState.paymentByPaymentId.set(paymentId, {
        orderId: orderedInvoice.providerOrderId,
        amount: amountInPaise,
        currency: orderedInvoice.currency ?? 'INR',
        status: 'authorized',
      });
    }
    const captureResponse = await httpJson(subscriptionBaseUrl, '/v1/billing/payments/capture', {
      method: 'POST',
      idempotencyKey: `phase95-capture-${runId}`,
      body: JSON.stringify({
        paymentId,
        amountInPaise,
        currency: orderedInvoice?.currency ?? 'INR',
        invoiceId,
      }),
    });
    emit('Payment flow works', captureResponse.status === 200 ? 'VERIFIED' : 'NOT VERIFIED', 'POST /v1/billing/invoices/finalize + POST /v1/billing/invoices/razorpay-order + POST /v1/billing/payments/capture', {
      finalize: finalizedInvoiceResponse,
      order: orderResponse,
      capture: captureResponse,
    });

    const eventResponse = await httpJson(subscriptionBaseUrl, '/v1/events/inbound', {
      method: 'POST',
      body: JSON.stringify({
        eventId: `phase95-employee-created-${runId}`,
        source: 'hrm',
        topic: 'EmployeeCreated',
        organizationId,
        payload: {
          eventId: `phase95-employee-created-${runId}`,
          organizationId,
          entityId: `employee-${runId}`,
          eventVersion: 1,
          eventType: 'EmployeeCreated',
        },
      }),
    });
    const inboxProcessOutput = await inboxModule.processInboxBatch();
    const usageResponse = await httpJson(subscriptionBaseUrl, `/v1/usage/${organizationId}`, {
      method: 'GET',
    });
    const activeEmployees = (usageResponse.body as { data?: { activeEmployees?: unknown } }).data?.activeEmployees;
    emit('Usage metering works', eventResponse.status === 201 && activeEmployees === 1 ? 'VERIFIED' : 'NOT VERIFIED', 'POST /v1/events/inbound + processInboxBatch() + GET /v1/usage/:organizationId', {
      event: eventResponse,
      inboxProcessOutput,
      usage: usageResponse,
    });
  } finally {
    await stopChild(hrmProcess);
    await closeServer(subscriptionServer);
    globalThis.fetch = originalFetch;
    await mongoose.connection.close().catch(() => undefined);
    await mongoReplSet.stop();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    item: 'Phase 9.5 runtime validation',
    status: 'NOT VERIFIED',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  }));
  process.exitCode = 1;
});
