const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});


// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.stack);
  } else {
    console.log('✅ Database connected successfully');
    release();
  }
});

// --- AUDIT LOG HELPER ---
const logAction = async (user, role, type, patient, details) => {
  try {
    await pool.query(
      "INSERT INTO audit_logs (user_name, user_role, action_type, patient_name, details) VALUES($1, $2, $3, $4, $5)",
      [user, role, type, patient, details]
    );
  } catch (err) {
    console.error("Audit log error:", err.message);
  }
};

// --- PATIENT ROUTES ---

app.get('/patients', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM patients ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error", details: err.message });
  }
});

app.post('/patients', async (req, res) => {
  try {
    const { name, age, gender, phone, history } = req.body;
    const newPatient = await pool.query(
      "INSERT INTO patients (full_name, age, gender, phone, medical_history) VALUES($1, $2, $3, $4, $5) RETURNING *",
      [name, age, gender, phone, history]
    );
    // LOG ACTION
    await logAction('System User', 'Staff', 'Registration', name, 'New patient registered');
    res.json(newPatient.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Database Error", details: err.message });
  }
});

app.put('/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, phone } = req.body;
    const result = await pool.query(
      "UPDATE patients SET full_name = $1, age = $2, phone = $3 WHERE id = $4 RETURNING *",
      [name, age, phone, id]
    );
    await logAction('System User', 'Staff', 'Update', name, `Updated patient ID: ${id}`);
    res.json({ message: "Update Successful", data: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Update Error", details: err.message });
  }
});

app.delete('/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM patients WHERE id = $1", [id]);
    await logAction('System User', 'Admin', 'Deletion', 'N/A', `Deleted patient ID: ${id}`);
    res.json({ message: "Patient deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Delete Error", details: err.message });
  }
});

// --- MEDICAL RECORDS ROUTES ---

app.get('/patients/:id/records', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM medical_records WHERE patient_id = $1 ORDER BY visit_date DESC",
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error fetching history", details: err.message });
  }
});

app.post('/records', async (req, res) => {
  try {
    const { patient_id, doctor_name, diagnosis, prescription } = req.body;
    const result = await pool.query(
      "INSERT INTO medical_records (patient_id, doctor_name, diagnosis, prescription) VALUES($1, $2, $3, $4) RETURNING *",
      [patient_id, doctor_name, diagnosis, prescription]
    );
    await logAction(doctor_name, 'Doctor', 'Consultation', `ID: ${patient_id}`, `Prescribed: ${prescription}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error saving record", details: err.message });
  }
});

// --- APPOINTMENT ROUTES ---

app.get('/appointments', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT a.*, p.full_name FROM appointments a JOIN patients p ON a.patient_id = p.id ORDER BY a.appointment_date ASC, a.appointment_time ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error fetching appointments", details: err.message });
  }
});

app.post('/appointments', async (req, res) => {
  try {
    const { patient_id, date, time, reason } = req.body;
    const result = await pool.query(
      "INSERT INTO appointments (patient_id, appointment_date, appointment_time, reason) VALUES($1, $2, $3, $4) RETURNING *",
      [patient_id, date, time, reason]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Appointment Error", details: err.message });
  }
});

// --- BILLING ROUTES ---

app.get('/patients/:id/bills', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM billing WHERE patient_id = $1 ORDER BY billing_date DESC", [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Billing Fetch Error", details: err.message });
  }
});

app.get('/billing/all', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, p.full_name 
      FROM billing b 
      JOIN patients p ON b.patient_id = p.id 
      ORDER BY b.billing_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Global Billing Error", details: err.message });
  }
});

app.post('/billing', async (req, res) => {
  try {
    const { patient_id, amount } = req.body;
    const result = await pool.query(
      "INSERT INTO billing (patient_id, amount) VALUES($1, $2) RETURNING *",
      [patient_id, amount]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Billing Post Error", details: err.message });
  }
});

app.put('/billing/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { method } = req.body;
    await pool.query(
      "UPDATE billing SET status = 'Paid', payment_method = $1 WHERE id = $2",
      [method, id]
    );
    await logAction('Receptionist', 'Staff', 'Payment', `Inv #${id}`, `Received via ${method}`);
    res.json({ message: "Payment successful" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Payment Update Error", details: err.message });
  }
});

// --- MEDICINE INVENTORY ROUTES ---

app.get('/inventory', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM medicine_inventory ORDER BY medicine_name ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error fetching inventory", details: err.message });
  }
});

app.post('/inventory', async (req, res) => {
  try {
    const { name, batch, qty, cost, sale, expiry, supplier } = req.body;
    const result = await pool.query(
      "INSERT INTO medicine_inventory (medicine_name, batch_number, quantity_on_hand, cost_price, sale_price, expiration_date, supplier) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [name, batch, qty, cost, sale, expiry, supplier]
    );
    await logAction('Pharmacist', 'Pharmacy', 'Stock Entry', name, `Added ${qty} units`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error adding medicine", details: err.message });
  }
});

// --- SYSTEM AUDIT LOG ROUTE ---
app.get('/audit-logs', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM audit_logs ORDER BY action_timestamp DESC LIMIT 100");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error fetching logs", details: err.message });
  }
});

