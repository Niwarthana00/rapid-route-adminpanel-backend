import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database.js';

export const getRoutes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isActive, search } = req.query;
    let sql = `
      SELECT 
        r.id,
        r.route_number AS "routeNumber",
        r.name,
        r.origin_halt_id AS "originHaltId",
        h_orig.name AS "originHaltName",
        r.destination_halt_id AS "destinationHaltId",
        h_dest.name AS "destinationHaltName",
        r.total_distance_km::NUMERIC AS "distanceKm",
        r.estimated_duration_mins AS "durationMinutes",
        r.is_active AS "isActive",
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', rh.id,
                'routeId', rh.route_id,
                'haltId', rh.halt_id,
                'haltName', h.name,
                'sequence', rh.sequence_order,
                'distanceFromOriginKm', rh.distance_from_origin_km::NUMERIC,
                'etaMinutes', rh.travel_time_from_origin_mins
              ) ORDER BY rh.sequence_order ASC
            )
            FROM core.route_halts rh
            JOIN core.halts h ON h.id = rh.halt_id
            WHERE rh.route_id = r.id
          ),
          '[]'::jsonb
        ) AS halts
      FROM core.routes r
      JOIN core.halts h_orig ON h_orig.id = r.origin_halt_id
      JOIN core.halts h_dest ON h_dest.id = r.destination_halt_id
      WHERE 1=1
    `;

    const params: any[] = [];
    if (isActive !== undefined) {
      params.push(isActive === 'true');
      sql += ` AND r.is_active = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (r.route_number ILIKE $${params.length} OR r.name ILIKE $${params.length})`;
    }

    sql += ` ORDER BY r.route_number ASC LIMIT 100`;
    const result = await query(sql, params);

    const routes = result.rows.map((r) => ({
      ...r,
      distanceKm: Number(r.distanceKm),
      durationMinutes: Number(r.durationMinutes),
      halts: (r.halts || []).map((h: any) => ({
        ...h,
        sequence: Number(h.sequence),
        distanceFromOriginKm: Number(h.distanceFromOriginKm),
        etaMinutes: Number(h.etaMinutes),
      })),
    }));

    res.json(routes);
  } catch (error) {
    next(error);
  }
};

