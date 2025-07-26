// routes/booking.js
const express = require('express');
const router = express.Router();
const db = require('../db');


router.get('/seats/:schedule_id', (req, res) => {
    const schedule_id = req.params.schedule_id;
    const user_id = req.query.user_id;

    const seatQuery = `
  SELECT 
    Seat.r_number, Seat.column_number, Seat.status,
    b.bus_id, b.bus_name, b.bus_number, b.bus_type,
    s.time, s.date,
    r.source, r.destination, r.via,
    dr.name AS driver_name, dr.phone_number AS driver_phone, dr.location_link AS driver_location,
    hl.name AS helper_name, hl.phone_number AS helper_phone, hl.location_link AS helper_location
  FROM Schedule s
  JOIN Bus b ON s.bus_id = b.bus_id
  JOIN Seat ON Seat.bus_id = b.bus_id
  JOIN Route r ON s.route_id = r.route_id
  LEFT JOIN Staff dr ON s.driver_id = dr.staff_id
  LEFT JOIN Staff hl ON s.helper_id = hl.staff_id
  WHERE s.schedule_id = ?
`;


    db.query(seatQuery, [schedule_id], (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ msg: 'DB error or no data', error: err });

        const seatList = results.map(row => ({
            r_number: row.r_number,
            column_number: row.column_number,
            status: row.status
        }));

        const first = results[0];
        const busInfo = {
            bus_name: first.bus_name,
            bus_number: first.bus_number,
            bus_type: first.bus_type,
            time: first.time,
            source: first.source,
            destination: first.destination,
            via: first.via,
            driver: {
                name: first.driver_name,
                phone: first.driver_phone,
                location: first.driver_location
            },
            helper: {
                name: first.helper_name,
                phone: first.helper_phone,
                location: first.helper_location
            }
        };

        if (!user_id) return res.json({ seats: seatList, busInfo, alreadyBooked: false });

        const checkQuery = `
      SELECT r_number, column_number
      FROM Booking
      WHERE user_id = ? AND schedule_id = ?
    `;

        db.query(checkQuery, [user_id, schedule_id], (err2, bookResults) => {
            if (err2) return res.status(500).json({ msg: 'Booking check error', error: err2 });

            const alreadyBooked = bookResults.length > 0;
            const bookedSeat = alreadyBooked ? bookResults[0] : null;

            res.json({ seats: seatList, busInfo, alreadyBooked, bookedSeat });
        });
    });
});


