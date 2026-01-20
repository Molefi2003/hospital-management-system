import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// 1. ELECTRONIC HEALTH RECORDS COMPONENT
const RecordPage = ({ patient, onBack }) => {
  const [records, setRecords] = useState([]);
  const [newDiag, setNewDiag] = useState({ diagnosis: '', prescription: '' });

  useEffect(() => {
    const fetchRecords = () => {
      axios.get(`http://localhost:5000/patients/${patient.id}/records`)
        .then(res => setRecords(res.data))
        .catch(err => console.log(err));
    };
    fetchRecords();
  }, [patient.id]);

  const handleAddRecord = async (e) => {
    e.preventDefault();
    await axios.post('http://localhost:5000/records', {
      patient_id: patient.id,
      doctor_name: 'Dr. Smith',
      diagnosis: newDiag.diagnosis,
      prescription: newDiag.prescription
    });
    
    await axios.post('http://localhost:5000/billing', {
        patient_id: patient.id,
        amount: 250.00
    });

    setNewDiag({ diagnosis: '', prescription: '' });
    const res = await axios.get(`http://localhost:5000/patients/${patient.id}/records`);
    setRecords(res.data);
    alert("✅ Consultation Saved & Invoice Generated (P250.00)");
  };

  const printPrescription = (record) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <body style="font-family: Arial; padding: 40px;">
          <h1 style="text-align:center;">🏥 HMS OFFICIAL PRESCRIPTION</h1>
          <hr/>
          <p><strong>Patient Name:</strong> ${patient.full_name}</p>
          <p><strong>Date:</strong> ${new Date(record.visit_date).toLocaleDateString()}</p>
          <p><strong>Doctor:</strong> ${record.doctor_name}</p>
          <hr/>
          <h3>Diagnosis:</h3><p>${record.diagnosis}</p>
          <h3>Rx (Medication):</h3><p>${record.prescription}</p>
          <br/><br/>
          <p>Signature: ____________________</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="container">
      <button onClick={onBack} className="btn-back">← Back to Dashboard</button>
      <h2>Medical File: {patient.full_name}</h2>
      <div className="form-section" style={{background: '#e8f4fd', border: '1px solid #3498db'}}>
        <h3>New Consultation Entry</h3>
        <form onSubmit={handleAddRecord}>
          <input placeholder="Diagnosis" value={newDiag.diagnosis} onChange={e => setNewDiag({...newDiag, diagnosis: e.target.value})} required />
          <textarea placeholder="Prescription / Treatment Plan" value={newDiag.prescription} onChange={e => setNewDiag({...newDiag, prescription: e.target.value})} required />
          <button type="submit" className="btn-add">Save Entry</button>
        </form>
      </div>
      <h3>Visit History</h3>
      {records.length > 0 ? records.map(r => (
        <div key={r.id} className="record-card">
          <p><strong>Date:</strong> {new Date(r.visit_date).toLocaleDateString()} | <strong>Dr:</strong> {r.doctor_name}</p>
          <p><strong>Diagnosis:</strong> {r.diagnosis}</p>
          <p><strong>Prescription:</strong> {r.prescription}</p>
          <button onClick={() => printPrescription(r)} style={{marginTop:'10px', padding:'5px', cursor:'pointer'}}>🖨️ Print Prescription</button>
        </div>
      )) : <p>No records found.</p>}
    </div>
  );
};

