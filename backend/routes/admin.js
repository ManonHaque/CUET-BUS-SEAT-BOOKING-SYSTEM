// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../db');

//  Get all buses
router.get('/buses', (req, res) => {
  db.query('SELECT * FROM Bus', (err, results) => {
    if (err) return res.status(500).json({ msg: 'DB Error', error: err });
    res.json(results);
  });
});

//  Add a bus
router.post('/buses', (req, res) => {
  const { bus_name, bus_number, bus_type } = req.body;
  if (!bus_name || !bus_number || !bus_type) {
    return res.status(400).json({ msg: 'All fields required' });
  }

  const bus_id = Math.floor(100000 + Math.random() * 900000); // generate random id
  const query = 'INSERT INTO Bus (bus_id, bus_name, bus_number, bus_type) VALUES (?, ?, ?, ?)';

  db.query(query, [bus_id, bus_name, bus_number, bus_type], (err, result) => {
    if (err) return res.status(500).json({ msg: 'Insert error', error: err });

    // 🔽 Seat Generation Logic
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H','I','J','K']; // Row letters
    const columns = [1, 2, 3, 4, 5]; // Column numbers

    const seats = [];
    rows.forEach(r => {
      columns.forEach(c => {
        seats.push([r, c, bus_id, 'available']);
      });
    });

    const seatQuery = 'INSERT INTO Seat (r_number, column_number, bus_id, status) VALUES ?';

    db.query(seatQuery, [seats], (err2) => {
      if (err2) {
        console.error('❌ Seat insert failed:', err2);
        return res.status(500).json({ msg: 'Bus added but seat insert failed', error: err2 });
      }

      res.status(201).json({ msg: 'Bus and seats added successfully', bus_id });
    });
  });
});

//  PUT: Update a bus
router.put('/buses/:id', (req, res) => {
  const { bus_name, bus_number, bus_type } = req.body;
  const { id } = req.params;

  if (!bus_name || !bus_number || !bus_type) {
    return res.status(400).json({ msg: 'All fields required' });
  }

  db.query(
    'UPDATE Bus SET bus_name = ?, bus_number = ?, bus_type = ? WHERE bus_id = ?',
    [bus_name, bus_number, bus_type, id],
    (err, result) => {
      if (err) return res.status(500).json({ msg: 'Update failed', error: err });
      res.json({ msg: 'Bus updated' });
    }
  );
});
//  DELETE bus by ID
router.delete('/buses/:id', (req, res) => {
  const { id } = req.params;

  // First delete all seats of the bus, then delete the bus itself
db.query('DELETE FROM Seat WHERE bus_id = ?', [id], (err1) => {
  if (err1) return res.status(500).json({ msg: 'Failed to delete seats', error: err1 });

  db.query('DELETE FROM Bus WHERE bus_id = ?', [id], (err2) => {
    if (err2) return res.status(500).json({ msg: 'Failed to delete bus', error: err2 });

    res.json({ msg: 'Bus and associated seats deleted successfully' });
  });
});

});

//  GET all staff
router.get('/staff', (req, res) => {
  db.query('SELECT * FROM Staff', (err, results) => {
    if (err) return res.status(500).json({ msg: 'DB Error', error: err });
    res.json(results);
  });
});

//  POST new staff
router.post('/staff', (req, res) => {
  const { name, staff_role, location_link, phone_number } = req.body;


  if (!name || !staff_role) {
    return res.status(400).json({ msg: 'Name and Role are required' });
  }

  const staff_id = Math.floor(100000 + Math.random() * 900000); // random 6-digit ID

db.query(
  'INSERT INTO Staff (staff_id, name, staff_role, location_link, phone_number) VALUES (?, ?, ?, ?, ?)',
  [staff_id, name, staff_role, location_link, phone_number],

    (err, result) => {
      if (err) return res.status(500).json({ msg: 'Insert failed', error: err });
      res.status(201).json({ msg: 'Staff added', staff_id });
    }
  );
});
//  PUT: Update a staff member
router.put('/staff/:id', (req, res) => {
  const { name, staff_role, location_link, phone_number } = req.body;
  const { id } = req.params;

  if (!name || !staff_role) {
    return res.status(400).json({ msg: 'Name and Role are required' });
  }

  db.query(
  'UPDATE Staff SET name = ?, staff_role = ?, location_link = ?, phone_number = ? WHERE staff_id = ?',
  [name, staff_role, location_link, phone_number, id],
    (err, result) => {
      if (err) return res.status(500).json({ msg: 'Update failed', error: err });
      res.json({ msg: 'Staff updated' });
    }
  );
});

//  DELETE staff
router.delete('/staff/:id', (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM Staff WHERE staff_id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ msg: 'Delete failed', error: err });
    res.json({ msg: 'Staff deleted successfully' });
  });
});