// Confirm booking
router.post('/book', (req, res) => {
    const { schedule_id, user_id, r_number, column_number, old_r_number, old_column_number } = req.body;

    if (!schedule_id || !user_id || !r_number || !column_number) {
        return res.status(400).json({ msg: 'Missing required fields' });
    }

    // 🔁 If old seat exists → this is an edit
    const isEdit = old_r_number && old_column_number;

    const timeQuery = `SELECT time FROM Schedule WHERE schedule_id = ?`;

    db.query(timeQuery, [schedule_id], (err, timeResult) => {
        if (err || timeResult.length === 0) {
            return res.status(500).json({ msg: 'Schedule lookup failed', error: err });
        }

        const time = timeResult[0].time;

        const checkConflict = `
      SELECT booking_id FROM Booking b
      JOIN Schedule s ON s.schedule_id = b.schedule_id
      WHERE b.user_id = ? AND s.time = ? ${isEdit ? 'AND NOT (b.r_number = ? AND b.column_number = ?)' : ''}
    `;

        const checkParams = isEdit
            ? [user_id, time, old_r_number, old_column_number]
            : [user_id, time];

        db.query(checkConflict, checkParams, (err2, result) => {
            if (err2) return res.status(500).json({ msg: 'Conflict check failed', error: err2 });

            if (result.length > 0) {
                return res.status(409).json({ msg: 'You already have a booking at this time.' });
            }

            if (isEdit) {
                // 1️⃣ Update booking
                const updateBooking = `
          UPDATE Booking
          SET r_number = ?, column_number = ?, booking_time = NOW()
          WHERE user_id = ? AND schedule_id = ?
        `;

                db.query(updateBooking, [r_number, column_number, user_id, schedule_id], (err3) => {
                    if (err3) return res.status(500).json({ msg: 'Booking update failed', error: err3 });

                    // 2️⃣ Update seat statuses
                    // 1️⃣ First: free the old seat
                    db.query(
                        `UPDATE Seat SET status = 'available'
   WHERE r_number = ? AND column_number = ? 
     AND bus_id = (SELECT bus_id FROM Schedule WHERE schedule_id = ?)`,
                        [old_r_number, old_column_number, schedule_id],
                        (err4a) => {
                            if (err4a) {
                                return res.status(500).json({ msg: 'Failed to free old seat', error: err4a });
                            }

                            // 2️⃣ Then: mark new seat as booked
                            db.query(
                                `UPDATE Seat SET status = 'unavailable'
       WHERE r_number = ? AND column_number = ? 
         AND bus_id = (SELECT bus_id FROM Schedule WHERE schedule_id = ?)`,
                                [r_number, column_number, schedule_id],
                                (err4b) => {
                                    if (err4b) {
                                        return res.status(500).json({ msg: 'Failed to reserve new seat', error: err4b });
                                    }

                                    return res.status(201).json({ msg: 'Booking updated successfully!' });
                                }
                            );
                        }
                    );

                });

            } else {
                // ✅ First, check if seat is still available
                const seatCheck = `
  SELECT status FROM Seat 
  WHERE r_number = ? AND column_number = ? 
    AND bus_id = (SELECT bus_id FROM Schedule WHERE schedule_id = ?)
`;

                db.query(seatCheck, [r_number, column_number, schedule_id], (errCheck, seatRows) => {
                    if (errCheck || seatRows.length === 0) {
                        return res.status(500).json({ msg: 'Seat check failed or not found' });
                    }

                    if (seatRows[0].status !== 'available') {
                        return res.status(409).json({ msg: 'Seat is already booked or unavailable' });
                    }

                    // ✅ Proceed with insert
                    const insertQuery = `
    INSERT INTO Booking (booking_time, user_id, schedule_id, r_number, column_number)
    VALUES (NOW(), ?, ?, ?, ?)
  `;

                    db.query(insertQuery, [user_id, schedule_id, r_number, column_number], (err5) => {
                        if (err5) return res.status(500).json({ msg: 'Booking failed', error: err5 });

                        const seatUpdate = `
      UPDATE Seat
      SET status = 'unavailable'
      WHERE r_number = ? AND column_number = ? AND bus_id = (
        SELECT bus_id FROM Schedule WHERE schedule_id = ?
      )
    `;

                        db.query(seatUpdate, [r_number, column_number, schedule_id], (err6) => {
                            if (err6) return res.status(500).json({ msg: 'Seat update failed', error: err6 });

                            res.status(201).json({ msg: 'Seat booked successfully!' });
                        });
                    });
                });

            }
        });
    });
});

// routes/booking.js (add this route)

router.get('/mybookings/:user_id', (req, res) => {
    const user_id = req.params.user_id;

    const query = `
    SELECT b.*, s.time, s.date,
           r.source, r.destination, r.via,
           bus.bus_name, bus.bus_number
    FROM Booking b
    JOIN Schedule s ON b.schedule_id = s.schedule_id
    JOIN Route r ON s.route_id = r.route_id
    JOIN Bus bus ON s.bus_id = bus.bus_id
    WHERE b.user_id = ?
  `;

    db.query(query, [user_id], (err, results) => {
        if (err) return res.status(500).json({ msg: 'DB error', error: err });

        const now = new Date();
        const upcoming = [];
        const past = [];

        results.forEach(item => {
            const datePart = new Date(item.date);
            const [hours, minutes] = item.time.split(':').map(Number);
            datePart.setHours(hours);
            datePart.setMinutes(minutes);
            datePart.setSeconds(0);
            datePart.setMilliseconds(0);
            const depDateTime = datePart;

            const diff = (depDateTime - now) / 60000;

            console.log({
                schedule_id: item.schedule_id,
                date: item.date,
                time: item.time,
                depDateTime: depDateTime.toString(),
                diff
            });

            if (!depDateTime || isNaN(depDateTime)) {
                console.warn(`❗ Skipped booking with invalid datetime: schedule_id = ${item.schedule_id}`);
                return;
            }

            if (diff >= -60) {
                upcoming.push(item);
            } else {
                past.push(item);
            }
        });



        res.json({ upcoming, history: past });
    });
});


module.exports = router;

