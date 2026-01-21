const PharmacyPage = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [stockSearch, setStockSearch] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false); // New state for the filter
  const [newMed, setNewMed] = useState({ name: '', batch: '', qty: 0, cost: 0, sale: 0, expiry: '', supplier: '' });

  const fetchData = async () => {
    try {
      const prescRes = await axios.get('https://krpcc.onrender.com/pharmacy/prescriptions');
      setPrescriptions(prescRes.data);
      const invRes = await axios.get('https://krpcc.onrender.com/inventory');
      setInventory(invRes.data);
    } catch (err) { console.error("Error fetching data:", err); }
  };

  useEffect(() => { fetchData(); }, []);

  // Updated: Filter logic now considers both search term and the "low stock" toggle
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.medicine_name.toLowerCase().includes(stockSearch.toLowerCase()) ||
                          (item.batch_number && item.batch_number.toLowerCase().includes(stockSearch.toLowerCase()));
    
    // Only show items that match search AND are below reorder level (if toggle is on)
    if (showLowStockOnly) {
      return matchesSearch && item.quantity_on_hand <= item.reorder_level;
    }
    
    return matchesSearch; // Otherwise, just show items that match the search
  });

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://krpcc.onrender.com/inventory', newMed);
      setNewMed({ name: '', batch: '', qty: 0, cost: 0, sale: 0, expiry: '', supplier: '' });
      fetchData();
      alert("✅ Stock updated successfully!");
    } catch (err) { console.error(err); }
  };

  const handleDispense = (id) => {
    alert(`Prescription #${id} marked as dispensed!`);
  };

  return (
    <div className="container">
      {/* 1. PRESCRIPTION QUEUE (Same as before) */}
      <h2 style={{color: '#8e44ad'}}>💊 Pharmacy Dashboard</h2>
      <table style={{width: '100%', background: '#fff', borderRadius: '8px', marginBottom: '40px'}}>
        <thead>
          <tr style={{background: '#8e44ad', color: 'white'}}>
            <th>Patient</th><th>Medication</th><th>Date</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {prescriptions.length > 0 ? prescriptions.map(pr => (
            <tr key={pr.id}>
              <td>{pr.full_name}</td>
              <td><strong>{pr.prescription}</strong></td>
              <td>{new Date(pr.visit_date).toLocaleDateString()}</td>
              <td>
                <button onClick={() => handleDispense(pr.id)} style={{background: '#27ae60', color: 'white', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer'}}>
                  Mark as Dispensed
                </button>
              </td>
            </tr>
          )) : <tr><td colSpan="4" style={{textAlign:'center', padding:'10px'}}>No pending prescriptions</td></tr>}
        </tbody>
      </table>

      {/* 2. INVENTORY SEARCH & STOCK SECTION */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
        <h2 style={{color: '#2c3e50', margin: 0}}>📋 Current Stock Levels</h2>
        <div style={{display: 'flex', gap: '10px'}}>
          {/* NEW: Low Stock Filter Button */}
          <button 
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            style={{
              padding: '8px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              background: showLowStockOnly ? '#e74c3c' : '#fff',
              color: showLowStockOnly ? 'white' : '#e74c3c',
              border: '1px solid #e74c3c'
            }}
          >
            {showLowStockOnly ? '✅ Showing Low Stock' : '🔔 Show Low Stock Only'}
          </button>

          {/* Search Input Bar */}
          <input 
            type="text" 
            placeholder="🔍 Search medicine or batch..." 
            value={stockSearch}
            onChange={(e) => setStockSearch(e.target.value)}
            style={{padding: '8px 12px', borderRadius: '20px', border: '1px solid #ccc', width: '250px'}}
          />
        </div>
      </div>

      <table style={{width: '100%', background: '#fff', borderRadius: '8px', marginBottom: '40px'}}>
        {/* ... table head and body rendering filteredInventory ... */}
        <thead>
          <tr style={{background: '#2c3e50', color: 'white'}}>
            <th>Medicine</th><th>Batch</th><th>Qty</th><th>Expiry</th><th>Price</th>
          </tr>
        </thead>
        <tbody>
          {filteredInventory.length > 0 ? filteredInventory.map(item => (
            <tr key={item.inventory_id}>
              <td><strong>{item.medicine_name}</strong></td>
              <td>{item.batch_number}</td>
              <td style={{color: item.quantity_on_hand <= item.reorder_level ? 'red' : 'green', fontWeight: 'bold'}}>
                {item.quantity_on_hand}
              </td>
              <td>{item.expiration_date ? new Date(item.expiration_date).toLocaleDateString() : 'N/A'}</td>
              <td>P{item.sale_price}</td>
            </tr>
          )) : <tr><td colSpan="5" style={{textAlign:'center', padding:'10px'}}>No matching medicines found</td></tr>}
        </tbody>
      </table>

      {/* 3. ADD STOCK FORM (Same as before) */}
       {/* ... (Your Add stock form remains unchanged) ... */}
    </div>
  );
};