// --- AUTH ROUTES ---

// Login endpoint with better error handling
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Username and password are required" 
      });
    }
    
    // Check if users table exists
    const tableCheck = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
    );
    
    if (!tableCheck.rows[0].exists) {
      console.log('⚠️ Users table does not exist');
      return res.status(500).json({ 
        success: false, 
        message: "Users table not found. Please run database setup.",
        error: "USERS_TABLE_NOT_FOUND"
      });
    }
    
    // Query user
    const user = await pool.query(
      "SELECT * FROM users WHERE username = $1", 
      [username]
    );
    
    if (user.rows.length === 0) {
      await logAction(username, 'Unknown', 'Failed Login', 'N/A', 'Invalid username');
      return res.status(401).json({ 
        success: false, 
        message: "Invalid username or password" 
      });
    }
    
    const userData = user.rows[0];
    
    // Check if password is hashed (starts with $2b$ for bcrypt)
    let passwordMatch = false;
    
    if (userData.password.startsWith('$2b$')) {
      // Hashed password - use bcrypt
      passwordMatch = await bcrypt.compare(password, userData.password);
    } else {
      // Plain text password (legacy/dev mode)
      passwordMatch = password === userData.password;
    }
    
    if (!passwordMatch) {
      await logAction(username, userData.role || 'User', 'Failed Login', 'N/A', 'Invalid password');
      return res.status(401).json({ 
        success: false, 
        message: "Invalid username or password" 
      });
    }
    
    // Successful login
    const { password: pwd, ...userDataWithoutPassword } = userData;
    await logAction(username, userData.role || 'User', 'Login', 'N/A', 'Successful login');
    
    res.json({ 
      success: true, 
      role: userData.role || 'Admin',
      user: userDataWithoutPassword 
    });
    
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Login Server Error",
      error: err.message 
    });
  }
});

// Register new user (admin only - add your own authentication check)
app.post('/register', async (req, res) => {
  try {
    const { username, password, role, full_name } = req.body;
    
    // Validate input
    if (!username || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        message: "Username, password, and role are required" 
      });
    }
    
    // Check if username already exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: "Username already exists" 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert new user
    const newUser = await pool.query(
      "INSERT INTO users (username, password, role, full_name) VALUES($1, $2, $3, $4) RETURNING id, username, role, full_name, created_at",
      [username, hashedPassword, role, full_name]
    );
    
    await logAction('System', 'Admin', 'User Registration', username, `New ${role} user created`);
    
    res.json({ 
      success: true, 
      message: "User registered successfully",
      user: newUser.rows[0]
    });
    
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Registration Error",
      error: err.message 
    });
  }
});

// --- PHARMACY DASHBOARD ROUTE ---
app.get('/pharmacy/prescriptions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.id, m.prescription, m.visit_date, p.full_name, p.phone 
      FROM medical_records m 
      JOIN patients p ON m.patient_id = p.id 
      WHERE m.prescription IS NOT NULL AND m.prescription != ''
      ORDER BY m.visit_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Pharmacy Fetch Error", details: err.message });
  }
});

// GET Daily Clinic Summary
app.get('/reports/daily-summary', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const patients = await pool.query("SELECT COUNT(*) FROM patients WHERE created_at::date = $1", [today]);
    const appointments = await pool.query("SELECT COUNT(*) FROM appointments WHERE appointment_date = $1", [today]);
    const revenue = await pool.query("SELECT SUM(amount) FROM billing WHERE billing_date::date = $1 AND status = 'Paid'", [today]);

    res.json({
      date: today,
      newPatients: patients.rows[0].count,
      totalAppointments: appointments.rows[0].count,
      totalRevenue: revenue.rows[0].sum || 0
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Report Error", details: err.message });
  }
});

// --- DATABASE SETUP HELPER ENDPOINT ---
app.get('/setup/check-tables', async (req, res) => {
  try {
    const tables = ['users', 'patients', 'medical_records', 'appointments', 'billing', 'audit_logs', 'medicine_inventory'];
    const results = {};
    
    for (const table of tables) {
      const check = await pool.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
        [table]
      );
      results[table] = check.rows[0].exists;
    }
    
    res.json({
      success: true,
      tables: results,
      allTablesExist: Object.values(results).every(exists => exists)
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      error: "Database check error",
      details: err.message 
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: err.message 
    });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Database tables check: http://localhost:${PORT}/setup/check-tables`);
});