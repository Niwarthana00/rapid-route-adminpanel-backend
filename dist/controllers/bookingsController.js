import { query } from '../config/database.js';
export const getBookings = async (req, res, next) => {
    try {
        const { status, tripId, search } = req.query;
        let sql = `
      SELECT 
        b.id,
        b.booking_ref AS "bookingRef",
        p.full_name AS "passengerName",
        p.phone AS "passengerPhone",
        r.route_number AS "routeNumber",
        r.name AS "routeName",
        t.trip_date::TEXT AS "serviceDate",
        b.seat_number::TEXT AS "seatNo",
        h_board.name AS "boardingHalt",
        h_alight.name AS "alightingHalt",
        b.fare_amount::NUMERIC AS "fareLkr",
        b.booking_status AS status,
        b.booked_at::TEXT AS "bookedAt",
        b.cancel_reason AS "cancelReason"
      FROM biz.bookings b
      JOIN core.passengers p ON p.id = b.passenger_id
      JOIN biz.trips t ON t.id = b.trip_id
      LEFT JOIN biz.schedules s ON s.id = t.schedule_id
      LEFT JOIN core.routes r ON r.id = s.route_id
      JOIN core.halts h_board ON h_board.id = b.boarding_halt_id
      JOIN core.halts h_alight ON h_alight.id = b.alighting_halt_id
      WHERE 1=1
    `;
        const params = [];
        if (status) {
            params.push(status);
            sql += ` AND b.booking_status = $${params.length}`;
        }
        if (tripId) {
            params.push(tripId);
            sql += ` AND b.trip_id = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            sql += ` AND (b.booking_ref ILIKE $${params.length} OR p.full_name ILIKE $${params.length} OR p.phone ILIKE $${params.length})`;
        }
        sql += ` ORDER BY b.booked_at DESC LIMIT 100`;
        const result = await query(sql, params);
        res.json(result.rows.map((row) => ({
            ...row,
            fareLkr: Number(row.fareLkr),
        })));
    }
    catch (error) {
        next(error);
    }
};
export const getBookingById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sql = `
      SELECT 
        b.id,
        b.booking_ref AS "bookingRef",
        p.full_name AS "passengerName",
        p.phone AS "passengerPhone",
        r.route_number AS "routeNumber",
        r.name AS "routeName",
        t.trip_date::TEXT AS "serviceDate",
        b.seat_number::TEXT AS "seatNo",
        h_board.name AS "boardingHalt",
        h_alight.name AS "alightingHalt",
        b.fare_amount::NUMERIC AS "fareLkr",
        b.booking_status AS status,
        b.booked_at::TEXT AS "bookedAt",
        b.cancel_reason AS "cancelReason"
      FROM biz.bookings b
      JOIN core.passengers p ON p.id = b.passenger_id
      JOIN biz.trips t ON t.id = b.trip_id
      LEFT JOIN biz.schedules s ON s.id = t.schedule_id
      LEFT JOIN core.routes r ON r.id = s.route_id
      JOIN core.halts h_board ON h_board.id = b.boarding_halt_id
      JOIN core.halts h_alight ON h_alight.id = b.alighting_halt_id
      WHERE b.id = $1 OR b.booking_ref = $1
    `;
        const result = await query(sql, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        const row = result.rows[0];
        res.json({
            ...row,
            fareLkr: Number(row.fareLkr),
        });
    }
    catch (error) {
        next(error);
    }
};
export const createBooking = async (req, res, next) => {
    try {
        const { passengerName, passengerPhone, passengerEmail, tripId, boardingHaltId, alightingHaltId, seatNo, fareLkr, } = req.body;
        if (!tripId || !boardingHaltId || !alightingHaltId || !seatNo) {
            return res.status(400).json({ error: 'Missing required booking fields' });
        }
        // 1. Ensure passenger exists
        let passengerId;
        const pPhone = passengerPhone || '0770000000';
        const pName = passengerName || 'Walk-in Passenger';
        const pRes = await query('SELECT id FROM core.passengers WHERE phone = $1', [pPhone]);
        if (pRes.rows.length > 0) {
            passengerId = pRes.rows[0].id;
        }
        else {
            const newP = await query(`INSERT INTO core.passengers (full_name, phone, email) VALUES ($1, $2, $3) RETURNING id`, [pName, pPhone, passengerEmail || null]);
            passengerId = newP.rows[0].id;
            await query(`INSERT INTO core.passenger_loyalty (passenger_id, tier, total_trips, total_spent, points_balance)
         VALUES ($1, 'BRONZE', 0, 0, 0) ON CONFLICT DO NOTHING`, [passengerId]);
        }
        const bookingRef = `BK-${Date.now().toString().slice(-8)}`;
        const fare = Number(fareLkr || 500);
        const sql = `
      INSERT INTO biz.bookings (
        passenger_id, trip_id, boarding_halt_id, alighting_halt_id,
        seat_number, fare_amount, booking_status, booking_ref
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'CONFIRMED', $7)
      RETURNING id, booking_ref AS "bookingRef", booked_at::TEXT AS "bookedAt"
    `;
        const result = await query(sql, [
            passengerId,
            tripId,
            boardingHaltId,
            alightingHaltId,
            Number(seatNo),
            fare,
            bookingRef,
        ]);
        const created = result.rows[0];
        // Create payment entry
        await query(`INSERT INTO fin.payments (
        booking_id, payment_method, amount, currency, transaction_ref, payment_status, paid_at
      )
      VALUES ($1, 'CASH', $2, 'LKR', $3, 'SUCCESS', NOW())`, [created.id, fare, `TXN-${Date.now().toString().slice(-8)}`]);
        // Fetch complete details
        const fullRes = await query(`
      SELECT 
        b.id,
        b.booking_ref AS "bookingRef",
        p.full_name AS "passengerName",
        p.phone AS "passengerPhone",
        r.route_number AS "routeNumber",
        r.name AS "routeName",
        t.trip_date::TEXT AS "serviceDate",
        b.seat_number::TEXT AS "seatNo",
        h_board.name AS "boardingHalt",
        h_alight.name AS "alightingHalt",
        b.fare_amount::NUMERIC AS "fareLkr",
        b.booking_status AS status,
        b.booked_at::TEXT AS "bookedAt"
      FROM biz.bookings b
      JOIN core.passengers p ON p.id = b.passenger_id
      JOIN biz.trips t ON t.id = b.trip_id
      LEFT JOIN biz.schedules s ON s.id = t.schedule_id
      LEFT JOIN core.routes r ON r.id = s.route_id
      JOIN core.halts h_board ON h_board.id = b.boarding_halt_id
      JOIN core.halts h_alight ON h_alight.id = b.alighting_halt_id
      WHERE b.id = $1
    `, [created.id]);
        res.status(201).json(fullRes.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
export const cancelBooking = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const sql = `
      UPDATE biz.bookings
      SET 
        booking_status = 'CANCELLED',
        cancelled_at = NOW(),
        cancel_reason = $1
      WHERE id = $2 OR booking_ref = $2
      RETURNING id, booking_ref AS "bookingRef", booking_status AS status, cancel_reason AS "cancelReason"
    `;
        const result = await query(sql, [reason || 'Cancelled by customer', id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.json({
            success: true,
            message: 'Booking cancelled successfully',
            booking: result.rows[0],
        });
    }
    catch (error) {
        next(error);
    }
};
export const getSeatMap = async (req, res, next) => {
    try {
        const { vehicleId, tripId } = req.query;
        let targetVehicleId = vehicleId;
        if (!targetVehicleId && tripId) {
            const tripVeh = await query('SELECT vehicle_id FROM biz.trips WHERE id = $1', [tripId]);
            if (tripVeh.rows.length > 0) {
                targetVehicleId = tripVeh.rows[0].vehicle_id;
            }
        }
        if (!targetVehicleId) {
            // Return default 45 seats
            const seats = Array.from({ length: 45 }, (_, i) => ({
                seatNo: String(i + 1),
                type: i < 4 ? 'FRONT_ROW' : i === 44 ? 'PREMIUM' : 'STANDARD',
                booked: [3, 7, 12, 18, 22].includes(i + 1),
                passengerName: [3, 7, 12, 18, 22].includes(i + 1) ? 'Reserved Passenger' : undefined,
            }));
            return res.json(seats);
        }
        // Get vehicle seats
        const seatMapRes = await query(`SELECT seat_number, seat_type FROM core.seat_map WHERE vehicle_id = $1 ORDER BY seat_number ASC`, [targetVehicleId]);
        // Get active bookings for trip
        let bookedSeats = {};
        if (tripId) {
            const bookRes = await query(`SELECT b.seat_number, p.full_name 
         FROM biz.bookings b
         JOIN core.passengers p ON p.id = b.passenger_id
         WHERE b.trip_id = $1 AND b.booking_status NOT IN ('CANCELLED')`, [tripId]);
            bookRes.rows.forEach((r) => {
                bookedSeats[r.seat_number] = r.full_name;
            });
        }
        if (seatMapRes.rows.length === 0) {
            const vehRes = await query('SELECT total_seats FROM core.vehicles WHERE id = $1', [targetVehicleId]);
            const totalSeats = vehRes.rows[0]?.total_seats || 45;
            const seats = Array.from({ length: totalSeats }, (_, i) => {
                const seatNo = i + 1;
                const isBooked = Boolean(bookedSeats[seatNo]);
                return {
                    seatNo: String(seatNo),
                    type: seatNo <= 4 ? 'FRONT_ROW' : 'STANDARD',
                    booked: isBooked,
                    passengerName: bookedSeats[seatNo],
                };
            });
            return res.json(seats);
        }
        const seats = seatMapRes.rows.map((row) => {
            const isBooked = Boolean(bookedSeats[row.seat_number]);
            return {
                seatNo: String(row.seat_number),
                type: row.seat_type,
                booked: isBooked,
                passengerName: bookedSeats[row.seat_number],
            };
        });
        res.json(seats);
    }
    catch (error) {
        next(error);
    }
};
