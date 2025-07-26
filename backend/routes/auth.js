const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Test route to verify connection
router.get('/ping', (req, res) => {
  res.send('✅ auth.js is working');
});

//  POST /register
router.post('/register', async (req, res) => {
  const { fullname, mail, password, gender, id ,phone_number} = req.body;

  if (!fullname || !mail || !password || !id) {
    return res.status(400).json({ msg: 'Please fill all required fields' });
  }

  // Check if user already exists
  db.query('SELECT * FROM User WHERE email = ? OR user_id = ?', [mail, id], async (err, results) => {
    if (err) return res.status(500).json({ msg: 'Database error' });
    if (results.length > 0) {
      return res.status(409).json({ msg: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      user_id: id,
      name: fullname,
      email: mail,
      password: hashedPassword,
      gender: gender,
      phone_number: phone_number,
      role: 'student'
    };

    db.query('INSERT INTO User SET ?', newUser, (err, result) => {
      if (err) {
        console.error('❌ INSERT error:', err.sqlMessage);
        return res.status(500).json({ msg: 'Insert failed', error: err.sqlMessage });
      }

      const token = jwt.sign({ user_id: id, email: mail }, process.env.JWT_SECRET, {
        expiresIn: '2h'
      });

      res.status(201).json({ msg: 'User registered successfully', token });
    });
  });
});


// ✅ POST /login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ msg: 'Please enter both email and password' });
  }

  // Check if user exists
  db.query('SELECT * FROM User WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ msg: 'Database error' });

    if (results.length === 0) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const user = results[0];

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ msg: 'Incorrect password' });
    }

    // Create token
    const token = jwt.sign({ user_id: user.user_id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '2h'
    });

    res.json({
  msg: 'Login successful',
  token: token,
  user: {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    role: user.role,
    gender: user.gender    
  }
});

  });
});

router.get('/user/:id', (req, res) => {
  const userId = req.params.id;

  db.query('SELECT user_id, name, email, phone_number FROM User WHERE user_id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ msg: 'DB error' });
    if (results.length === 0) return res.status(404).json({ msg: 'User not found' });

    res.json(results[0]);
  });
});
//  UPDATE user profile
router.put('/user/:id', (req, res) => {
  const userId = req.params.id;
  const { name, email, phone_number } = req.body;

  db.query(
    'UPDATE User SET name = ?, email = ?, phone_number = ? WHERE user_id = ?',
    [name, email, phone_number, userId],
    (err, result) => {
      if (err) return res.status(500).json({ msg: 'Update failed', error: err });
      res.json({ msg: 'Profile updated successfully' });
    }
  );
});


module.exports = router;
