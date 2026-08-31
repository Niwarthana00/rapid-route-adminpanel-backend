import { pool, query } from '../config/database.js';

async function seed() {
  console.log('🌱 Starting Rapid Route Sri Lankan Transit Seeding...');

  try {
    // 1. Districts
    console.log('📌 Seeding Districts...');
    const districtsData = [
      { name: 'Colombo', province: 'Western' },
      { name: 'Gampaha', province: 'Western' },
      { name: 'Kalutara', province: 'Western' },
      { name: 'Galle', province: 'Southern' },
      { name: 'Matara', province: 'Southern' },
    ];

    const districtMap: { [k: string]: string } = {};
    for (const d of districtsData) {
      const res = await query(
        `INSERT INTO core.districts (name, province)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET province = EXCLUDED.province
         RETURNING id, name`,
        [d.name, d.province]
      );
      districtMap[d.name] = res.rows[0].id;
    }

    // 2. Halts (Sri Lanka Transport Hubs & Expressway Interchanges)
    console.log('📌 Seeding Halts...');
    const haltsData = [
      {
        name: 'Colombo Fort Central Station',
        district: 'Colombo',
        address: 'Olcott Mawatha, Colombo 11',
        lat: 6.9344,
        lng: 79.8504,
      },
      {
        name: 'Makumbura Multimodal Transport Hub (Kottawa)',
        district: 'Colombo',
        address: 'High Level Road, Makumbura, Kottawa',
        lat: 6.8378,
        lng: 79.9723,
      },
      {
        name: 'Kadawatha Intermodal Terminal',
        district: 'Gampaha',
        address: 'Kandy Road, Kadawatha',
        lat: 7.0018,
        lng: 79.9526,
      },
      {
        name: 'Bambalapitiya Junction',
        district: 'Colombo',
        address: 'Galle Road, Bambalapitiya, Colombo 04',
        lat: 6.8967,
        lng: 79.8559,
      },
      {
        name: 'Kiribathgoda Terminal',
        district: 'Gampaha',
        address: 'Kandy Road, Kiribathgoda',
        lat: 6.9802,
        lng: 79.9298,
      },
      {
        name: 'Maharagama Central Bus Stand',
        district: 'Colombo',
        address: 'High Level Road, Maharagama',
        lat: 6.8488,
        lng: 79.9267,
      },
      {
        name: 'Pettah Main Bus Stand',
        district: 'Colombo',
        address: 'Bastian Mawatha, Pettah, Colombo 11',
        lat: 6.9366,
        lng: 79.8541,
      },
      {
        name: 'Galle Central Bus Stand',
        district: 'Galle',
        address: 'Main Street, Galle',
        lat: 6.0367,
        lng: 80.2170,
      },
      {
        name: 'Matara Integrated Transport Hub',
        district: 'Matara',
        address: 'Anagarika Dharmapala Mawatha, Matara',
        lat: 5.9496,
        lng: 80.5469,
      },
      {
        name: 'Dodangoda Interchange Halt',
        district: 'Kalutara',
        address: 'Southern Expressway, Dodangoda',
        lat: 6.6025,
        lng: 80.0482,
      },
      {
        name: 'Kurundugahahetekma Interchange Halt',
        district: 'Galle',
        address: 'Southern Expressway, Kurundugahahetekma',
        lat: 6.2754,
        lng: 80.1438,
      },
    ];

    const haltMap: { [k: string]: string } = {};
    for (const h of haltsData) {
      const distId = districtMap[h.district] || districtMap['Colombo'];
      const res = await query(
        `INSERT INTO core.halts (district_id, name, address, location, latitude, longitude, is_active)
         VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography, $4, $5, true)
         ON CONFLICT DO NOTHING
         RETURNING id, name`,
        [distId, h.name, h.address, h.lat, h.lng]
      );
      if (res.rows.length > 0) {
        haltMap[h.name] = res.rows[0].id;
      } else {
        const existing = await query('SELECT id FROM core.halts WHERE name = $1', [h.name]);
        haltMap[h.name] = existing.rows[0].id;
      }
    }

    // 3. Routes & Route Halts
    console.log('📌 Seeding Routes...');
    const routesData = [
      {
        routeNumber: 'EX 1-1',
        name: 'Makumbura - Galle Express (E01)',
        orig: 'Makumbura Multimodal Transport Hub (Kottawa)',
        dest: 'Galle Central Bus Stand',
        dist: 116.5,
        duration: 75,
        intermediate: [
          { name: 'Makumbura Multimodal Transport Hub (Kottawa)', dist: 0.0, eta: 0 },
          { name: 'Dodangoda Interchange Halt', dist: 42.0, eta: 25 },
          { name: 'Kurundugahahetekma Interchange Halt', dist: 78.5, eta: 48 },
          { name: 'Galle Central Bus Stand', dist: 116.5, eta: 75 },
        ],
      },
      {
        routeNumber: 'EX 1-2',
        name: 'Kadawatha - Matara Super Luxury (E01 / E02)',
        orig: 'Kadawatha Intermodal Terminal',
        dest: 'Matara Integrated Transport Hub',
        dist: 158.0,
        duration: 105,
        intermediate: [
          { name: 'Kadawatha Intermodal Terminal', dist: 0.0, eta: 0 },
          { name: 'Makumbura Multimodal Transport Hub (Kottawa)', dist: 22.0, eta: 18 },
          { name: 'Dodangoda Interchange Halt', dist: 64.0, eta: 42 },
          { name: 'Galle Central Bus Stand', dist: 138.5, eta: 88 },
          { name: 'Matara Integrated Transport Hub', dist: 158.0, eta: 105 },
        ],
      },
      {
        routeNumber: '154',
        name: 'Kiribathgoda - Bambalapitiya (via Baseline & Town Hall)',
        orig: 'Kiribathgoda Terminal',
        dest: 'Bambalapitiya Junction',
        dist: 18.5,
        duration: 55,
        intermediate: [
          { name: 'Kiribathgoda Terminal', dist: 0.0, eta: 0 },
          { name: 'Kadawatha Intermodal Terminal', dist: 3.5, eta: 10 },
          { name: 'Colombo Fort Central Station', dist: 13.0, eta: 38 },
          { name: 'Bambalapitiya Junction', dist: 18.5, eta: 55 },
        ],
      },
      {
        routeNumber: '138',
        name: 'Pettah - Maharagama / Homagama',
        orig: 'Pettah Main Bus Stand',
        dest: 'Maharagama Central Bus Stand',
        dist: 16.0,
        duration: 45,
        intermediate: [
          { name: 'Pettah Main Bus Stand', dist: 0.0, eta: 0 },
          { name: 'Colombo Fort Central Station', dist: 1.5, eta: 5 },
          { name: 'Maharagama Central Bus Stand', dist: 16.0, eta: 45 },
        ],
      },
    ];

    const routeMap: { [k: string]: string } = {};
    for (const r of routesData) {
      const origId = haltMap[r.orig];
      const destId = haltMap[r.dest];
      if (!origId || !destId) continue;

      let routeId: string;
      const res = await query(
        `INSERT INTO core.routes (route_number, name, origin_halt_id, destination_halt_id, total_distance_km, estimated_duration_mins, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT (route_number) WHERE (is_active = TRUE) DO UPDATE
         SET name = EXCLUDED.name, total_distance_km = EXCLUDED.total_distance_km
         RETURNING id`,
        [r.routeNumber, r.name, origId, destId, r.dist, r.duration]
      );

      if (res.rows.length > 0) {
        routeId = res.rows[0].id;
      } else {
        const exist = await query('SELECT id FROM core.routes WHERE route_number = $1', [r.routeNumber]);
        routeId = exist.rows[0].id;
      }
      routeMap[r.routeNumber] = routeId;

      // Seed route_halts
      for (let i = 0; i < r.intermediate.length; i++) {
        const step = r.intermediate[i];
        const stepHaltId = haltMap[step.name];
        if (stepHaltId) {
          await query(
            `INSERT INTO core.route_halts (route_id, halt_id, sequence_order, distance_from_origin_km, travel_time_from_origin_mins)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (route_id, sequence_order) DO UPDATE
             SET halt_id = EXCLUDED.halt_id, distance_from_origin_km = EXCLUDED.distance_from_origin_km`,
            [routeId, stepHaltId, i + 1, step.dist, step.eta]
          );
        }
      }
    }

    // 4. Vehicles
    console.log('📌 Seeding Vehicles & Documents...');
    const vehiclesData = [
      {
        reg: 'WP ND-8812',
        chassis: 'CHS-8812-AY',
        engine: 'ENG-9912-DL',
        make: 'Ashok Leyland',
        model: 'Viking AC Semi-Luxury',
        year: 2022,
        seats: 48,
        fuel: 'DIESEL',
        ac: true,
        odo: 64200.0,
      },
      {
        reg: 'WP NC-4491',
        chassis: 'CHS-4491-YT',
        engine: 'ENG-4491-YT',
        make: 'Yutong',
        model: 'ZK6122HD Luxury Express',
        year: 2023,
        seats: 45,
        fuel: 'DIESEL',
        ac: true,
        odo: 38400.0,
      },
      {
        reg: 'WP NA-2015',
        chassis: 'CHS-2015-IK',
        engine: 'ENG-2015-IK',
        make: 'Isuzu',
        model: 'Journey City Bus',
        year: 2020,
        seats: 42,
        fuel: 'DIESEL',
        ac: false,
        odo: 112000.0,
      },
      {
        reg: 'WP ND-9920',
        chassis: 'CHS-9920-HY',
        engine: 'ENG-9920-HY',
        make: 'Golden Dragon',
        model: 'Navigator Coach',
        year: 2024,
        seats: 52,
        fuel: 'HYBRID',
        ac: true,
        odo: 15400.0,
      },
    ];

    const vehicleMap: { [k: string]: string } = {};
    for (const v of vehiclesData) {
      const res = await query(
        `INSERT INTO core.vehicles (registration_number, chassis_number, engine_number, make, model, year, total_seats, fuel_type, has_ac, is_active, odometer_km)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10)
         ON CONFLICT (registration_number) WHERE (deleted_at IS NULL) DO UPDATE
         SET make = EXCLUDED.make, odometer_km = EXCLUDED.odometer_km
         RETURNING id`,
        [v.reg, v.chassis, v.engine, v.make, v.model, v.year, v.seats, v.fuel, v.ac, v.odo]
      );
      const vehId = res.rows[0].id;
      vehicleMap[v.reg] = vehId;

      // Seed Vehicle Compliance Documents
      const complianceDocs = [
        { type: 'REVENUE_LICENSE', expires: '2027-01-15' },
        { type: 'INSURANCE', expires: '2026-11-30' },
        { type: 'FITNESS', expires: '2026-09-20' },
        { type: 'EMISSION', expires: '2026-10-15' },
        { type: 'ROUTE_PERMIT', expires: '2027-03-31' },
      ];

      for (const cd of complianceDocs) {
        await query(
          `INSERT INTO core.vehicle_documents (vehicle_id, doc_type, file_path, issued_at, expires_at, is_verified, verified_by, verified_at)
           VALUES ($1, $2, $3, CURRENT_DATE - INTERVAL '6 months', $4, true, 'NTC Inspector', NOW())
           ON CONFLICT DO NOTHING`,
          [vehId, cd.type, `/documents/vehicles/${v.reg}/${cd.type}.pdf`, cd.expires]
        );
      }

      // Seed Seat Map for each vehicle
      for (let s = 1; s <= v.seats; s++) {
        const seatType = s <= 4 ? 'FRONT_ROW' : s === v.seats ? 'PREMIUM' : 'STANDARD';
        await query(
          `INSERT INTO core.seat_map (vehicle_id, seat_number, seat_type, is_active)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (vehicle_id, seat_number) DO NOTHING`,
          [vehId, s, seatType]
        );
      }
    }

    // 5. Drivers
    console.log('📌 Seeding Drivers & Documents...');
    const driversData = [
      {
        nic: '198412003450',
        name: 'Sunil Shantha Perera',
        licNo: 'B-8839210',
        licClass: 'DE',
        licExp: '2028-05-14',
        phone: '0771234567',
        emg: '0719876543',
        address: 'No. 45, Temple Road, Kottawa',
        dob: '1984-06-12',
        gender: 'MALE',
        assignedReg: 'WP ND-8812',
      },
      {
        nic: '199023004561',
        name: 'Kusal Mendis Gunathilake',
        licNo: 'B-9912044',
        licClass: 'D',
        licExp: '2027-08-20',
        phone: '0772345678',
        emg: '0718765432',
        address: 'No. 12/A, Station Road, Kadawatha',
        dob: '1990-03-24',
        gender: 'MALE',
        assignedReg: 'WP NC-4491',
      },
      {
        nic: '198811445522',
        name: 'Ruwan Priyadarshana Jayasinghe',
        licNo: 'B-7740192',
        licClass: 'D',
        licExp: '2026-09-10', // Expiring soon for alert test
        phone: '0773456789',
        emg: '0717654321',
        address: 'No. 88, Kandy Road, Kiribathgoda',
        dob: '1988-11-04',
        gender: 'MALE',
        assignedReg: 'WP NA-2015',
      },
      {
        nic: '198655009911',
        name: 'Chaminda Roshan Silva',
        licNo: 'B-6629100',
        licClass: 'DE',
        licExp: '2029-02-28',
        phone: '0774567890',
        emg: '0716543210',
        address: 'No. 102, High Level Road, Maharagama',
        dob: '1986-09-18',
        gender: 'MALE',
        assignedReg: 'WP ND-9920',
      },
    ];

    const driverMap: { [k: string]: string } = {};
    for (const d of driversData) {
      const res = await query(
        `INSERT INTO core.drivers (nic_number, full_name, license_number, license_expiry, license_class, phone, emergency_contact, address, date_of_birth, gender, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
         ON CONFLICT (nic_number) WHERE (deleted_at IS NULL) DO UPDATE
         SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone
         RETURNING id`,
        [d.nic, d.name, d.licNo, d.licExp, d.licClass, d.phone, d.emg, d.address, d.dob, d.gender]
      );
      const driverId = res.rows[0].id;
      driverMap[d.name] = driverId;

      // Seed Driver Documents
      const driverDocs = [
        { type: 'NIC', expires: '2035-01-01' },
        { type: 'LICENSE', expires: d.licExp },
        { type: 'MEDICAL', expires: '2026-12-31' },
        { type: 'BACKGROUND_CHECK', expires: '2027-06-30' },
      ];

      for (const dd of driverDocs) {
        await query(
          `INSERT INTO core.driver_documents (driver_id, doc_type, file_path, issued_at, expires_at, is_verified, verified_by, verified_at)
           VALUES ($1, $2, $3, CURRENT_DATE - INTERVAL '1 year', $4, true, 'Chief Transit Officer', NOW())
           ON CONFLICT DO NOTHING`,
          [driverId, dd.type, `/documents/drivers/${d.licNo}/${dd.type}.pdf`, dd.expires]
        );
      }

      // Assign Vehicle
      const vehId = vehicleMap[d.assignedReg];
      if (vehId) {
        await query(
          `INSERT INTO core.driver_assignments (driver_id, vehicle_id, assigned_from, is_current, assigned_by)
           VALUES ($1, $2, CURRENT_DATE - INTERVAL '30 days', true, 'Fleet Manager')
           ON CONFLICT (driver_id) WHERE (is_current = TRUE) DO UPDATE
           SET vehicle_id = EXCLUDED.vehicle_id`,
          [driverId, vehId]
        );
      }
    }

    // 6. Maintenance Logs
    console.log('📌 Seeding Maintenance Logs...');
    const maintData = [
      {
        reg: 'WP ND-8812',
        type: 'ROUTINE',
        desc: '50,000 km general service, engine oil replacement, and brake pad inspection',
        odo: 50000,
        cost: 48500,
        performedBy: 'Ashok Leyland Authorized Workshop, Colombo',
        serviceDate: '2026-06-15',
        nextDate: '2026-12-15',
      },
      {
        reg: 'WP NC-4491',
        type: 'INSPECTION',
        desc: 'AC compressor re-gassing and pneumatic door calibration',
        odo: 35000,
        cost: 22000,
        performedBy: 'Yutong Lanka Service Centre',
        serviceDate: '2026-07-10',
        nextDate: '2027-01-10',
      },
    ];

    for (const m of maintData) {
      const vId = vehicleMap[m.reg];
      if (vId) {
        await query(
          `INSERT INTO core.vehicle_maintenance (vehicle_id, maintenance_type, description, odometer_at_service, cost, service_date, next_service_date, performed_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT DO NOTHING`,
          [vId, m.type, m.desc, m.odo, m.cost, m.serviceDate, m.nextDate, m.performedBy]
        );
      }
    }

    // 7. Schedules & Trips
    console.log('📌 Seeding Timetable Schedules & Trips...');
    const schedulesData = [
      {
        routeNum: 'EX 1-1',
        vehReg: 'WP ND-8812',
        driverName: 'Sunil Shantha Perera',
        dep: '06:00:00',
        arr: '07:15:00',
        days: [1, 2, 3, 4, 5, 6, 7],
      },
      {
        routeNum: 'EX 1-1',
        vehReg: 'WP ND-8812',
        driverName: 'Sunil Shantha Perera',
        dep: '09:30:00',
        arr: '10:45:00',
        days: [1, 2, 3, 4, 5, 6, 7],
      },
      {
        routeNum: 'EX 1-2',
        vehReg: 'WP NC-4491',
        driverName: 'Kusal Mendis Gunathilake',
        dep: '07:00:00',
        arr: '08:45:00',
        days: [1, 2, 3, 4, 5, 6, 7],
      },
      {
        routeNum: '154',
        vehReg: 'WP NA-2015',
        driverName: 'Ruwan Priyadarshana Jayasinghe',
        dep: '07:30:00',
        arr: '08:25:00',
        days: [1, 2, 3, 4, 5],
      },
      {
        routeNum: '138',
        vehReg: 'WP ND-9920',
        driverName: 'Chaminda Roshan Silva',
        dep: '08:00:00',
        arr: '08:45:00',
        days: [1, 2, 3, 4, 5, 6],
      },
    ];

    const scheduleMap: { [k: string]: string } = {};
    for (let i = 0; i < schedulesData.length; i++) {
      const s = schedulesData[i];
      const rId = routeMap[s.routeNum];
      const vId = vehicleMap[s.vehReg];
      const dId = driverMap[s.driverName];

      if (rId && vId && dId) {
        const res = await query(
          `INSERT INTO biz.schedules (route_id, vehicle_id, driver_id, departure_time, arrival_time, days_of_week, valid_from, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE - INTERVAL '60 days', true)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [rId, vId, dId, s.dep, s.arr, s.days]
        );

        let schedId: string;
        if (res.rows.length > 0) {
          schedId = res.rows[0].id;
        } else {
          const ex = await query(
            `SELECT id FROM biz.schedules WHERE route_id = $1 AND vehicle_id = $2 AND departure_time = $3`,
            [rId, vId, s.dep]
          );
          schedId = ex.rows[0].id;
        }
        scheduleMap[`${s.routeNum}-${s.dep}`] = schedId;

        // Create Live Trip for Today
        const tripStatus = i === 0 ? 'IN_PROGRESS' : i === 1 ? 'SCHEDULED' : i === 2 ? 'DELAYED' : 'BOARDING';
        const delayReason = tripStatus === 'DELAYED' ? 'Heavy rainfall near Kurundugahahetekma' : null;

        const tripRes = await query(
          `INSERT INTO biz.trips (schedule_id, vehicle_id, driver_id, trip_date, status, departed_at, delay_reason)
           VALUES ($1, $2, $3, CURRENT_DATE, $4::biz.trip_status_enum, CASE WHEN $4::text IN ('IN_PROGRESS', 'DELAYED') THEN NOW() - INTERVAL '30 minutes' ELSE NULL END, $5)
           ON CONFLICT (schedule_id, trip_date) DO UPDATE
           SET status = EXCLUDED.status, delay_reason = EXCLUDED.delay_reason
           RETURNING id`,
          [schedId, vId, dId, tripStatus, delayReason]
        );

        const tripId = tripRes.rows[0]?.id;

        // Trip halt logs
        if (tripId && haltMap['Makumbura Multimodal Transport Hub (Kottawa)']) {
          await query(
            `INSERT INTO biz.trip_halt_log (trip_id, halt_id, sequence_order, arrived_at, departed_at, passengers_boarded, passengers_alighted, current_occupancy)
             VALUES ($1, $2, 1, NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '35 minutes', 36, 0, 36)
             ON CONFLICT (trip_id, halt_id) DO NOTHING`,
            [tripId, haltMap['Makumbura Multimodal Transport Hub (Kottawa)']]
          );
        }
      }
    }

    // 8. Passengers & Loyalty
    console.log('📌 Seeding Passengers & Loyalty Tiers...');
    const passengersData = [
      {
        name: 'Kasun Bandara',
        phone: '0778899001',
        email: 'kasun.bandara@gmail.com',
        tier: 'GOLD',
        trips: 42,
        spent: 38500.0,
        points: 420,
      },
      {
        name: 'Dinithi Samarasinghe',
        phone: '0778899002',
        email: 'dinithi.s@outlook.com',
        tier: 'PLATINUM',
        trips: 98,
        spent: 94200.0,
        points: 1050,
      },
      {
        name: 'Nalinda Jayakody',
        phone: '0778899003',
        email: 'nalinda.j@yahoo.com',
        tier: 'SILVER',
        trips: 18,
        spent: 16800.0,
        points: 180,
      },
      {
        name: 'Thilini Fernando',
        phone: '0778899004',
        email: 'thilini.f@gmail.com',
        tier: 'BRONZE',
        trips: 5,
        spent: 4200.0,
        points: 50,
      },
    ];

    const passengerMap: { [k: string]: string } = {};
    for (const p of passengersData) {
      const res = await query(
        `INSERT INTO core.passengers (full_name, phone, email, is_verified, is_active)
         VALUES ($1, $2, $3, true, true)
         ON CONFLICT (phone) WHERE (deleted_at IS NULL) DO UPDATE
         SET full_name = EXCLUDED.full_name, email = EXCLUDED.email
         RETURNING id`,
        [p.name, p.phone, p.email]
      );
      const pId = res.rows[0].id;
      passengerMap[p.name] = pId;

      await query(
        `INSERT INTO core.passenger_loyalty (passenger_id, tier, total_trips, total_spent, points_balance)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (passenger_id) DO UPDATE
         SET tier = EXCLUDED.tier, total_trips = EXCLUDED.total_trips, total_spent = EXCLUDED.total_spent`,
        [pId, p.tier, p.trips, p.spent, p.points]
      );

      // Create user account
      await query(
        `INSERT INTO core.user_accounts (email, phone, password_hash, user_type, passenger_id, is_active)
         VALUES ($1, $2, 'pbkdf2_sha256$260000$rapidroutehash', 'PASSENGER', $3, true)
         ON CONFLICT (phone) DO NOTHING`,
        [p.email, p.phone, pId]
      );
    }

    // Admin user
    await query(
      `INSERT INTO core.user_accounts (email, phone, password_hash, user_type, is_active)
       VALUES ('admin@rapidroute.lk', '0770001122', 'pbkdf2_sha256$260000$adminhash', 'ADMIN', true)
       ON CONFLICT (phone) DO NOTHING`
    );

    // 9. Fare Rules
    console.log('📌 Seeding Fare Rules...');
    if (routeMap['EX 1-1'] && haltMap['Makumbura Multimodal Transport Hub (Kottawa)'] && haltMap['Galle Central Bus Stand']) {
      await query(
        `INSERT INTO fin.fare_rules (route_id, from_halt_id, to_halt_id, base_fare, per_km_rate, has_ac_surcharge, ac_surcharge_amount, effective_from)
         VALUES ($1, $2, $3, 950.00, 0.00, true, 150.00, '2026-01-01')
         ON CONFLICT DO NOTHING`,
        [routeMap['EX 1-1'], haltMap['Makumbura Multimodal Transport Hub (Kottawa)'], haltMap['Galle Central Bus Stand']]
      );
    }

    if (routeMap['EX 1-2'] && haltMap['Kadawatha Intermodal Terminal'] && haltMap['Matara Integrated Transport Hub']) {
      await query(
        `INSERT INTO fin.fare_rules (route_id, from_halt_id, to_halt_id, base_fare, per_km_rate, has_ac_surcharge, ac_surcharge_amount, effective_from)
         VALUES ($1, $2, $3, 1450.00, 0.00, true, 200.00, '2026-01-01')
         ON CONFLICT DO NOTHING`,
        [routeMap['EX 1-2'], haltMap['Kadawatha Intermodal Terminal'], haltMap['Matara Integrated Transport Hub']]
      );
    }

    // 10. Sample Bookings & Payments
    console.log('📌 Seeding Sample Bookings & Payments...');
    const tripForBooking = await query('SELECT id FROM biz.trips LIMIT 1');
    if (tripForBooking.rows.length > 0 && passengerMap['Kasun Bandara']) {
      const tId = tripForBooking.rows[0].id;
      const existBooking = await query(
        `SELECT id FROM biz.bookings WHERE booking_ref = 'BK-20260826-001' OR (trip_id = $1 AND seat_number = 12)`,
        [tId]
      );

      let bookingId: string;
      if (existBooking.rows.length === 0) {
        const bRes = await query(
          `INSERT INTO biz.bookings (passenger_id, trip_id, boarding_halt_id, alighting_halt_id, seat_number, fare_amount, booking_status, booking_ref)
           VALUES ($1, $2, $3, $4, 12, 1100.00, 'CONFIRMED', 'BK-20260826-001')
           RETURNING id`,
          [
            passengerMap['Kasun Bandara'],
            tId,
            haltMap['Makumbura Multimodal Transport Hub (Kottawa)'],
            haltMap['Galle Central Bus Stand'],
          ]
        );
        bookingId = bRes.rows[0].id;
      } else {
        bookingId = existBooking.rows[0].id;
      }

      await query(
        `INSERT INTO fin.payments (booking_id, payment_method, amount, currency, transaction_ref, payment_status, paid_at)
         VALUES ($1, 'ONLINE_BANKING', 1100.00, 'LKR', 'TXN-20260826-8812', 'SUCCESS', NOW())
         ON CONFLICT (transaction_ref) DO NOTHING`,
        [bookingId]
      );
    }

    // 11. System Notifications
    console.log('📌 Seeding System Notifications...');
    if (passengerMap['Kasun Bandara']) {
      await query(
        `INSERT INTO system.notifications (passenger_id, channel, message_type, body, status, sent_at)
         VALUES ($1, 'SMS', 'Booking Confirmation', 'Your booking BK-20260826-001 for Route EX 1-1 (Seat 12) is confirmed.', 'SENT', NOW())`,
        [passengerMap['Kasun Bandara']]
      );
    }

    console.log('====================================================');
    console.log(' Sri Lankan Transit Database Seed Completed Successfully!');
    console.log('====================================================');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await pool.end();
  }
}

seed();
