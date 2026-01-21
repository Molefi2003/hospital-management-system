import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const RecordPage = ({ patient, onBack }) => {
    const [records, setRecords] = useState([]);
    const [bills, setBills] = useState([]);
    const [newDiag, setNewDiag] = useState({ diagnosis: '', prescription: '' });

    // 1. Move fetch logic to a useCallback so it can be reused safely
    const refreshData = useCallback(async () => {
        try {
            const [recordsRes, billsRes] = await Promise.all([
                axios.get(`https://krpcc.onrender.com/patients/${patient.id}/records`),
                axios.get(`https://krpcc.onrender.com/patients/${patient.id}/bills`)
            ]);
            setRecords(recordsRes.data);
            setBills(billsRes.data);
        } catch (err) {
            console.error("Error fetching data:", err);
        }
    }, [patient.id]);

    // 2. Fetch on initial load
    useEffect(() => {
        refreshData();
    }, [refreshData]);

    // 3. Add record + auto-invoice
    const handleAddRecord = async (e) => {
        e.preventDefault();
        try {
            await axios.post('https://krpcc.onrender.com/records', {
                patient_id: patient.id,
                doctor_name: 'Dr. Smith',
                diagnosis: newDiag.diagnosis,
                prescription: newDiag.prescription
            });

            await axios.post('https://krpcc.onrender.com/billing', {
                patient_id: patient.id,
                amount: 250.00
            });

            setNewDiag({ diagnosis: '', prescription: '' });
            alert("✅ Consultation Saved & Invoice Generated (P250.00)");
            
            // Refresh using our helper
            refreshData();
        } catch (err) {
            alert("Error saving record or generating bill");
        }
    };

    // 4. Handle Payment with Method
    const handlePayment = async (billId) => {
        const method = window.prompt("Enter Payment Method (Cash/Card/Medical Aid):", "Cash");
        
        if (method) {
            try {
                await axios.put(`https://krpcc.onrender.com/billing/${billId}/pay`, { method: method });
                alert(`💰 Payment of P250 received via ${method}!`);
                refreshData();
            } catch (err) {
                alert("Payment update failed.");
            }
        }
    };

    // 5. Print Prescription
    const printPrescription = (record) => {
        const win = window.open('', '_blank');
        win.document.write(`
            <html>
                <body style="font-family: Arial; padding: 40px; border: 2px solid #34495e;">
                    <h1 style="text-align:center;">🏥 MEDICAL PRESCRIPTION</h1>
                    <hr/>
                    <p><strong>Patient:</strong> ${patient.full_name}</p>
                    <p><strong>Date:</strong> ${new Date(record.visit_date).toLocaleDateString()}</p>
                    <hr/>
                    <h3>Diagnosis:</h3><p>${record.diagnosis}</p>
                    <h3>Rx / Medication:</h3><p>${record.prescription}</p>
                    <br/><br/>
                    <p>Doctor's Signature: ____________________</p>
                </body>
            </html>
        `);
        win.document.close();
        win.print();
    };

    // 6. Print Invoice
    const printInvoice = (bill) => {
        const win = window.open('', '_blank');
        win.document.write(`
            <html>
                <body style="font-family: Arial; padding: 40px;">
                    <div style="text-align:center; border:1px solid #000; padding:10px;">
                        <h1>🏥 HMS HOSPITAL INVOICE</h1>
                    </div>
                    <br/>
                    <p><strong>Invoice ID:</strong> #INV-00${bill.id}</p>
                    <p><strong>Patient:</strong> ${patient.full_name}</p>
                    <p><strong>Date:</strong> ${new Date(bill.billing_date).toLocaleDateString()}</p>
                    <hr/>
                    <table style="width:100%; text-align:left; border-collapse:collapse;">
                        <tr style="background:#eee;">
                            <th style="padding:10px; border:1px solid #ddd;">Description</th>
                            <th style="padding:10px; border:1px solid #ddd;">Amount</th>
                        </tr>
                        <tr>
                            <td style="padding:10px; border:1px solid #ddd;">General Consultation Fee</td>
                            <td style="padding:10px; border:1px solid #ddd;">P${bill.amount}</td>
                        </tr>
                    </table>
                    <h2 style="text-align:right;">Total: P${bill.amount}</h2>
                    <p>Status: <strong>${bill.status}</strong></p>
                    <p>Payment Method: <strong>${bill.payment_method || 'N/A'}</strong></p>
                </body>
            </html>
        `);
        win.document.close();
        win.print();
    };

    return (
        <div className="container">
            <button onClick={onBack} className="btn-back">← Back to Dashboard</button>
            <h2>EHR for {patient.full_name}</h2>
            <p><strong>Age:</strong> {patient.age} | <strong>Phone:</strong> {patient.phone}</p>
            
            <div className="form-section" style={{background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>
                <h3>Add New Consultation</h3>
                <form onSubmit={handleAddRecord}>
                    <input 
                        placeholder="Diagnosis" 
                        value={newDiag.diagnosis} 
                        onChange={e => setNewDiag({...newDiag, diagnosis: e.target.value})} 
                        required 
                    />
                    <textarea 
                        placeholder="Prescription Details" 
                        value={newDiag.prescription} 
                        onChange={e => setNewDiag({...newDiag, prescription: e.target.value})} 
                        required 
                    />
                    <button type="submit" className="btn-add">Save & Generate Invoice</button>
                </form>
            </div>

            <hr/>
            
            <h3>Visit History</h3>
            {records.length > 0 ? (
                records.map(record => (
                    <div key={record.id} className="record-card" style={{borderLeft: '5px solid #3498db', padding: '10px', marginBottom: '10px', background: '#fff'}}>
                        <p><strong>Date:</strong> {new Date(record.visit_date).toLocaleDateString()}</p>
                        <p><strong>Diagnosis:</strong> {record.diagnosis}</p>
                        <button onClick={() => printPrescription(record)} style={{background: '#95a5a6', color: 'white', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer'}}>
                            🖨️ Print Rx
                        </button>
                    </div>
                ))
            ) : (
                <p>No medical history found.</p>
            )}

            <hr/>

            <h3 style={{marginTop: '30px'}}>Billing & Invoices</h3>
            <table style={{width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '8px', overflow: 'hidden'}}>
                <thead>
                    <tr style={{background: '#2c3e50', color: 'white'}}>
                        <th style={{padding: '10px'}}>Date</th>
                        <th style={{padding: '10px'}}>Amount</th>
                        <th style={{padding: '10px'}}>Status</th>
                        <th style={{padding: '10px'}}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {bills.length > 0 ? (
                        bills.map(bill => (
                            <tr key={bill.id} style={{borderBottom: '1px solid #ddd', textAlign: 'center'}}>
                                <td style={{padding: '10px'}}>{new Date(bill.billing_date).toLocaleDateString()}</td>
                                <td style={{padding: '10px'}}>P{bill.amount}</td>
                                <td style={{padding: '10px', color: bill.status === 'Paid' ? 'green' : 'red', fontWeight: 'bold'}}>
                                    {bill.status}
                                </td>
                                <td style={{padding: '10px'}}>
                                    <button onClick={() => printInvoice(bill)} style={{marginRight: '5px'}}>📄 Invoice</button>
                                    {bill.status === 'Unpaid' && (
                                        <button onClick={() => handlePayment(bill.id)} style={{background: '#27ae60', color: 'white', border:'none', borderRadius:'4px', cursor:'pointer', padding:'5px 10px'}}>
                                            💳 Pay
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan="4" style={{padding: '10px'}}>No billing history.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default RecordPage;
