import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database.js';

export const getTrips = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, date, routeId } = req.query;
    let sql = `
      SELECT 
        t.id,
        COALESCE(
          'TRP-' || TO_CHAR(t.trip_date, 'YYYYMMDD') || '-' || LPAD(SUBSTRING(t.id::TEXT, 1, 4), 4, '0'),
          t.id::TEXT
        ) AS "tripRef",
        t.schedule_id AS "scheduleId",
        r.route_number AS "routeNumber",
        r.name AS "routeName",
        v.registration_number AS "registrationNo",
        d.full_name AS "driverName",
        t.status,
        t.trip_date::TEXT AS "serviceDate",
        COALESCE(TO_CHAR(s.departure_time, 'HH24:MI'), '06:00') AS "scheduledDeparture",
        t.departed_at::TEXT AS "departedAt",
        COALESCE(
          (SELECT current_occupancy FROM biz.trip_halt_log thl WHERE thl.trip_id = t.id ORDER BY thl.sequence_order DESC LIMIT 1),
          (SELECT COUNT(*) FROM biz.bookings b WHERE b.trip_id = t.id AND b.booking_status IN ('CONFIRMED', 'COMPLETED')),
          0
        ) AS occupancy,
        v.total_seats AS capacity,
        COALESCE(
          (SELECT sequence_order FROM biz.trip_halt_log thl WHERE thl.trip_id = t.id ORDER BY thl.sequence_order DESC LIMIT 1),
          0
        ) AS "currentHaltIndex",
        COALESCE(
          (SELECT h.name FROM biz.trip_halt_log thl JOIN core.halts h ON h.id = thl.halt_id WHERE thl.trip_id = t.id ORDER BY thl.sequence_order DESC LIMIT 1),
          h_orig.name
        ) AS "currentHaltName",
        CASE 
          WHEN t.delay_reason IS NOT NULL AND t.delay_reason ~ '^[0-9]+' THEN substring(t.delay_reason from '^([0-9]+)')::INT
          WHEN t.status = 'DELAYED' THEN 15
          ELSE 0
        END AS "delayMinutes",
        t.delay_reason AS "delayReason"
      FROM biz.trips t
      LEFT JOIN biz.schedules s ON s.id = t.schedule_id
      LEFT JOIN core.routes r ON r.id = s.route_id
      LEFT JOIN core.halts h_orig ON h_orig.id = r.origin_halt_id
      JOIN core.vehicles v ON v.id = t.vehicle_id
      JOIN core.drivers d ON d.id = t.driver_id
      WHERE 1=1
    `;

    const params: any[] = [];
    if (status) {
      params.push(status);
      sql += ` AND t.status = $${params.length}`;
    }
    if (date) {
      params.push(date);
      sql += ` AND t.trip_date = $${params.length}`;
    }
    if (routeId) {
      params.push(routeId);
      sql += ` AND s.route_id = $${params.length}`;
    }

    sql += ` ORDER BY t.trip_date DESC, s.departure_time ASC LIMIT 100`;
    const result = await query(sql, params);

    res.json(
      result.rows.map((row) => ({
        ...row,
        occupancy: Number(row.occupancy || 0),
        capacity: Number(row.capacity || 0),
        currentHaltIndex: Number(row.currentHaltIndex || 0),
        delayMinutes: Number(row.delayMinutes || 0),
      }))
    );
  } catch (error) {
    next(error);
  }
};

export const updateTripStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, delayMinutes, delayReason } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    let delayText = delayReason;
    if (delayMinutes && !delayReason) {
      delayText = `${delayMinutes} mins delay`;
    }

    const departedAtClause = status === 'DEPARTED' || status === 'IN_PROGRESS' ? 'NOW()' : 'departed_at';
    const arrivedAtClause = status === 'COMPLETED' ? 'NOW()' : 'arrived_at';

    const sql = `
      UPDATE biz.trips
      SET 
        status = $1,
        delay_reason = COALESCE($2, delay_reason),
        departed_at = CASE WHEN $1 IN ('DEPARTED', 'IN_PROGRESS') AND departed_at IS NULL THEN NOW() ELSE departed_at END,
        arrived_at = CASE WHEN $1 = 'COMPLETED' THEN NOW() ELSE arrived_at END,
        updated_at = NOW()
      WHERE id = $3
      RETURNING 
        id,
        status,
        trip_date::TEXT AS "serviceDate",
        departed_at::TEXT AS "departedAt",
        arrived_at::TEXT AS "arrivedAt",
        delay_reason AS "delayReason"
    `;

    const result = await query(sql, [status, delayText || null, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const getTripHaltLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tripRef } = req.params;

    // Find trip by ID or by ref
    let tripId = tripRef;
    if (tripRef.startsWith('TRP-')) {
      const tripMatch = await query(
        `SELECT id FROM biz.trips WHERE 'TRP-' || TO_CHAR(trip_date, 'YYYYMMDD') || '-' || LPAD(SUBSTRING(id::TEXT, 1, 4), 4, '0') = $1 LIMIT 1`,
        [tripRef]
      );
      if (tripMatch.rows.length > 0) {
        tripId = tripMatch.rows[0].id;
      }
    }

    const sql = `
      SELECT 
        thl.id,
        $1 AS "tripRef",
        thl.sequence_order AS sequence,
        h.name AS "haltName",
        TO_CHAR(thl.arrived_at, 'HH24:MI') AS "arrivedAt",
        TO_CHAR(thl.departed_at, 'HH24:MI') AS "departedAt",
        thl.passengers_boarded AS boarded,
        thl.passengers_alighted AS alighted,
        thl.current_occupancy AS "occupancyAfter",
        'IOT_SENSOR' AS source
      FROM biz.trip_halt_log thl
      JOIN core.halts h ON h.id = thl.halt_id
      WHERE thl.trip_id = $2
      ORDER BY thl.sequence_order ASC
    `;

    const result = await query(sql, [tripRef, tripId]);
    res.json(
      result.rows.map((r) => ({
        ...r,
        sequence: Number(r.sequence),
        boarded: Number(r.boarded),
        alighted: Number(r.alighted),
        occupancyAfter: Number(r.occupancyAfter),
      }))
    );
  } catch (error) {
    next(error);
  }
};
