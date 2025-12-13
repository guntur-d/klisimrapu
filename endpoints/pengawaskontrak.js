/**
 * Pengawas-Kontrak endpoints (ESM-compatible Fastify plugin)
 *
 * Provides real persistence for Pengawas-Kontrak assignments:
 * - POST /api/pengawas-kontrak
 *     Assign one Pengawas to multiple Kontrak with SK metadata (supports multipart with SK PDF).
 * - GET /api/pengawas-kontrak
 *     List assignments filtered by pengawasId / kontrakId / active.
 */

import PengawasKontrak from '../models/PengawasKontrak.js';
import Kontrak from '../models/Kontrak.js';
import User from '../models/User.js';

const pengawasKontrakRouter = async (fastify) => {
  /**
   * Helper: extract primitive value from fastify-multipart field or raw value
   */
  const fieldValue = (field) => {
    if (!field) return null;
    if (typeof field === 'string') return field;
    if (typeof field === 'number') return String(field);
    if (typeof field === 'object' && typeof field.value === 'string') return field.value;
    return null;
  };

  /**
   * Helper: normalize kontrakIds from possible shapes:
   * - kontrakIds[]
   * - kontrakIds
   * - body fields as multipart objects
   */
  const normalizeKontrakIds = (body) => {
    let source =
      body['kontrakIds[]'] ||
      body.kontrakIds ||
      body['kontrakIds'] ||
      [];

    if (!Array.isArray(source)) {
      source = [source];
    }

    return source
      .map(fieldValue)
      .filter((v) => typeof v === 'string' && v.trim().length > 0);
  };

  /**
   * GET /api/pengawas-kontrak
   *
   * Query params:
   * - pengawasId (optional) : filter by pengawas
   * - kontrakId (optional)  : filter by kontrak
   * - active (optional)     : true/false, default true if provided
   *
   * Returns:
   * - data: [
   *     {
   *       _id,
   *       pengawasId,
   *       kontrakId,
   *       skNumber,
   *       skDate,
   *       skFile: { filename, contentType, size, uploadDate } | undefined,
   *       active
   *     }
   *   ]
   */
  fastify.get('/pengawas-kontrak', async (request, reply) => {
    try {
      const { pengawasId, kontrakId, active } = request.query || {};

      const filter = {};
      if (pengawasId) filter.pengawasId = pengawasId;
      if (kontrakId) filter.kontrakId = kontrakId;
      if (typeof active !== 'undefined') {
        filter.active = String(active) === 'true';
      }

      const assignments = await PengawasKontrak.find(filter)
        .populate('kontrakId', 'noKontrak kodeSirupLkpp lokasi')
        .populate('pengawasId', 'username email role')
        .sort({ createdAt: -1 });

      return reply.send({
        success: true,
        data: assignments
      });
    } catch (error) {
      request.log.error({ err: error }, 'Error in GET /api/pengawas-kontrak');
      return reply
        .code(500)
        .send({ success: false, message: 'Gagal memuat penugasan pengawas' });
    }
  });

  /**
   * GET /api/pengawas-kontrak/:assignmentId/sk-file
   *
   * Stream SK PDF for a specific assignment.
   * Requires Authorization header (handled by global auth middleware).
   */
  fastify.get('/pengawas-kontrak/:assignmentId/sk-file', async (request, reply) => {
    try {
      const { assignmentId } = request.params || {};
      if (!assignmentId) {
        return reply.code(400).send({
          success: false,
          message: 'ID penugasan tidak valid'
        });
      }

      const assignment = await PengawasKontrak.findById(assignmentId);
      if (!assignment || !assignment.skFile || !assignment.skFile.filename) {
        return reply.code(404).send({
          success: false,
          message: 'File SK tidak ditemukan untuk penugasan ini'
        });
      }

      const { filename, contentType, data } = assignment.skFile;

      if (!data) {
        // We only stored metadata (size, filename) but no binary
        return reply.code(404).send({
          success: false,
          message: 'File SK belum disimpan dalam sistem'
        });
      }

      // data may already be a Buffer or a Mongoose Binary
      const buf = Buffer.isBuffer(data)
        ? data
        : Buffer.from(data.buffer || data.data || []);

      reply
        .header('Content-Type', contentType || 'application/pdf')
        .header('Content-Disposition', `inline; filename="${filename || 'SK.pdf'}"`)
        .send(buf);
    } catch (error) {
      request.log.error({ err: error }, 'Error in GET /api/pengawas-kontrak/:assignmentId/sk-file');
      return reply
        .code(500)
        .send({ success: false, message: 'Gagal mengambil file SK penugasan' });
    }
  });

  /**
   * POST /api/pengawas-kontrak
   *
   * Body (multipart/form-data or JSON):
   * - pengawasId        (required)
   * - kontrakIds[]      (required, one or more)
   * - skNumber          (optional)
   * - skDate            (optional, yyyy-mm-dd)
   * - skFile (file)     (optional, PDF)
   *
   * Behavior:
   * - Validates pengawasId exists and is role 'pengawas' (soft check).
   * - Validates each kontrakId exists.
   * - Creates/updates PengawasKontrak for each kontrakId.
   * - Stores SK metadata on each assignment.
   */
  fastify.post('/pengawas-kontrak', async (request, reply) => {
    try {
      const body = request.body || {};

      // Extract core fields
      const pengawasIdRaw = body.pengawasId || body['pengawasId'];
      const pengawasId = fieldValue(pengawasIdRaw);
      const kontrakIds = normalizeKontrakIds(body);

      if (!pengawasId || !kontrakIds.length) {
        return reply.code(400).send({
          success: false,
          message: 'pengawasId dan kontrakIds wajib diisi'
        });
      }

      // Extract SK metadata
      const skNumber = fieldValue(body.skNumber || body['skNumber']) || null;
      const skDateRaw = fieldValue(body.skDate || body['skDate']);
      const skDate = skDateRaw ? new Date(skDateRaw) : null;

      // Handle optional SK file (if present & parsed by fastify-multipart)
      let skFileMeta = null;
      const skFileField = body.skFile || body['skFile'];
      if (skFileField && skFileField.type === 'file') {
        try {
          const fileBuffer = await skFileField.toBuffer();
          skFileMeta = {
            filename: skFileField.filename,
            contentType: skFileField.mimetype,
            size: fileBuffer.length,
            uploadDate: new Date(),
            data: fileBuffer
          };
        } catch (e) {
          request.log.error({ err: e }, 'Gagal membaca buffer file SK');
        }
      }

      // Optional: validate pengawas user
      const pengawasUser = await User.findById(pengawasId).lean();
      if (!pengawasUser) {
        return reply.code(400).send({
          success: false,
          message: 'Pengawas tidak ditemukan'
        });
      }

      // Optional: ensure role pengawas (soft constraint)
      if (pengawasUser.role !== 'pengawas' && pengawasUser.role !== 'admin') {
        // Allow admin as override if desired; adjust logic per policy
        request.log.warn(
          { pengawasId, role: pengawasUser.role },
          'Assigning non-pengawas role as pengawas-kontrak'
        );
      }

      // Validate kontrak existence (soft, continue on missing)
      const validKontrakIds = [];
      for (const id of kontrakIds) {
        if (!id) continue;
        const exists = await Kontrak.exists({ _id: id });
        if (exists) {
          validKontrakIds.push(id);
        } else {
          request.log.warn({ kontrakId: id }, 'Kontrak tidak ditemukan, dilewati');
        }
      }

      if (!validKontrakIds.length) {
        return reply.code(400).send({
          success: false,
          message: 'Tidak ada kontrak yang valid untuk ditugaskan'
        });
      }

      // Determine audit user (if auth plugin set request.user)
      const actingUserId =
        (request.user && request.user._id) ||
        (request.user && request.user.userId) ||
        null;

      // Upsert assignments for each valid kontrakId
      const results = [];
      for (const kontrakId of validKontrakIds) {
        const update = {
          pengawasId,
          kontrakId,
          skNumber: skNumber || undefined,
          skDate: skDate || undefined,
          active: true,
          updatedBy: actingUserId || undefined
        };

        if (skFileMeta) {
          update.skFile = skFileMeta;
        }

        const assignment = await PengawasKontrak.findOneAndUpdate(
          { pengawasId, kontrakId },
          {
            $set: update,
            $setOnInsert: {
              createdBy: actingUserId || undefined
            }
          },
          {
            upsert: true,
            new: true
          }
        );

        results.push(assignment);
      }

      request.log.info(
        {
          pengawasId,
          kontrakCount: results.length
        },
        'Pengawas-kontrak assignments saved'
      );

      return reply.send({
        success: true,
        message: 'Penugasan pengawas berhasil disimpan',
        data: results
      });
    } catch (error) {
      request.log.error({ err: error }, 'Error in POST /api/pengawas-kontrak');
      return reply
        .code(500)
        .send({ success: false, message: 'Gagal menyimpan penugasan pengawas' });
    }
  });
};

export default pengawasKontrakRouter;