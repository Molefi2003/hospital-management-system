import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- NEW COMPONENT: AUDIT LOG PAGE ---
const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    axios.get('http://localhost:5000/audit-logs')
      .then(res => setLogs(res.data))
      .catch(err => console.error(err));
  }, []);

  const filteredLogs = logs.filter(log => 
    log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.patient_name && log.patient_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportToCSV = () => {
    const headers = ["Timestamp,User,Role,Action,Patient,Details\n"];
    const rows = filteredLogs.map(log => 
      `${new Date(log.action_timestamp).toLocaleString()},${log.user_name},${log.user_role},${log.action_type},${log.patient_name || 'N/A'},${log.details}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HMS_Audit_Log_${new Date().toLocaleDateString()}.csv`;
    a.click();
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{color: '#2c3e50', margin: 0}}>🛡️ System Audit Trail</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="🔍 Search staff or action..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 15px', borderRadius: '20px', border: '1px solid #ccc', width: '250px' }}
          />
          <button onClick={exportToCSV} style={{ background: '#27ae60', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>
            📥 Export CSV
          </button>
        </div>
      </div>
      <table style={{width: '100%', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)'}}>
        <thead>
          <tr style={{background: '#2c3e50', color: 'white'}}>
            <th>Timestamp</th><th>User</th><th>Action</th><th>Patient</th><th>Details</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.map(log => (
            <tr key={log.log_id}>
              <td style={{fontSize: '13px'}}>{new Date(log.action_timestamp).toLocaleString()}</td>
              <td><strong>{log.user_name}</strong> <small>({log.user_role})</small></td>
              <td><span style={{background: log.action_type === 'Deletion' ? '#ffdada' : '#eee', color: log.action_type === 'Deletion' ? '#c0392b' : '#333', padding: '2px 8px', borderRadius: '4px', fontSize: '12px'}}>{log.action_type}</span></td>
              <td>{log.patient_name || 'N/A'}</td>
              <td style={{fontStyle: 'italic', fontSize: '13px', color: '#666'}}>{log.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// 1. ELECTRONIC HEALTH RECORDS COMPONENT (Restored original)
const RecordPage = ({ patient, onBack }) => {
  const [records, setRecords] = useState([]);
  const [newDiag, setNewDiag] = useState({ diagnosis: '', prescription: '' });

  useEffect(() => {
    axios.get(`http://localhost:5000/patients/${patient.id}/records`)
      .then(res => setRecords(res.data))
      .catch(err => console.log(err));
  }, [patient.id]);

  const handleAddRecord = async (e) => {
    e.preventDefault();
    await axios.post('http://localhost:5000/records', {
      patient_id: patient.id,
      doctor_name: 'Dr. Smith',
      diagnosis: newDiag.diagnosis,
      prescription: newDiag.prescription
    });
    await axios.post('http://localhost:5000/billing', { patient_id: patient.id, amount: 250.00 });
    setNewDiag({ diagnosis: '', prescription: '' });
    const res = await axios.get(`http://localhost:5000/patients/${patient.id}/records`);
    setRecords(res.data);
    alert("✅ Consultation Saved & Invoice Generated");
  };

  return (
    <div className="container">
      <button onClick={onBack} className="btn-back">← Back</button>
      <h2>Medical File: {patient.full_name}</h2>
      <div className="form-section">
        <h3>New Entry</h3>
        <form onSubmit={handleAddRecord}>
          <input placeholder="Diagnosis" value={newDiag.diagnosis} onChange={e => setNewDiag({...newDiag, diagnosis: e.target.value})} required />
          <textarea placeholder="Prescription" value={newDiag.prescription} onChange={e => setNewDiag({...newDiag, prescription: e.target.value})} required />
          <button type="submit" className="btn-add">Save</button>
        </form>
      </div>
      <h3>History</h3>
      {records.map(r => (
        <div key={r.id} className="record-card">
          <p><strong>Date:</strong> {new Date(r.visit_date).toLocaleDateString()}</p>
          <p><strong>Diagnosis:</strong> {r.diagnosis}</p>
          <p><strong>Prescription:</strong> {r.prescription}</p>
        </div>
      ))}
    </div>
  );
};

// 2. PHARMACY DASHBOARD (Restored original)
const PharmacyPage = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  useEffect(() => {
    axios.get('http://localhost:5000/pharmacy/prescriptions').then(res => setPrescriptions(res.data));
  }, []);
  return (
    <div className="container">
      <h2 style={{color: '#8e44ad'}}>💊 Pharmacy Queue</h2>
      <table>
        <thead><tr style={{background: '#8e44ad', color: 'white'}}><th>Patient</th><th>Medication</th><th>Date</th></tr></thead>
        <tbody>
          {prescriptions.map(pr => (
            <tr key={pr.id}><td>{pr.full_name}</td><td>{pr.prescription}</td><td>{new Date(pr.visit_date).toLocaleDateString()}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// 3. GLOBAL BILLING DASHBOARD (Restored original + PDF Receipt)
const BillingDashboard = () => {
    const [allBills, setAllBills] = useState([]);
    const fetchAllBills = async () => {
      const res = await axios.get('http://localhost:5000/billing/all');
      setAllBills(res.data);
    };
    useEffect(() => { fetchAllBills(); }, []);

    const downloadReceipt = (bill) => {
        const doc = new jsPDF();
        doc.text("🏥 HMS CLINIC RECEIPT", 105, 20, { align: "center" });
        doc.autoTable({
          startY: 30,
          head: [['Patient', 'Amount', 'Date']],
          body: [[bill.full_name, `P${bill.amount}`, new Date(bill.billing_date).toLocaleDateString()]],
        });
        doc.save(`Receipt_${bill.full_name}.pdf`);
    };

    return (
        <div className="table-section">
            <h2>💰 Finance Dashboard</h2>
            <table>
                <thead><tr style={{ background: '#27ae60', color: 'white' }}><th>Patient</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                    {allBills.map(bill => (
                        <tr key={bill.id}>
                            <td>{bill.full_name}</td><td>P{bill.amount}</td><td>{bill.status}</td>
                            <td>
                              {bill.status === 'Paid' && <button onClick={() => downloadReceipt(bill)}>📥 PDF</button>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// 4. MAIN SYSTEM
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('patients');
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    if (isLoggedIn) {
      axios.get('http://localhost:5000/patients').then(res => setPatients(res.data));
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <form onSubmit={(e) => {e.preventDefault(); setIsLoggedIn(true);}} className="login-form">
          <h1>🏥 HMS Login</h1>
          <button type="submit">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="main-header">
        <h1>Clinic Management System</h1>
        <button onClick={() => setIsLoggedIn(false)} className="btn-logout">Logout</button>
      </header>

      <nav className="main-nav">
          <button onClick={() => {setActiveTab('patients'); setSelectedPatient(null);}}>Patients</button>
          <button onClick={() => setActiveTab('billing')}>Billing</button>
          <button onClick={() => setActiveTab('pharmacy')}>Pharmacy</button>
          <button onClick={() => setActiveTab('audit')} style={{background: '#2c3e50', color: 'white'}}>🛡️ Logs</button>
      </nav>

      <main className="content">
        {selectedPatient ? (
          <RecordPage patient={selectedPatient} onBack={() => setSelectedPatient(null)} />
        ) : (
          <>
            {activeTab === 'patients' && (
              <div className="container">
                <input placeholder="🔍 Search..." onChange={e => setSearchTerm(e.target.value)} />
                <div className="patient-grid">
                  {patients.filter(p => p.full_name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                    <div key={p.id} className="patient-card" onClick={() => setSelectedPatient(p)}>
                      <h3>{p.full_name}</h3><p>{p.phone}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'billing' && <BillingDashboard />}
            {activeTab === 'pharmacy' && <PharmacyPage />}
            {activeTab === 'audit' && <AuditLogPage />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