// 2. PHARMACY DASHBOARD COMPONENT
const PharmacyPage = ({ onBack }) => {
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/pharmacy/prescriptions')
      .then(res => setPrescriptions(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleDispense = (id) => {
    alert(`✅ Medication for Prescription #${id} has been dispensed.`);
  };

  return (
    <div className="container">
      <button onClick={onBack} className="btn-back">← Back to Dashboard</button>
      <div className="table-section">
        <h2 style={{color: '#8e44ad'}}>💊 Pharmacy Dispensing Queue</h2>
        <table>
          <thead>
            <tr style={{background: '#8e44ad', color: 'white'}}>
              <th>Patient</th><th>Medication</th><th>Date</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {prescriptions.length > 0 ? prescriptions.map(pr => (
              <tr key={pr.id}>
                <td><strong>{pr.full_name}</strong></td>
                <td>{pr.prescription}</td>
                <td>{new Date(pr.visit_date).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleDispense(pr.id)} style={{background:'#27ae60', color:'white', border:'none', padding:'5px 10px', borderRadius:'4px', cursor:'pointer'}}>Dispense</button>
                </td>
              </tr>
            )) : <tr><td colSpan="4">No pending prescriptions.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 3. GLOBAL BILLING DASHBOARD COMPONENT
const BillingDashboard = ({ onBack }) => {
    const [allBills, setAllBills] = useState([]);

    const fetchAllBills = async () => {
        try {
            const res = await axios.get('http://localhost:5000/billing/all');
            setAllBills(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchAllBills(); }, []);

    const chartData = allBills.reduce((acc, bill) => {
        const date = new Date(bill.billing_date).toLocaleDateString();
        const existing = acc.find(item => item.date === date);
        if (existing) {
            existing.amount += parseFloat(bill.amount);
        } else {
            acc.push({ date, amount: parseFloat(bill.amount) });
        }
        return acc;
    }, []).reverse();

    const handlePayment = async (billId) => {
        const method = window.prompt("Payment Method (Cash/Card/Medical Aid):", "Cash");
        if (method) {
            await axios.put(`http://localhost:5000/billing/${billId}/pay`, { method });
            alert("Payment Recorded!");
            fetchAllBills();
        }
    };

    return (
        <div className="container">
            <button onClick={onBack} className="btn-back">← Back to Dashboard</button>
            <div className="table-section">
                <h2 style={{ color: '#27ae60' }}>💰 Clinic Finance Dashboard</h2>
                <div style={{ height: 250, background: '#f9f9f9', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
                    <h4 style={{marginTop: 0}}>Daily Revenue Trend</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="amount" stroke="#27ae60" strokeWidth={3} dot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <table>
                    <thead>
                        <tr style={{ background: '#27ae60', color: 'white' }}>
                            <th>Patient</th><th>Amount</th><th>Status</th><th>Method</th><th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allBills.map(bill => (
                            <tr key={bill.id}>
                                <td>{bill.full_name}</td>
                                <td>P{bill.amount}</td>
                                <td style={{ color: bill.status === 'Paid' ? 'green' : 'red' }}>{bill.status}</td>
                                <td>{bill.payment_method || '---'}</td>
                                <td>
                                    {bill.status === 'Unpaid' && 
                                        <button onClick={() => handlePayment(bill.id)} style={{background:'#2ecc71', color:'white', border:'none', borderRadius:'4px', cursor:'pointer'}}>Pay Now</button>
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// 4. PATIENTS MANAGEMENT PAGE
const PatientsPage = ({ onBack }) => {
  const [patients, setPatients] = useState([]);
  const [formData, setFormData] = useState({ name: '', age: '', phone: '', history: '' });
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showApptModal, setShowApptModal] = useState(false);
  const [apptData, setApptData] = useState({ date: '', time: '', reason: '' });
  const [activePatientForAppt, setActivePatientForAppt] = useState(null);

  const url = 'http://localhost:5000/patients';

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    const res = await axios.get(url);
    setPatients(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await axios.put(`${url}/${editingId}`, formData);
      setEditingId(null);
    } else {
      await axios.post(url, formData);
    }
    setFormData({ name: '', age: '', phone: '', history: '' });
    fetchPatients();
  };

  const handleScheduleAppt = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/appointments', {
        patient_id: activePatientForAppt.id,
        date: apptData.date,
        time: apptData.time,
        reason: apptData.reason
      });
      alert("📅 Appointment Scheduled");
      setShowApptModal(false);
    } catch (err) { alert("Error scheduling"); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete?")) {
      await axios.delete(`${url}/${id}`);
      fetchPatients();
    }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setFormData({ name: p.full_name, age: p.age, phone: p.phone, history: p.medical_history || '' });
    window.scrollTo(0, 0);
  };

  if (selectedPatient) {
    return <RecordPage patient={selectedPatient} onBack={() => setSelectedPatient(null)} />;
  }

  return (
    <div className="container">
      <button onClick={onBack} className="btn-back">← Back to Dashboard</button>
      
      <section className="form-section">
        <h3>{editingId ? "✏️ Edit Patient" : "➕ Register Patient"}</h3>
        <form onSubmit={handleSubmit}>
          <input placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <input placeholder="Age" type="number" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} required />
          <input placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          <button type="submit" className="btn-add">{editingId ? "Update" : "Add"}</button>
        </form>
      </section>

      <section className="table-section">
        <input className="search-bar" placeholder="🔍 Search..." onChange={e => setSearch(e.target.value)} />
        <table>
          <thead><tr><th>Name</th><th>Age</th><th>Actions</th></tr></thead>
          <tbody>
            {patients.filter(p => p.full_name.toLowerCase().includes(search.toLowerCase())).map(p => (
              <tr key={p.id}>
                <td><strong>{p.full_name}</strong></td>
                <td>{p.age}</td>
                <td>
                  <button onClick={() => setSelectedPatient(p)} className="btn-view">EHR</button>
                  <button onClick={() => { setActivePatientForAppt(p); setShowApptModal(true); }} style={{background:'#2ecc71', color:'white', border:'none', padding:'5px', borderRadius:'4px', marginLeft:'5px'}}>📅</button>
                  <button onClick={() => startEdit(p)} style={{background:'#f39c12', color:'white', border:'none', padding:'5px', borderRadius:'4px', marginLeft:'5px'}}>Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="btn-delete" style={{marginLeft:'5px'}}>Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {showApptModal && (
        <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.7)', display:'flex', justifyContent:'center', alignItems:'center', zIndex: 1000}}>
          <div className="form-section" style={{background:'white', padding:'30px', borderRadius:'12px', width:'400px'}}>
            <h2>Schedule Appointment</h2>
            <form onSubmit={handleScheduleAppt}>
              <input type="date" value={apptData.date} onChange={e => setApptData({...apptData, date: e.target.value})} required />
              <input type="time" value={apptData.time} onChange={e => setApptData({...apptData, time: e.target.value})} required />
              <input placeholder="Reason" value={apptData.reason} onChange={e => setApptData({...apptData, reason: e.target.value})} required />
              <button type="submit" className="btn-add">Confirm</button>
              <button type="button" onClick={() => setShowApptModal(false)} className="btn-delete">Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// 5. APPOINTMENTS/QUEUE PAGE
const AppointmentsPage = ({ onBack }) => {
  const [todayQueue, setTodayQueue] = useState([]);

  useEffect(() => {
    fetchTodayQueue();
  }, []);

  const fetchTodayQueue = async () => {
    try {
      const res = await axios.get('http://localhost:5000/appointments');
      const today = new Date().toISOString().split('T')[0];
      const filtered = res.data.filter(a => a.appointment_date.startsWith(today));
      setTodayQueue(filtered);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="container">
      <button onClick={onBack} className="btn-back">← Back to Dashboard</button>
      <section className="table-section">
        <h3>📅 Today's Queue</h3>
        {todayQueue.length > 0 ? todayQueue.map(appt => (
          <div key={appt.id} style={{padding:'10px', borderBottom:'1px solid #eee'}}>
            {appt.appointment_time} - {appt.full_name} ({appt.reason})
          </div>
        )) : <p>No appointments today.</p>}
      </section>
    </div>
  );
};

// 6. DASHBOARD HOME VIEW (FIXED)
const DashboardHome = ({ userRole, onNavigate, onGenerateReport }) => {
  const dashboardCards = [
    { 
      id: 'patients', 
      title: '👥 Patient Management', 
      description: 'Register and manage patient records',
      color: '#3498db',
      roles: ['Admin', 'Receptionist']
    },
    { 
      id: 'appointments', 
      title: '📅 Appointments Queue', 
      description: "View today's scheduled appointments",
      color: '#9b59b6',
      roles: ['Admin', 'Receptionist']
    },
    { 
      id: 'billing', 
      title: '💰 Billing & Finance', 
      description: 'Manage payments and revenue',
      color: '#27ae60',
      roles: ['Admin', 'Receptionist']
    },
    { 
      id: 'pharmacy', 
      title: '💊 Pharmacy', 
      description: 'Dispense medications and prescriptions',
      color: '#8e44ad',
      roles: ['Admin', 'Pharmacist']
    }
  ];

  // FIXED: Case-insensitive role matching with trim
  const visibleCards = dashboardCards.filter(card => 
    card.roles.some(role => role.toLowerCase() === userRole.toLowerCase().trim())
  );

  // Debug logs (you can remove these after testing)
  console.log('Current User Role:', userRole);
  console.log('Visible Cards Count:', visibleCards.length);
  console.log('Visible Card IDs:', visibleCards.map(c => c.id));

  // Handle case where user has no access to any modules
  if (visibleCards.length === 0) {
    return (
      <div className="container">
        <div style={{ 
          textAlign: 'center', 
          padding: '50px', 
          background: '#fff3cd', 
          borderRadius: '10px', 
          margin: '20px',
          border: '2px solid #ffc107'
        }}>
          <h2 style={{ color: '#856404' }}>⚠️ No Modules Available</h2>
          <p style={{ fontSize: '16px', marginTop: '15px' }}>
            Your role <strong>"{userRole}"</strong> doesn't have access to any modules.
          </p>
          <p style={{ color: '#7f8c8d', marginTop: '20px' }}>
            Available roles: <strong>Admin</strong>, <strong>Receptionist</strong>, <strong>Pharmacist</strong>
          </p>
          <p style={{ color: '#7f8c8d', marginTop: '10px', fontSize: '14px' }}>
            Please contact your system administrator to update your access permissions.
          </p>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button 
            onClick={onGenerateReport} 
            style={{
              background:'#34495e', 
              color:'white', 
              border:'none', 
              padding:'12px 25px', 
              borderRadius:'8px', 
              cursor:'pointer',
              fontSize: '16px'
            }}
          >
            📊 Generate Daily Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2>Welcome to HMS Dashboard</h2>
        <p style={{ color: '#7f8c8d' }}>Select a module to get started</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px',
        marginBottom: '20px'
      }}>
        {visibleCards.map(card => (
          <div 
            key={card.id}
            onClick={() => onNavigate(card.id)}
            style={{
              background: 'white',
              border: `3px solid ${card.color}`,
              borderRadius: '12px',
              padding: '30px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <h3 style={{ color: card.color, marginBottom: '10px' }}>{card.title}</h3>
            <p style={{ color: '#7f8c8d', fontSize: '14px' }}>{card.description}</p>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button 
          onClick={onGenerateReport} 
          style={{
            background:'#34495e', 
            color:'white', 
            border:'none', 
            padding:'12px 25px', 
            borderRadius:'8px', 
            cursor:'pointer',
            fontSize: '16px'
          }}
        >
          📊 Generate Daily Report
        </button>
      </div>
    </div>
  );
};

// 7. MAIN APP COMPONENT
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userRole, setUserRole] = useState('Admin');
  const [view, setView] = useState('dashboard');

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // For development: Simple hardcoded login
    if (username === 'admin' && password === 'admin') {
      setIsLoggedIn(true);
      setUserRole('Admin');
      console.log('Logged in as Admin (hardcoded)');
      return;
    }
    
    try {
      const res = await axios.post('http://localhost:5000/login', { username, password });
      console.log('Login response:', res.data);
      
      if (res.data.success) { 
        setIsLoggedIn(true);
        setUserRole(res.data.role || 'Admin');
        console.log('Logged in with role:', res.data.role);
        setUsername('');
        setPassword('');
      } else {
        alert(res.data.message || "Invalid Credentials");
      }
    } catch (err) { 
      console.error('Login error:', err);
      
      if (err.response?.status === 500) {
        alert("Backend error. Use default login:\nUsername: admin\nPassword: admin");
      } else if (err.response?.status === 401) {
        alert("Invalid username or password");
      } else {
        alert("Cannot connect to server. Use default login:\nUsername: admin\nPassword: admin");
      }
    }
  };

  const generateDailyReport = async () => {
    try {
      const res = await axios.get('http://localhost:5000/appointments');
      const today = new Date().toISOString().split('T')[0];
      const todayAppts = res.data.filter(a => a.appointment_date.startsWith(today));
      
      const billRes = await axios.get('http://localhost:5000/billing/all');
      const todayRevenue = billRes.data
        .filter(b => b.billing_date.startsWith(today) && b.status === 'Paid')
        .reduce((sum, b) => sum + parseFloat(b.amount), 0);

      const reportWin = window.open('', '_blank');
      reportWin.document.write(`
        <html>
          <body style="font-family: Arial; padding: 40px;">
            <h1 style="text-align:center;">🏥 HMS DAILY SUMMARY REPORT</h1>
            <hr/>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Total Appointments Today:</strong> ${todayAppts.length}</p>
            <p><strong>Revenue Collected Today:</strong> P${todayRevenue.toFixed(2)}</p>
            <hr/>
            <h3>Patient Queue for Today:</h3>
            <ul>${todayAppts.map(a => `<li>${a.appointment_time} - ${a.full_name} (${a.reason})</li>`).join('')}</ul>
            <br/><br/>
            <p>Verified by: ____________________</p>
            <button onclick="window.print()">Print Report</button>
          </body>
        </html>
      `);
      reportWin.document.close();
    } catch (err) { 
      alert("Error generating report"); 
    }
  };

  // LOGIN SCREEN
  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <form className="login-card" onSubmit={handleLogin}>
          <h2>🏥 HMS Login</h2>
          <input 
            placeholder="Username" 
            value={username}
            onChange={e => setUsername(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={e => setPassword(e.target.value)} 
            required 
          />
          <button type="submit">Login</button>
          <p style={{ marginTop: '15px', fontSize: '12px', color: '#7f8c8d' }}>
            Test Login: admin / admin
          </p>
        </form>
      </div>
    );
  }

  // MAIN DASHBOARD
  return (
    <div className="App">
      <header style={{ 
        background: '#2c3e50', 
        color: 'white', 
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1>🏥 HMS Enterprise Portal</h1>
        <div>
          <span style={{ marginRight: '20px' }}>👤 {userRole}</span>
          <button 
            onClick={() => {
              setIsLoggedIn(false);
              setView('dashboard');
            }} 
            style={{
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '8px 15px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main style={{ padding: '20px' }}>
        {view === 'dashboard' && (
          <DashboardHome 
            userRole={userRole} 
            onNavigate={setView}
            onGenerateReport={generateDailyReport}
          />
        )}
        {view === 'patients' && <PatientsPage onBack={() => setView('dashboard')} />}
        {view === 'appointments' && <AppointmentsPage onBack={() => setView('dashboard')} />}
        {view === 'billing' && <BillingDashboard onBack={() => setView('dashboard')} />}
        {view === 'pharmacy' && <PharmacyPage onBack={() => setView('dashboard')} />}
      </main>
    </div>
  );
}

export default App;