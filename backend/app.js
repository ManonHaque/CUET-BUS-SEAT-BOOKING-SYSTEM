const express = require('express');
const cors = require('cors'); // ✅ added
const db = require('./db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const cron = require('node-cron');
const bookingRoutes = require('./routes/booking'); // add this
require('dotenv').config();

const app = express();

app.use(cors());           //  added this line
app.use(express.json());   //  handles JSON

app.use('/api', authRoutes);

app.use('/api/admin', adminRoutes);

app.use('/api/booking', bookingRoutes); // add this below others


app.get('/', (req, res) => {
  db.query('SELECT 1', (err, results) => {
    if (err) return res.status(500).send('❌ DB not connected');
    res.send('✅ DB is connected and working!');
  });
});

app.listen(5000, () => {
  console.log(' Server running on port 5000');
});



cron.schedule('* * * * *', () => {
  const query = `
    SELECT s.schedule_id, s.bus_id, s.date, s.time,
           TIMESTAMP(s.date, s.time) AS departure_time
    FROM Schedule s
    WHERE TIMESTAMP(s.date, s.time) < (NOW() - INTERVAL 15 MINUTE)
  `;

  db.query(query, (err, schedules) => {
    if (err) return console.error('❌ Error fetching expired schedules:', err);

    schedules.forEach(schedule => {
      const { schedule_id, bus_id, departure_time } = schedule;

      console.log(`♻️ Schedule passed: ID=${schedule_id}, Bus=${bus_id}, Departure=${departure_time}`);

      // ✅ Reset all seats of the bus to available
      db.query(
        'UPDATE Seat SET status = "available" WHERE bus_id = ?',
        [bus_id],
        (err3) => {
          if (err3) return console.error(`❌ Failed to reset seats for bus ${bus_id}`, err3);
          console.log(`✅ Seats reset for bus ${bus_id}`);
        }
      );
    });
  });
});