export const getRouteById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT 
        r.id,
        r.route_number AS "routeNumber",
        r.name,
        r.origin_halt_id AS "originHaltId",
        h_orig.name AS "originHaltName",
        r.destination_halt_id AS "destinationHaltId",
        h_dest.name AS "destinationHaltName",
        r.total_distance_km::NUMERIC AS "distanceKm",
        r.estimated_duration_mins AS "durationMinutes",
        r.is_active AS "isActive",
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', rh.id,
                'routeId', rh.route_id,
                'haltId', rh.halt_id,
                'haltName', h.name,
                'sequence', rh.sequence_order,
                'distanceFromOriginKm', rh.distance_from_origin_km::NUMERIC,
                'etaMinutes', rh.travel_time_from_origin_mins
              ) ORDER BY rh.sequence_order ASC
            )
            FROM core.route_halts rh
            JOIN core.halts h ON h.id = rh.halt_id
            WHERE rh.route_id = r.id
          ),
          '[]'::jsonb
        ) AS halts
      FROM core.routes r
      JOIN core.halts h_orig ON h_orig.id = r.origin_halt_id
      JOIN core.halts h_dest ON h_dest.id = r.destination_halt_id
      WHERE r.id = $1
    `;
    const result = await query(sql, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const r = result.rows[0];
    res.json({
      ...r,
      distanceKm: Number(r.distanceKm),
      durationMinutes: Number(r.durationMinutes),
      halts: (r.halts || []).map((h: any) => ({
        ...h,
        sequence: Number(h.sequence),
        distanceFromOriginKm: Number(h.distanceFromOriginKm),
        etaMinutes: Number(h.etaMinutes),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const createRoute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      routeNumber,
      name,
      originHaltId,
      destinationHaltId,
      distanceKm,
      durationMinutes,
      isActive,
      halts,
    } = req.body;

    if (!routeNumber || !name || !originHaltId || !destinationHaltId || !distanceKm || !durationMinutes) {
      return res.status(400).json({ error: 'Missing required route fields' });
    }

    const sql = `
      INSERT INTO core.routes (
        route_number, name, origin_halt_id, destination_halt_id,
        total_distance_km, estimated_duration_mins, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id,
        route_number AS "routeNumber",
        name,
        origin_halt_id AS "originHaltId",
        destination_halt_id AS "destinationHaltId",
        total_distance_km::NUMERIC AS "distanceKm",
        estimated_duration_mins AS "durationMinutes",
        is_active AS "isActive"
    `;

    const result = await query(sql, [
      routeNumber,
      name,
      originHaltId,
      destinationHaltId,
      distanceKm,
      durationMinutes,
      isActive !== undefined ? isActive : true,
    ]);

    const newRoute = result.rows[0];

    // Insert intermediate halts if provided
    if (halts && Array.isArray(halts)) {
      for (const h of halts) {
        await query(
          `INSERT INTO core.route_halts (route_id, halt_id, sequence_order, distance_from_origin_km, travel_time_from_origin_mins)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [newRoute.id, h.haltId, h.sequence, h.distanceFromOriginKm || 0, h.etaMinutes || 0]
        );
      }
    }

    // Fetch complete created route
    const completeRes = await query(
      `
      SELECT 
        r.id,
        r.route_number AS "routeNumber",
        r.name,
        r.origin_halt_id AS "originHaltId",
        h_orig.name AS "originHaltName",
        r.destination_halt_id AS "destinationHaltId",
        h_dest.name AS "destinationHaltName",
        r.total_distance_km::NUMERIC AS "distanceKm",
        r.estimated_duration_mins AS "durationMinutes",
        r.is_active AS "isActive",
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', rh.id,
                'routeId', rh.route_id,
                'haltId', rh.halt_id,
                'haltName', h.name,
                'sequence', rh.sequence_order,
                'distanceFromOriginKm', rh.distance_from_origin_km::NUMERIC,
                'etaMinutes', rh.travel_time_from_origin_mins
              ) ORDER BY rh.sequence_order ASC
            )
            FROM core.route_halts rh
            JOIN core.halts h ON h.id = rh.halt_id
            WHERE rh.route_id = r.id
          ),
          '[]'::jsonb
        ) AS halts
      FROM core.routes r
      JOIN core.halts h_orig ON h_orig.id = r.origin_halt_id
      JOIN core.halts h_dest ON h_dest.id = r.destination_halt_id
      WHERE r.id = $1
    `,
      [newRoute.id]
    );

    res.status(201).json(completeRes.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateRoute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      routeNumber,
      name,
      originHaltId,
      destinationHaltId,
      distanceKm,
      durationMinutes,
      isActive,
      halts,
    } = req.body;

    const sql = `
      UPDATE core.routes
      SET 
        route_number = COALESCE($1, route_number),
        name = COALESCE($2, name),
        origin_halt_id = COALESCE($3, origin_halt_id),
        destination_halt_id = COALESCE($4, destination_halt_id),
        total_distance_km = COALESCE($5, total_distance_km),
        estimated_duration_mins = COALESCE($6, estimated_duration_mins),
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
      WHERE id = $8
      RETURNING id
    `;

    const result = await query(sql, [
      routeNumber || null,
      name || null,
      originHaltId || null,
      destinationHaltId || null,
      distanceKm || null,
      durationMinutes || null,
      isActive !== undefined ? isActive : null,
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    if (halts && Array.isArray(halts)) {
      await query('DELETE FROM core.route_halts WHERE route_id = $1', [id]);
      for (const h of halts) {
        await query(
          `INSERT INTO core.route_halts (route_id, halt_id, sequence_order, distance_from_origin_km, travel_time_from_origin_mins)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [id, h.haltId, h.sequence, h.distanceFromOriginKm || 0, h.etaMinutes || 0]
        );
      }
    }

    const updated = await query(
      `
      SELECT 
        r.id,
        r.route_number AS "routeNumber",
        r.name,
        r.origin_halt_id AS "originHaltId",
        h_orig.name AS "originHaltName",
        r.destination_halt_id AS "destinationHaltId",
        h_dest.name AS "destinationHaltName",
        r.total_distance_km::NUMERIC AS "distanceKm",
        r.estimated_duration_mins AS "durationMinutes",
        r.is_active AS "isActive",
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', rh.id,
                'routeId', rh.route_id,
                'haltId', rh.halt_id,
                'haltName', h.name,
                'sequence', rh.sequence_order,
                'distanceFromOriginKm', rh.distance_from_origin_km::NUMERIC,
                'etaMinutes', rh.travel_time_from_origin_mins
              ) ORDER BY rh.sequence_order ASC
            )
            FROM core.route_halts rh
            JOIN core.halts h ON h.id = rh.halt_id
            WHERE rh.route_id = r.id
          ),
          '[]'::jsonb
        ) AS halts
      FROM core.routes r
      JOIN core.halts h_orig ON h_orig.id = r.origin_halt_id
      JOIN core.halts h_dest ON h_dest.id = r.destination_halt_id
      WHERE r.id = $1
    `,
      [id]
    );

    res.json(updated.rows[0]);
  } catch (error) {
    next(error);
  }
};
