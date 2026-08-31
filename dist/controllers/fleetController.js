import { query } from '../config/database.js';
export const getVehicles = async (req, res, next) => {
    try {
        const { status, search } = req.query;
        let sql = `
      SELECT 
        v.id,
        v.registration_number AS "registrationNo",
        v.make,
        v.model,
        v.year,
        v.total_seats AS "seatingCapacity",
        v.fuel_type AS "fuelType",
        v.has_ac AS "isAc",
        v.odometer_km::NUMERIC AS "odometerKm",
        CASE 
          WHEN NOT v.is_active THEN 'RETIRED'
          WHEN EXISTS (SELECT 1 FROM core.vehicle_maintenance vm WHERE vm.vehicle_id = v.id AND vm.next_service_date >= CURRENT_DATE AND vm.maintenance_type = 'REPAIR') THEN 'REPAIR'
          WHEN EXISTS (SELECT 1 FROM core.vehicle_maintenance vm WHERE vm.vehicle_id = v.id AND vm.next_service_date >= CURRENT_DATE AND vm.maintenance_type = 'ROUTINE') THEN 'MAINTENANCE'
          ELSE 'IN_SERVICE'
        END AS "status",
        COALESCE(
          (SELECT d.name FROM core.districts d
           JOIN core.halts h ON h.district_id = d.id
           JOIN core.routes r ON r.origin_halt_id = h.id
           JOIN biz.schedules s ON s.route_id = r.id
           WHERE s.vehicle_id = v.id LIMIT 1),
          'Colombo Central Depot'
        ) AS "depot",
        (
          SELECT jsonb_object_agg(vd.doc_type, vd.expires_at::TEXT)
          FROM core.vehicle_documents vd
          WHERE vd.vehicle_id = v.id
        ) AS "compliance"
      FROM core.vehicles v
      WHERE v.deleted_at IS NULL
    `;
        const params = [];
        if (search) {
            params.push(`%${search}%`);
            sql += ` AND (v.registration_number ILIKE $${params.length} OR v.make ILIKE $${params.length} OR v.model ILIKE $${params.length})`;
        }
        sql += ` ORDER BY v.registration_number ASC LIMIT 100`;
        const result = await query(sql, params);
        // Ensure compliance is at least an empty object if null
        const formatted = result.rows.map((row) => ({
            ...row,
            odometerKm: Number(row.odometerKm || 0),
            compliance: row.compliance || {},
        }));
        res.json(formatted);
    }
    catch (error) {
        next(error);
    }
};
export const getVehicleById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sql = `
      SELECT 
        v.id,
        v.registration_number AS "registrationNo",
        v.make,
        v.model,
        v.year,
        v.total_seats AS "seatingCapacity",
        v.fuel_type AS "fuelType",
        v.has_ac AS "isAc",
        v.odometer_km::NUMERIC AS "odometerKm",
        CASE 
          WHEN NOT v.is_active THEN 'RETIRED'
          WHEN EXISTS (SELECT 1 FROM core.vehicle_maintenance vm WHERE vm.vehicle_id = v.id AND vm.next_service_date >= CURRENT_DATE AND vm.maintenance_type = 'REPAIR') THEN 'REPAIR'
          WHEN EXISTS (SELECT 1 FROM core.vehicle_maintenance vm WHERE vm.vehicle_id = v.id AND vm.next_service_date >= CURRENT_DATE AND vm.maintenance_type = 'ROUTINE') THEN 'MAINTENANCE'
          ELSE 'IN_SERVICE'
        END AS "status",
        COALESCE(
          (SELECT d.name FROM core.districts d
           JOIN core.halts h ON h.district_id = d.id
           JOIN core.routes r ON r.origin_halt_id = h.id
           JOIN biz.schedules s ON s.route_id = r.id
           WHERE s.vehicle_id = v.id LIMIT 1),
          'Colombo Central Depot'
        ) AS "depot",
        (
          SELECT jsonb_object_agg(vd.doc_type, vd.expires_at::TEXT)
          FROM core.vehicle_documents vd
          WHERE vd.vehicle_id = v.id
        ) AS "compliance"
      FROM core.vehicles v
      WHERE v.id = $1 AND v.deleted_at IS NULL
    `;
        const result = await query(sql, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        const row = result.rows[0];
        res.json({
            ...row,
            odometerKm: Number(row.odometerKm || 0),
            compliance: row.compliance || {},
        });
    }
    catch (error) {
        next(error);
    }
};
export const createVehicle = async (req, res, next) => {
    try {
        const { registrationNo, make, model, year, seatingCapacity, fuelType, isAc, odometerKm, compliance, } = req.body;
        if (!registrationNo || !make || !model || !year || !seatingCapacity) {
            return res.status(400).json({ error: 'Missing required vehicle fields' });
        }
        const chassisNo = `CHS-${Date.now().toString().slice(-8)}`;
        const engineNo = `ENG-${Date.now().toString().slice(-8)}`;
        const sql = `
      INSERT INTO core.vehicles (
        registration_number, chassis_number, engine_number, make, model,
        year, total_seats, fuel_type, has_ac, odometer_km
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id,
        registration_number AS "registrationNo",
        make,
        model,
        year,
        total_seats AS "seatingCapacity",
        fuel_type AS "fuelType",
        has_ac AS "isAc",
        odometer_km::NUMERIC AS "odometerKm",
        'IN_SERVICE' AS "status"
    `;
        const result = await query(sql, [
            registrationNo,
            chassisNo,
            engineNo,
            make,
            model,
            year,
            seatingCapacity,
            fuelType || 'DIESEL',
            isAc !== undefined ? isAc : true,
            odometerKm || 0,
        ]);
        const newVehicle = result.rows[0];
        // Insert compliance docs if provided
        if (compliance && typeof compliance === 'object') {
            for (const [docType, expiryDate] of Object.entries(compliance)) {
                if (expiryDate) {
                    await query(`INSERT INTO core.vehicle_documents (vehicle_id, doc_type, file_path, issued_at, expires_at, is_verified)
             VALUES ($1, $2, $3, CURRENT_DATE - INTERVAL '6 months', $4, true)
             ON CONFLICT DO NOTHING`, [newVehicle.id, docType, `/docs/vehicles/${newVehicle.id}/${docType}.pdf`, expiryDate]);
                }
            }
        }
        res.status(201).json({
            ...newVehicle,
            depot: 'Colombo Central Depot',
            compliance: compliance || {},
        });
    }
    catch (error) {
        next(error);
    }
};
export const updateVehicle = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { registrationNo, make, model, year, seatingCapacity, fuelType, isAc, odometerKm, status, compliance, } = req.body;
        const isActive = status ? status !== 'RETIRED' : undefined;
        const sql = `
      UPDATE core.vehicles
      SET 
        registration_number = COALESCE($1, registration_number),
        make = COALESCE($2, make),
        model = COALESCE($3, model),
        year = COALESCE($4, year),
        total_seats = COALESCE($5, total_seats),
        fuel_type = COALESCE($6, fuel_type),
        has_ac = COALESCE($7, has_ac),
        odometer_km = COALESCE($8, odometer_km),
        is_active = COALESCE($9, is_active),
        updated_at = NOW()
      WHERE id = $10 AND deleted_at IS NULL
      RETURNING 
        id,
        registration_number AS "registrationNo",
        make,
        model,
        year,
        total_seats AS "seatingCapacity",
        fuel_type AS "fuelType",
        has_ac AS "isAc",
        odometer_km::NUMERIC AS "odometerKm",
        is_active
    `;
        const result = await query(sql, [
            registrationNo || null,
            make || null,
            model || null,
            year || null,
            seatingCapacity || null,
            fuelType || null,
            isAc !== undefined ? isAc : null,
            odometerKm || null,
            isActive !== undefined ? isActive : null,
            id,
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        // Update compliance docs if passed
        if (compliance && typeof compliance === 'object') {
            for (const [docType, expiryDate] of Object.entries(compliance)) {
                if (expiryDate) {
                    await query(`INSERT INTO core.vehicle_documents (vehicle_id, doc_type, file_path, issued_at, expires_at, is_verified)
             VALUES ($1, $2, $3, CURRENT_DATE - INTERVAL '6 months', $4, true)
             ON CONFLICT DO NOTHING`, [id, docType, `/docs/vehicles/${id}/${docType}.pdf`, expiryDate]);
                }
            }
        }
        const updated = result.rows[0];
        res.json({
            ...updated,
            status: status || (updated.is_active ? 'IN_SERVICE' : 'RETIRED'),
            depot: 'Colombo Central Depot',
            compliance: compliance || {},
        });
    }
    catch (error) {
        next(error);
    }
};
export const getMaintenanceLogs = async (req, res, next) => {
    try {
        const { vehicleId } = req.query;
        let sql = `
      SELECT 
        vm.id,
        vm.vehicle_id AS "vehicleId",
        v.registration_number AS "registrationNo",
        vm.service_date::TEXT AS "serviceDate",
        vm.maintenance_type AS "type",
        vm.odometer_at_service::NUMERIC AS "odometerKm",
        vm.cost::NUMERIC AS "costLkr",
        vm.performed_by AS "performedBy",
        vm.next_service_date::TEXT AS "nextServiceDate",
        vm.description AS "notes"
      FROM core.vehicle_maintenance vm
      JOIN core.vehicles v ON v.id = vm.vehicle_id
      WHERE v.deleted_at IS NULL
    `;
        const params = [];
        if (vehicleId) {
            params.push(vehicleId);
            sql += ` AND vm.vehicle_id = $${params.length}`;
        }
        sql += ` ORDER BY vm.service_date DESC, vm.created_at DESC`;
        const result = await query(sql, params);
        res.json(result.rows.map((row) => ({
            ...row,
            odometerKm: Number(row.odometerKm || 0),
            costLkr: Number(row.costLkr || 0),
        })));
    }
    catch (error) {
        next(error);
    }
};
export const createMaintenanceLog = async (req, res, next) => {
    try {
        const { vehicleId, serviceDate, type, odometerKm, costLkr, performedBy, nextServiceDate, notes, } = req.body;
        if (!vehicleId || !serviceDate || !type || !performedBy) {
            return res.status(400).json({ error: 'Missing required maintenance fields' });
        }
        const sql = `
      INSERT INTO core.vehicle_maintenance (
        vehicle_id, maintenance_type, description, odometer_at_service,
        cost, service_date, next_service_date, performed_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id,
        vehicle_id AS "vehicleId",
        service_date::TEXT AS "serviceDate",
        maintenance_type AS "type",
        odometer_at_service::NUMERIC AS "odometerKm",
        cost::NUMERIC AS "costLkr",
        performed_by AS "performedBy",
        next_service_date::TEXT AS "nextServiceDate",
        description AS "notes"
    `;
        const result = await query(sql, [
            vehicleId,
            type,
            notes || null,
            odometerKm || 0,
            costLkr || 0,
            serviceDate,
            nextServiceDate || null,
            performedBy,
        ]);
        // Also get vehicle registration
        const vehRes = await query('SELECT registration_number FROM core.vehicles WHERE id = $1', [vehicleId]);
        const regNo = vehRes.rows[0]?.registration_number || '';
        res.status(201).json({
            ...result.rows[0],
            registrationNo: regNo,
            odometerKm: Number(result.rows[0].odometerKm || 0),
            costLkr: Number(result.rows[0].costLkr || 0),
        });
    }
    catch (error) {
        next(error);
    }
};
export const getDriverAssignments = async (req, res, next) => {
    try {
        const sql = `
      SELECT 
        da.id,
        da.driver_id AS "driverId",
        d.full_name AS "driverName",
        da.vehicle_id AS "vehicleId",
        v.registration_number AS "registrationNo",
        da.assigned_from::TEXT AS "assignedFrom",
        da.assigned_to::TEXT AS "assignedTo",
        da.is_current AS "isCurrent"
      FROM core.driver_assignments da
      JOIN core.drivers d ON d.id = da.driver_id
      JOIN core.vehicles v ON v.id = da.vehicle_id
      ORDER BY da.is_current DESC, da.assigned_from DESC
    `;
        const result = await query(sql);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
