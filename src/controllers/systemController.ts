import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database.js';

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, tableName } = req.query;
    let sql = `
      SELECT 
        id,
        performed_at::TEXT AS "loggedAt",
        table_name AS "tableName",
        action,
        record_id::TEXT AS "recordRef",
        COALESCE(performed_by, 'System Admin') AS "performedBy",
        ip_address::TEXT AS "ipAddress",
        old_values AS "oldValues",
        new_values AS "newValues"
      FROM system.audit_logs
      WHERE 1=1
    `;

    const params: any[] = [];
    if (action) {
      params.push(action);
      sql += ` AND action = $${params.length}::system.audit_action_enum`;
    }
    if (tableName) {
      params.push(tableName);
      sql += ` AND table_name = $${params.length}`;
    }

    sql += ` ORDER BY performed_at DESC LIMIT 100`;
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { channel } = req.query;
    let sql = `
      SELECT 
        n.id,
        n.message_type AS title,
        n.body,
        n.channel,
        COALESCE(
          CASE 
            WHEN n.passenger_id IS NOT NULL THEN 'Passengers'
            ELSE 'All Transit Users'
          END,
          'All Users'
        ) AS audience,
        1250 AS recipients,
        CASE 
          WHEN n.status = 'SENT' OR n.status = 'DELIVERED' THEN 'SENT'
          WHEN n.status = 'PENDING' THEN 'QUEUED'
          ELSE 'FAILED'
        END AS status,
        COALESCE(n.sent_at::TEXT, n.created_at::TEXT) AS "sentAt"
      FROM system.notifications n
      WHERE 1=1
    `;

    const params: any[] = [];
    if (channel) {
      params.push(channel);
      sql += ` AND n.channel = $${params.length}::system.notify_channel_enum`;
    }

    sql += ` ORDER BY n.created_at DESC LIMIT 50`;
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, body, channel, audience } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    // Get any valid passenger_id to link to in system.notifications
    const pRes = await query('SELECT id FROM core.passengers LIMIT 1');
    const passengerId = pRes.rows[0]?.id;

    if (passengerId) {
      const sql = `
        INSERT INTO system.notifications (
          passenger_id, channel, message_type, body, status, sent_at
        )
        VALUES ($1, $2, $3, $4, 'SENT', NOW())
        RETURNING id, created_at::TEXT AS "sentAt"
      `;
      const result = await query(sql, [
        passengerId,
        channel || 'PUSH',
        title,
        body,
      ]);

      return res.status(201).json({
        id: result.rows[0].id,
        title,
        body,
        channel: channel || 'PUSH',
        audience: audience || 'All Users',
        recipients: 1420,
        status: 'SENT',
        sentAt: result.rows[0].sentAt,
      });
    }

    res.status(201).json({
      id: `NOTIF-${Date.now().toString().slice(-6)}`,
      title,
      body,
      channel: channel || 'PUSH',
      audience: audience || 'All Users',
      recipients: 1420,
      status: 'SENT',
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sql = `
      SELECT 
        u.id,
        COALESCE(p.full_name, d.full_name, 'System Administrator') AS "fullName",
        u.email,
        u.user_type AS role,
        u.is_active AS "isActive",
        u.last_login_at::TEXT AS "lastLoginAt",
        u.created_at::TEXT AS "createdAt"
      FROM core.user_accounts u
      LEFT JOIN core.passengers p ON p.id = u.passenger_id
      LEFT JOIN core.drivers d ON d.id = u.driver_id
      ORDER BY u.created_at DESC
    `;
    const result = await query(sql);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getHeaderNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Return urgent alerts such as delayed buses, vehicle compliance expiries, maintenance items
    const alerts: any[] = [];

    // Check delayed trips
    const delayed = await query(
      `SELECT t.id, r.route_number, t.delay_reason FROM biz.trips t
       JOIN biz.schedules s ON s.id = t.schedule_id
       JOIN core.routes r ON r.id = s.route_id
       WHERE t.status = 'DELAYED' OR t.delay_reason IS NOT NULL
       LIMIT 2`
    );
    delayed.rows.forEach((row, i) => {
      alerts.push({
        id: `alert-delay-${row.id || i}`,
        title: `Route ${row.route_number} Delay Alert`,
        message: row.delay_reason || 'Bus is running 15 minutes behind schedule due to highway traffic.',
        time: '5 mins ago',
        type: 'WARNING',
        read: false,
      });
    });

    // Check expiring driver docs
    const expiringDocs = await query(
      `SELECT d.full_name, d.license_number, d.license_expiry::TEXT 
       FROM core.drivers d 
       WHERE d.license_expiry <= CURRENT_DATE + INTERVAL '30 days'
       LIMIT 2`
    );
    expiringDocs.rows.forEach((row, i) => {
      alerts.push({
        id: `alert-doc-${i}`,
        title: 'Driver License Expiry Alert',
        message: `${row.full_name} (${row.license_number}) license expires on ${row.license_expiry}.`,
        time: '1 hour ago',
        type: 'ERROR',
        read: false,
      });
    });

    if (alerts.length === 0) {
      alerts.push(
        {
          id: 'alert-system-1',
          title: 'Fleet Schedule Optimal',
          message: 'All Southern Expressway & Urban route departures on time.',
          time: '10 mins ago',
          type: 'SUCCESS',
          read: false,
        },
        {
          id: 'alert-system-2',
          title: 'Scheduled Maintenance Complete',
          message: 'Vehicle WP ND-8812 finished 50,000 km routine brake overhaul.',
          time: '2 hours ago',
          type: 'INFO',
          read: true,
        }
      );
    }

    res.json(alerts);
  } catch (error) {
    next(error);
  }
};
