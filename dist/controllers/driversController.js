import { query } from '../config/database.js';
export const getDrivers = async (req, res, next) => {
    try {
        const { status, search } = req.query;
        let sql = `
      SELECT 
        d.id,
        d.full_name AS "fullName",
        d.nic_number AS "nic",
        d.license_number AS "licenseNo",
        d.license_class AS "licenseClass",
        d.license_expiry::TEXT AS "licenseExpiry",
        d.phone,
        d.emergency_contact AS "emergencyContact",
        d.address,
        d.date_of_birth::TEXT AS "dob",
        d.gender,
        CASE WHEN d.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END AS "status",
        COALESCE(
          (SELECT COUNT(*) > 0 FROM biz.trips t 
           WHERE t.driver_id = d.id 
             AND t.status IN ('BOARDING', 'DEPARTED', 'IN_PROGRESS') 
             AND t.trip_date = CURRENT_DATE), 
          false
        ) AS "onDuty",
        (SELECT v.registration_number FROM core.driver_assignments da
         JOIN core.vehicles v ON v.id = da.vehicle_id
         WHERE da.driver_id = d.id AND da.is_current = true
         LIMIT 1) AS "assignedVehicle",
        d.notes
      FROM core.drivers d
      WHERE d.deleted_at IS NULL
    `;
        const params = [];
        if (status) {
            params.push(status === 'ACTIVE');
            sql += ` AND d.is_active = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            sql += ` AND (d.full_name ILIKE $${params.length} OR d.nic_number ILIKE $${params.length} OR d.license_number ILIKE $${params.length} OR d.phone ILIKE $${params.length})`;
        }
        sql += ` ORDER BY d.full_name ASC LIMIT 100`;
        const result = await query(sql, params);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
export const getDriverById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sql = `
      SELECT 
        d.id,
        d.full_name AS "fullName",
        d.nic_number AS "nic",
        d.license_number AS "licenseNo",
        d.license_class AS "licenseClass",
        d.license_expiry::TEXT AS "licenseExpiry",
        d.phone,
        d.emergency_contact AS "emergencyContact",
        d.address,
        d.date_of_birth::TEXT AS "dob",
        d.gender,
        CASE WHEN d.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END AS "status",
        COALESCE(
          (SELECT COUNT(*) > 0 FROM biz.trips t 
           WHERE t.driver_id = d.id 
             AND t.status IN ('BOARDING', 'DEPARTED', 'IN_PROGRESS') 
             AND t.trip_date = CURRENT_DATE), 
          false
        ) AS "onDuty",
        (SELECT v.registration_number FROM core.driver_assignments da
         JOIN core.vehicles v ON v.id = da.vehicle_id
         WHERE da.driver_id = d.id AND da.is_current = true
         LIMIT 1) AS "assignedVehicle",
        d.notes
      FROM core.drivers d
      WHERE d.id = $1 AND d.deleted_at IS NULL
    `;
        const result = await query(sql, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
export const createDriver = async (req, res, next) => {
    try {
        const { fullName, nic, licenseNo, licenseClass, licenseExpiry, phone, emergencyContact, address, dob, gender, notes, } = req.body;
        if (!fullName || !nic || !licenseNo || !licenseClass || !licenseExpiry || !phone) {
            return res.status(400).json({ error: 'Missing required driver fields' });
        }
        const sql = `
      INSERT INTO core.drivers (
        full_name, nic_number, license_number, license_class, license_expiry,
        phone, emergency_contact, address, date_of_birth, gender, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING 
        id,
        full_name AS "fullName",
        nic_number AS "nic",
        license_number AS "licenseNo",
        license_class AS "licenseClass",
        license_expiry::TEXT AS "licenseExpiry",
        phone,
        emergency_contact AS "emergencyContact",
        address,
        date_of_birth::TEXT AS "dob",
        gender,
        CASE WHEN is_active THEN 'ACTIVE' ELSE 'INACTIVE' END AS "status",
        false AS "onDuty",
        notes
    `;
        const result = await query(sql, [
            fullName,
            nic,
            licenseNo,
            licenseClass,
            licenseExpiry,
            phone,
            emergencyContact || null,
            address || null,
            dob || null,
            gender || null,
            notes || null,
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
export const updateDriver = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { fullName, nic, licenseNo, licenseClass, licenseExpiry, phone, emergencyContact, address, dob, gender, status, notes, } = req.body;
        const isActive = status ? status === 'ACTIVE' : undefined;
        const sql = `
      UPDATE core.drivers
      SET 
        full_name = COALESCE($1, full_name),
        nic_number = COALESCE($2, nic_number),
        license_number = COALESCE($3, license_number),
        license_class = COALESCE($4, license_class),
        license_expiry = COALESCE($5, license_expiry),
        phone = COALESCE($6, phone),
        emergency_contact = COALESCE($7, emergency_contact),
        address = COALESCE($8, address),
        date_of_birth = COALESCE($9, date_of_birth),
        gender = COALESCE($10, gender),
        is_active = COALESCE($11, is_active),
        notes = COALESCE($12, notes),
        updated_at = NOW()
      WHERE id = $13 AND deleted_at IS NULL
      RETURNING 
        id,
        full_name AS "fullName",
        nic_number AS "nic",
        license_number AS "licenseNo",
        license_class AS "licenseClass",
        license_expiry::TEXT AS "licenseExpiry",
        phone,
        emergency_contact AS "emergencyContact",
        address,
        date_of_birth::TEXT AS "dob",
        gender,
        CASE WHEN is_active THEN 'ACTIVE' ELSE 'INACTIVE' END AS "status",
        notes
    `;
        const result = await query(sql, [
            fullName || null,
            nic || null,
            licenseNo || null,
            licenseClass || null,
            licenseExpiry || null,
            phone || null,
            emergencyContact || null,
            address || null,
            dob || null,
            gender || null,
            isActive !== undefined ? isActive : null,
            notes || null,
            id,
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
export const deleteDriver = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sql = `
      UPDATE core.drivers
      SET deleted_at = NOW(), is_active = FALSE
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `;
        const result = await query(sql, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        res.json({ success: true, message: 'Driver deleted successfully', id });
    }
    catch (error) {
        next(error);
    }
};
export const getDriverDocuments = async (req, res, next) => {
    try {
        const { driverId } = req.query;
        let sql = `
      SELECT 
        dd.id,
        dd.driver_id AS "driverId",
        d.full_name AS "driverName",
        dd.doc_type AS "docType",
        dd.file_path AS "filePath",
        dd.issued_at::TEXT AS "issuedAt",
        dd.expires_at::TEXT AS "expiresAt",
        CASE 
          WHEN dd.is_verified THEN 'VERIFIED'
          WHEN dd.verified_at IS NOT NULL AND NOT dd.is_verified THEN 'REJECTED'
          ELSE 'PENDING'
        END AS "verification",
        dd.verified_by AS "verifiedBy",
        dd.verified_at::TEXT AS "verifiedAt"
      FROM core.driver_documents dd
      JOIN core.drivers d ON d.id = dd.driver_id
      WHERE d.deleted_at IS NULL
    `;
        const params = [];
        if (driverId) {
            params.push(driverId);
            sql += ` AND dd.driver_id = $${params.length}`;
        }
        sql += ` ORDER BY dd.created_at DESC`;
        const result = await query(sql, params);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
export const verifyDriverDocument = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, verifiedBy } = req.body; // 'VERIFIED' | 'REJECTED'
        if (!status || !['VERIFIED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid verification status. Must be VERIFIED or REJECTED.' });
        }
        const isVerified = status === 'VERIFIED';
        const sql = `
      UPDATE core.driver_documents
      SET 
        is_verified = $1,
        verified_by = $2,
        verified_at = NOW()
      WHERE id = $3
      RETURNING 
        id,
        driver_id AS "driverId",
        doc_type AS "docType",
        issued_at::TEXT AS "issuedAt",
        expires_at::TEXT AS "expiresAt",
        CASE 
          WHEN is_verified THEN 'VERIFIED'
          ELSE 'REJECTED'
        END AS "verification",
        verified_by AS "verifiedBy",
        verified_at::TEXT AS "verifiedAt"
    `;
        const result = await query(sql, [isVerified, verifiedBy || 'Admin System', id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
