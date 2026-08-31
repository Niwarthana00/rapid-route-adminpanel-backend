import { query } from '../config/database.js';
const DAY_MAP_NUM_TO_STR = {
    1: 'MON',
    2: 'TUE',
    3: 'WED',
    4: 'THU',
    5: 'FRI',
    6: 'SAT',
    7: 'SUN',
};
const DAY_MAP_STR_TO_NUM = {
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
    SUN: 7,
};
export const getSchedules = async (req, res, next) => {
    try {
        const { routeId, isActive } = req.query;
        let sql = `
      SELECT 
        s.id,
        s.route_id AS "routeId",
        r.route_number AS "routeNumber",
        r.name AS "routeName",
        s.vehicle_id AS "vehicleId",
        v.registration_number AS "registrationNo",
        s.driver_id AS "driverId",
        d.full_name AS "driverName",
        s.departure_time::TEXT AS "departureTime",
        s.arrival_time::TEXT AS "arrivalTime",
        s.days_of_week AS "daysOfWeekRaw",
        s.valid_from::TEXT AS "validFrom",
        s.valid_to::TEXT AS "validTo",
        s.is_active AS "isActive"
      FROM biz.schedules s
      JOIN core.routes r ON r.id = s.route_id
      JOIN core.vehicles v ON v.id = s.vehicle_id
      JOIN core.drivers d ON d.id = s.driver_id
      WHERE 1=1
    `;
        const params = [];
        if (routeId) {
            params.push(routeId);
            sql += ` AND s.route_id = $${params.length}`;
        }
        if (isActive !== undefined) {
            params.push(isActive === 'true');
            sql += ` AND s.is_active = $${params.length}`;
        }
        sql += ` ORDER BY s.departure_time ASC LIMIT 100`;
        const result = await query(sql, params);
        const schedules = result.rows.map((row) => {
            const days = Array.isArray(row.daysOfWeekRaw)
                ? row.daysOfWeekRaw.map((n) => typeof n === 'number' ? DAY_MAP_NUM_TO_STR[n] || String(n) : String(n))
                : ['MON', 'TUE', 'WED', 'THU', 'FRI'];
            const { daysOfWeekRaw, ...rest } = row;
            return {
                ...rest,
                departureTime: row.departureTime ? row.departureTime.slice(0, 5) : '06:00',
                arrivalTime: row.arrivalTime ? row.arrivalTime.slice(0, 5) : '07:15',
                daysOfWeek: days,
            };
        });
        res.json(schedules);
    }
    catch (error) {
        next(error);
    }
};
export const createSchedule = async (req, res, next) => {
    try {
        const { routeId, vehicleId, driverId, departureTime, arrivalTime, daysOfWeek, validFrom, validTo, isActive, } = req.body;
        if (!routeId || !vehicleId || !driverId || !departureTime || !arrivalTime || !validFrom) {
            return res.status(400).json({ error: 'Missing required schedule fields' });
        }
        const numDays = Array.isArray(daysOfWeek)
            ? daysOfWeek.map((d) => typeof d === 'string' ? DAY_MAP_STR_TO_NUM[d.toUpperCase()] || 1 : Number(d))
            : [1, 2, 3, 4, 5];
        const sql = `
      INSERT INTO biz.schedules (
        route_id, vehicle_id, driver_id, departure_time, arrival_time,
        days_of_week, valid_from, valid_to, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id,
        route_id AS "routeId",
        vehicle_id AS "vehicleId",
        driver_id AS "driverId",
        departure_time::TEXT AS "departureTime",
        arrival_time::TEXT AS "arrivalTime",
        days_of_week AS "daysOfWeekRaw",
        valid_from::TEXT AS "validFrom",
        valid_to::TEXT AS "validTo",
        is_active AS "isActive"
    `;
        const result = await query(sql, [
            routeId,
            vehicleId,
            driverId,
            departureTime,
            arrivalTime,
            numDays,
            validFrom,
            validTo || null,
            isActive !== undefined ? isActive : true,
        ]);
        const created = result.rows[0];
        // Fetch related route and driver info
        const extraRes = await query(`
      SELECT 
        r.route_number AS "routeNumber",
        r.name AS "routeName",
        v.registration_number AS "registrationNo",
        d.full_name AS "driverName"
      FROM core.routes r, core.vehicles v, core.drivers d
      WHERE r.id = $1 AND v.id = $2 AND d.id = $3
    `, [routeId, vehicleId, driverId]);
        const extra = extraRes.rows[0] || {};
        res.status(201).json({
            ...created,
            ...extra,
            departureTime: created.departureTime?.slice(0, 5),
            arrivalTime: created.arrivalTime?.slice(0, 5),
            daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek : ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        });
    }
    catch (error) {
        next(error);
    }
};
export const updateSchedule = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { routeId, vehicleId, driverId, departureTime, arrivalTime, daysOfWeek, validFrom, validTo, isActive, } = req.body;
        const numDays = Array.isArray(daysOfWeek)
            ? daysOfWeek.map((d) => typeof d === 'string' ? DAY_MAP_STR_TO_NUM[d.toUpperCase()] || 1 : Number(d))
            : null;
        const sql = `
      UPDATE biz.schedules
      SET 
        route_id = COALESCE($1, route_id),
        vehicle_id = COALESCE($2, vehicle_id),
        driver_id = COALESCE($3, driver_id),
        departure_time = COALESCE($4, departure_time),
        arrival_time = COALESCE($5, arrival_time),
        days_of_week = COALESCE($6, days_of_week),
        valid_from = COALESCE($7, valid_from),
        valid_to = COALESCE($8, valid_to),
        is_active = COALESCE($9, is_active),
        updated_at = NOW()
      WHERE id = $10
      RETURNING id
    `;
        const result = await query(sql, [
            routeId || null,
            vehicleId || null,
            driverId || null,
            departureTime || null,
            arrivalTime || null,
            numDays,
            validFrom || null,
            validTo || null,
            isActive !== undefined ? isActive : null,
            id,
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        const updatedRes = await query(`
      SELECT 
        s.id,
        s.route_id AS "routeId",
        r.route_number AS "routeNumber",
        r.name AS "routeName",
        s.vehicle_id AS "vehicleId",
        v.registration_number AS "registrationNo",
        s.driver_id AS "driverId",
        d.full_name AS "driverName",
        s.departure_time::TEXT AS "departureTime",
        s.arrival_time::TEXT AS "arrivalTime",
        s.days_of_week AS "daysOfWeekRaw",
        s.valid_from::TEXT AS "validFrom",
        s.valid_to::TEXT AS "validTo",
        s.is_active AS "isActive"
      FROM biz.schedules s
      JOIN core.routes r ON r.id = s.route_id
      JOIN core.vehicles v ON v.id = s.vehicle_id
      JOIN core.drivers d ON d.id = s.driver_id
      WHERE s.id = $1
    `, [id]);
        const row = updatedRes.rows[0];
        const days = Array.isArray(row.daysOfWeekRaw)
            ? row.daysOfWeekRaw.map((n) => typeof n === 'number' ? DAY_MAP_NUM_TO_STR[n] || String(n) : String(n))
            : ['MON', 'TUE', 'WED', 'THU', 'FRI'];
        res.json({
            ...row,
            departureTime: row.departureTime?.slice(0, 5),
            arrivalTime: row.arrivalTime?.slice(0, 5),
            daysOfWeek: days,
        });
    }
    catch (error) {
        next(error);
    }
};