//  GET all routes
router.get('/routes', (req, res) => {
  db.query('SELECT * FROM Route', (err, results) => {
    if (err) return res.status(500).json({ msg: 'DB Error', error: err });
    res.json(results);
  });
});
//  POST: Create a new route
router.post('/routes', (req, res) => {
  const { source, destination, via } = req.body;

  if (!source || !destination) {
    return res.status(400).json({ msg: 'Source and destination are required' });
  }

  const route_id = Math.floor(100000 + Math.random() * 900000);

  db.query(
    'INSERT INTO Route (route_id, source, destination, via) VALUES (?, ?, ?, ?)',
    [route_id, source, destination, via],
    (err, result) => {
      if (err) return res.status(500).json({ msg: 'Insert failed', error: err });
      res.status(201).json({ msg: 'Route added', route_id });
    }
  );
});

//  PUT: Update a route
router.put('/routes/:id', (req, res) => {
  const { source, destination, via } = req.body;
  const { id } = req.params;

  if (!source || !destination) {
    return res.status(400).json({ msg: 'Source and destination are required' });
  }

  db.query(
    'UPDATE Route SET source = ?, destination = ?, via = ? WHERE route_id = ?',
    [source, destination, via, id],
    (err, result) => {
      if (err) return res.status(500).json({ msg: 'Update failed', error: err });
      res.json({ msg: 'Route updated' });
    }
  );
});


//  DELETE /routes/:id
router.delete('/routes/:id', (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM Route WHERE route_id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ msg: 'Delete failed', error: err });
    res.json({ msg: 'Route deleted successfully' });
  });
});

//  GET all schedules
router.get('/schedules', (req, res) => {
  db.query(
    `SELECT s.*, 
       r.source, r.destination, r.via,
       b.bus_name, b.bus_number, b.bus_type,
       dr.name AS driver_name, 
       hl.name AS helper_name

     FROM Schedule s
     JOIN Route r ON s.route_id = r.route_id
     JOIN Bus b ON s.bus_id = b.bus_id
     LEFT JOIN Staff dr ON s.driver_id = dr.staff_id
     LEFT JOIN Staff hl ON s.helper_id = hl.staff_id
     WHERE TIMESTAMP(s.date, s.time) >= (NOW() - INTERVAL 15 MINUTE)`,
    (err, results) => {
      if (err) {
        console.error('❌ Schedule query failed:', err); // Log the real error
        return res.status(500).json({ msg: 'DB Error', error: err });
      }
      res.json(results);
    }
  );
});


router.post('/schedules', (req, res) => {
  const { time, date, bus_id, route_id, driver_id, helper_id } = req.body;


  //  Validate input
  if (!time || !date || !bus_id || !route_id || !driver_id || !helper_id) {
    return res.status(400).json({ msg: 'All fields are required' });
  }

  //  Generate random schedule_id
  const schedule_id = Math.floor(100000 + Math.random() * 900000);

  //  Insert into DB
  db.query(
    'INSERT INTO Schedule (schedule_id, time, date, route_id, bus_id, driver_id, helper_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [schedule_id, time, date, route_id, bus_id, driver_id, helper_id],
    (err, result) => {
      if (err) {
        console.error('❌ Schedule INSERT failed:', err);
        return res.status(500).json({ msg: 'Insert failed', error: err });
      }
      res.status(201).json({ msg: 'Schedule added', schedule_id });
    }
  );
});


//  PUT: Update a schedule
router.put('/schedules/:id', (req, res) => {
  const { time, date, bus_id, route_id, driver_id, helper_id } = req.body;
  const { id } = req.params;

  if (!time || !date || !bus_id || !route_id || !driver_id || !helper_id) {
    return res.status(400).json({ msg: 'All fields are required' });
  }

  db.query(
    'UPDATE Schedule SET time = ?, date = ?, bus_id = ?, route_id = ?, driver_id = ?, helper_id = ? WHERE schedule_id = ?',
    [time, date, bus_id, route_id, driver_id, helper_id, id],
    (err, result) => {
      if (err) {
        console.error('❌ Update failed:', err);
        return res.status(500).json({ msg: 'Update failed', error: err });
      }
      res.json({ msg: 'Schedule updated' });
    }
  );
});

router.delete('/schedules/:id', (req, res) => {
  const { id } = req.params;

  // First delete all bookings related to this schedule
  db.query('DELETE FROM Booking WHERE schedule_id = ?', [id], (err1) => {
    if (err1) return res.status(500).json({ msg: 'Failed to delete bookings', error: err1 });

    // Then delete the schedule
    db.query('DELETE FROM Schedule WHERE schedule_id = ?', [id], (err2) => {
      if (err2) return res.status(500).json({ msg: 'Failed to delete schedule', error: err2 });

      res.json({ msg: 'Schedule and associated bookings deleted successfully ✅' });
    });
  });
});



module.exports = router;

