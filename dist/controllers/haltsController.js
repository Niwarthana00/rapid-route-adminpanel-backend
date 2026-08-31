import { query } from '../config/database.js';
export const getHalts = async (req, res, next) => {
    try {
        const { district, search } = req.query;
        let sql = `
      SELECT 
        h.id,
        h.name,
        d.name AS district,
        d.province,
        h.address,
        h.latitude::NUMERIC AS lat,
        h.longitude::NUMERIC AS lng,
        EXISTS(
          SELECT 1 FROM core.routes r 
          WHERE r.origin_halt_id = h.id OR r.destination_halt_id = h.id
        ) AS "isTerminal"
      FROM core.halts h
      JOIN core.districts d ON d.id = h.district_id
      WHERE h.is_active = TRUE
    `;
        const params = [];
        if (district) {
            params.push(district);
            sql += ` AND d.name = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            sql += ` AND (h.name ILIKE $${params.length} OR h.address ILIKE $${params.length})`;
        }
        sql += ` ORDER BY h.name ASC`;
        const result = await query(sql, params);
        res.json(result.rows.map((row) => ({
            ...row,
            lat: Number(row.lat),
            lng: Number(row.lng),
        })));
    }
    catch (error) {
        next(error);
    }
};
export const createHalt = async (req, res, next) => {
    try {
        const { name, district, province, address, lat, lng, isTerminal } = req.body;
        if (!name || !lat || !lng) {
            return res.status(400).json({ error: 'Missing required halt fields (name, lat, lng)' });
        }
        // Ensure district exists in core.districts
        let districtId;
        const distName = district || 'Colombo';
        const provName = province || 'Western';
        const distRes = await query('SELECT id FROM core.districts WHERE name = $1', [distName]);
        if (distRes.rows.length > 0) {
            districtId = distRes.rows[0].id;
        }
        else {
            const newDist = await query('INSERT INTO core.districts (name, province) VALUES ($1, $2) RETURNING id', [distName, provName]);
            districtId = newDist.rows[0].id;
        }
        const sql = `
      INSERT INTO core.halts (
        district_id, name, address, location, latitude, longitude, is_active
      )
      VALUES (
        $1, $2, $3,
        ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography,
        $4, $5, true
      )
      RETURNING 
        id,
        name,
        address,
        latitude::NUMERIC AS lat,
        longitude::NUMERIC AS lng
    `;
        const result = await query(sql, [districtId, name, address || null, lat, lng]);
        const row = result.rows[0];
        res.status(201).json({
            id: row.id,
            name: row.name,
            district: distName,
            province: provName,
            address: row.address,
            lat: Number(row.lat),
            lng: Number(row.lng),
            isTerminal: Boolean(isTerminal),
        });
    }
    catch (error) {
        next(error);
    }
};
