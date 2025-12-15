import 'dotenv/config';
import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import db from './models/db.js';

// Import all endpoint handlers
import authRouter from './endpoints/auth.js';
import urusanRouter from './endpoints/urusan.js';
import bidangRouter from './endpoints/bidang.js';
import programRouter from './endpoints/program.js';
import kegiatanRouter from './endpoints/kegiatan.js';
import subKegiatanRoutes from './endpoints/subkegiatan.js';
import perangkatDaerahRouter from './endpoints/perangkatdaerah.js';
import subPerangkatDaerahRouter from './endpoints/subperangkatdaerah.js';
import kodeRekeningRouter from './endpoints/koderekening.js';
import anggaranRouter from './endpoints/anggaran.js';
import kinerjaRouter from './endpoints/kinerja.js';
import realisasiRouter from './endpoints/realisasi.js';
import pencapaianRouter from './endpoints/pencapaian.js';
import evaluasiKinerjaRouter from './endpoints/evaluasiKinerja.js';
import evaluasiRealisasiRouter from './endpoints/evaluasiRealisasi.js';
import penyediaRouter from './endpoints/penyedia.js';
import pejabatRouter, { checkPositionHandler } from './endpoints/pejabat.js';
import jenisPengadaanRouter from './endpoints/jenispengadaan.js';
import metodePengadaanRouter from './endpoints/metodepengadaan.js';
import pengadaanRouter from './endpoints/pengadaan.js';
import paketKegiatanRouter from './endpoints/paketkegiatan.js';
import kontrakRouter from './endpoints/kontrak.js';
import targetRouter from './endpoints/target.js';
import terminRouter from './endpoints/termin.js';
import jaminanRouter from './endpoints/jaminan.js';
import vendorRouter from './endpoints/vendor.js';
import monitoringRouter from './endpoints/monitoring.js';
import userRouter from './endpoints/user.js';
import { getAll, getById, create, update, remove, getActive } from './endpoints/sumberdana.js';
const sumberDanaRouter = { getAll, getById, create, update, remove, getActive };
import pengawasKontrakRouter from './endpoints/pengawaskontrak.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Fastify
const server = fastify({
  logger: true
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// JWT verification function
const verifyToken = (token) => {
  try {
    if (!token || token.length < 10) {
      return { valid: false, error: 'Invalid token format' };
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

// Register plugins
await server.register(fastifyCors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

await server.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/',
  index: 'index.html'
});

await server.register(fastifyMultipart, {
  attachFieldsToBody: true,
  sharedSchemaId: '#multipart'
});

// Connect to database
db;

async function authMiddleware(request, reply) {
  if (request.url.startsWith('/api/auth')) {
    return; // Skip auth for auth endpoints
  }

  if (request.url.includes('/fix-users')) {
    return; // Skip auth for fix endpoints
  }

  if (!request.url.startsWith('/api/')) {
    return; // Skip auth for static files
  }

  // Check JWT token for all other API routes
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({
      message: 'Unauthorized: No token provided',
      error: 'No token provided'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const tokenCheck = verifyToken(token);

  if (!tokenCheck.valid) {
    return reply.code(401).send({
      message: 'Unauthorized: Invalid or missing token',
      error: tokenCheck.error
    });
  }

  // Add user info to request for use in endpoints
  request.user = tokenCheck.decoded;

  console.log('🔐 Authenticated user for:', request.url, 'User:', request.user?.username);
};

// Register authentication middleware for all API routes
server.addHook('preHandler', authMiddleware);

// API Routes

// Auth routes (no auth required)
server.register(async function (fastify, opts) {
  fastify.post('/auth/register', authRouter);
  fastify.post('/auth/login', authRouter);
  fastify.post('/auth/select-year', authRouter);
  fastify.get('/auth/health', authRouter);
}, { prefix: '/api' });

// Protected routes (auth required)
server.register(async function (fastify, opts) {
  fastify.get('/urusan', urusanRouter);
  fastify.post('/urusan', urusanRouter);
  fastify.get('/urusan/:id', urusanRouter);
  fastify.put('/urusan/:id', urusanRouter);
  fastify.delete('/urusan/:id', urusanRouter);
  fastify.post('/urusan/:id/bidang', urusanRouter);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/bidang', bidangRouter);
  fastify.post('/bidang', bidangRouter);
  fastify.get('/bidang/:id', bidangRouter);
  fastify.put('/bidang/:id', bidangRouter);
  fastify.delete('/bidang/:id', bidangRouter);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/program', programRouter);
  fastify.post('/program', programRouter);
  fastify.get('/program/:id', programRouter);
  fastify.put('/program/:id', programRouter);
  fastify.delete('/program/:id', programRouter);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/kegiatan', kegiatanRouter);
  fastify.post('/kegiatan', kegiatanRouter);
  fastify.get('/kegiatan/:id', kegiatanRouter);
  fastify.put('/kegiatan/:id', kegiatanRouter);
  fastify.delete('/kegiatan/:id', kegiatanRouter);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/subkegiatan', subKegiatanRoutes.getAll);
  fastify.post('/subkegiatan', subKegiatanRoutes.create);
  fastify.get('/subkegiatan/:id', subKegiatanRoutes.getById);
  fastify.put('/subkegiatan/:id', subKegiatanRoutes.update);
  fastify.delete('/subkegiatan/:id', subKegiatanRoutes.remove);
  fastify.get('/subkegiatan/kegiatan/:kegiatanId', subKegiatanRoutes.getByKegiatanId);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/perangkatdaerah', perangkatDaerahRouter);
  fastify.post('/perangkatdaerah', perangkatDaerahRouter);
  fastify.get('/perangkatdaerah/:id', perangkatDaerahRouter);
  fastify.put('/perangkatdaerah/:id', perangkatDaerahRouter);
  fastify.delete('/perangkatdaerah/:id', perangkatDaerahRouter);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/subperangkatdaerah', subPerangkatDaerahRouter);
  fastify.post('/subperangkatdaerah', subPerangkatDaerahRouter);
  fastify.get('/subperangkatdaerah/:id', subPerangkatDaerahRouter);
  fastify.put('/subperangkatdaerah/:id', subPerangkatDaerahRouter);
  fastify.delete('/subperangkatdaerah/:id', subPerangkatDaerahRouter);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/koderekening', kodeRekeningRouter.getAll);
  fastify.post('/koderekening', kodeRekeningRouter.create);
  fastify.get('/koderekening/:id', kodeRekeningRouter.getById);
  fastify.put('/koderekening/:id', kodeRekeningRouter.update);
  fastify.delete('/koderekening/:id', kodeRekeningRouter.remove);
  fastify.get('/koderekening/search/:query', kodeRekeningRouter.search);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/anggaran', anggaranRouter);
  fastify.post('/anggaran', anggaranRouter);
  fastify.get('/anggaran/:id', anggaranRouter);
  fastify.put('/anggaran/:id', anggaranRouter);
  fastify.delete('/anggaran/:id', anggaranRouter);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/kinerja', kinerjaRouter);
  fastify.post('/kinerja', kinerjaRouter);
  fastify.get('/kinerja/:id', kinerjaRouter);
  fastify.put('/kinerja/:id', kinerjaRouter);
  fastify.delete('/kinerja/:id', kinerjaRouter);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/realisasi', realisasiRouter);
  fastify.post('/realisasi', realisasiRouter);
  fastify.get('/realisasi/:id', realisasiRouter);
  fastify.put('/realisasi/:id', realisasiRouter);
  fastify.delete('/realisasi/:id', realisasiRouter);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/pencapaian', pencapaianRouter);
  fastify.post('/pencapaian', pencapaianRouter);
  fastify.get('/pencapaian/:id', pencapaianRouter);
  fastify.put('/pencapaian/:id', pencapaianRouter);
  fastify.delete('/pencapaian/:id', pencapaianRouter);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/evaluasi-kinerja', evaluasiKinerjaRouter);
  fastify.post('/evaluasi-kinerja', evaluasiKinerjaRouter);
  fastify.get('/evaluasi-kinerja/:id', evaluasiKinerjaRouter);
  fastify.put('/evaluasi-kinerja/:id', evaluasiKinerjaRouter);
  fastify.delete('/evaluasi-kinerja/:id', evaluasiKinerjaRouter);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/evaluasi-realisasi', evaluasiRealisasiRouter);
  fastify.post('/evaluasi-realisasi', evaluasiRealisasiRouter);
  fastify.get('/evaluasi-realisasi/:id', evaluasiRealisasiRouter);
  fastify.put('/evaluasi-realisasi/:id', evaluasiRealisasiRouter);
  fastify.delete('/evaluasi-realisasi/:id', evaluasiRealisasiRouter);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/penyedia', penyediaRouter);
  fastify.post('/penyedia', penyediaRouter);
  fastify.get('/penyedia/:id', penyediaRouter);
  fastify.put('/penyedia/:id', penyediaRouter);
  fastify.delete('/penyedia/:id', penyediaRouter);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/pejabat', pejabatRouter);
  fastify.post('/pejabat', pejabatRouter);
  fastify.get('/pejabat/:id', pejabatRouter);
  fastify.put('/pejabat/:id', pejabatRouter);
  fastify.delete('/pejabat/:id', pejabatRouter);
  // Add check position endpoint
  fastify.get('/pejabat/check-position', checkPositionHandler);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/jenis-pengadaan', jenisPengadaanRouter);
  fastify.post('/jenis-pengadaan', jenisPengadaanRouter);
  fastify.get('/jenis-pengadaan/:id', jenisPengadaanRouter);
  fastify.put('/jenis-pengadaan/:id', jenisPengadaanRouter);
  fastify.delete('/jenis-pengadaan/:id', jenisPengadaanRouter);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/metode-pengadaan', metodePengadaanRouter);
  fastify.post('/metode-pengadaan', metodePengadaanRouter);
  fastify.get('/metode-pengadaan/:id', metodePengadaanRouter);
  fastify.put('/metode-pengadaan/:id', metodePengadaanRouter);
  fastify.delete('/metode-pengadaan/:id', metodePengadaanRouter);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/pengadaan', pengadaanRouter);
  fastify.post('/pengadaan', pengadaanRouter);
  fastify.get('/pengadaan/:id', pengadaanRouter);
  fastify.put('/pengadaan/:id', pengadaanRouter);
  fastify.delete('/pengadaan/:id', pengadaanRouter);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/paketkegiatan', paketKegiatanRouter);
  fastify.post('/paketkegiatan', paketKegiatanRouter);
  fastify.get('/paketkegiatan/:id', paketKegiatanRouter);
  fastify.put('/paketkegiatan/:id', paketKegiatanRouter);
  fastify.delete('/paketkegiatan/:id', paketKegiatanRouter);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.route({
    method: ['GET', 'POST', 'PUT', 'DELETE'],
    url: '/kontrak*',
    handler: kontrakRouter
  });
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.route({
    method: ['GET', 'POST', 'PUT', 'DELETE'],
    url: '/target*',
    handler: targetRouter
  });
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.route({
    method: ['GET', 'POST', 'PUT', 'DELETE'],
    url: '/termin*',
    handler: terminRouter
  });
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.route({
    method: ['GET', 'POST', 'PUT', 'DELETE'],
    url: '/jaminan*',
    handler: jaminanRouter
  });
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.route({
    method: ['GET', 'POST', 'PUT', 'DELETE'],
    url: '/vendor*',
    handler: vendorRouter
  });
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.route({
    method: ['GET', 'POST', 'PUT', 'DELETE'],
    url: '/monitoring*',
    handler: monitoringRouter
  });
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/user', userRouter);
  fastify.post('/user', userRouter);
  fastify.get('/user/:id', userRouter);
  fastify.put('/user/:id', userRouter);
  fastify.delete('/user/:id', userRouter);
}, { prefix: '/api' });

server.register(async function (fastify, opts) {
  fastify.get('/sumberdana', sumberDanaRouter.getAll);
  fastify.get('/sumberdana/active', sumberDanaRouter.getActive);
  fastify.post('/sumberdana', sumberDanaRouter.create);
  fastify.get('/sumberdana/:id', sumberDanaRouter.getById);
  fastify.put('/sumberdana/:id', sumberDanaRouter.update);
  fastify.delete('/sumberdana/:id', sumberDanaRouter.remove);
}, { prefix: '/api' });

// Pengawas-Kontrak routes (stubbed, but prevents 404 for Pengawas Lapangan tab)
server.register(pengawasKontrakRouter, { prefix: '/api' });

// Catch-all handler for routes
server.setNotFoundHandler((request, reply) => {
  // Return 404 for API routes that don't exist
  if (request.url.startsWith('/api/')) {
    reply.code(404).send({ error: 'API route not found' });
    return;
  }

  // Serve index.html for all non-API routes to support client-side routing
  reply.sendFile('index.html');
});

// Start server
const start = async () => {
  try {
    await server.ready();
    const port = process.env.PORT || 3000;

    if (process.argv[1] === fileURLToPath(import.meta.url)) {
      await server.listen({ port, host: '0.0.0.0' });
      console.log(`🚀 Server running on http://localhost:${port}`);
      console.log(`📁 Static files served from: ${path.join(__dirname, 'public')}`);
      console.log(`🔐 API endpoints available at: http://localhost:${port}/api`);
    }
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
  return server;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start();
}

export default async function (req, res) {
  const app = await start();
  app.server.emit('request', req, res);
}

//yeah yeah updated env need to repush