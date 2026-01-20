import React from 'react';

// This component controls what the user sees based on their role
const UserExperience = ({ userRole, activeTab, setActiveTab, setSelectedPatient }) => {
  return (
    <nav className="main-nav">
      {/* Everyone sees the Patients tab by default */}
      {['Admin', 'Receptionist'].includes(userRole) && (
        <>
          <button 
            className={activeTab === 'patients' ? 'active' : ''} 
            onClick={() => { setActiveTab('patients'); setSelectedPatient(null); }}
          >
            Patients & Registration
          </button>
          
          <button 
            className={activeTab === 'billing' ? 'active' : ''} 
            onClick={() => setActiveTab('billing')}
          >
            Finance & Billing
          </button>
        </>
      )}

      {/* Only Pharmacist or Admin sees Pharmacy */}
      {['Admin', 'Pharmacist'].includes(userRole) && (
        <button 
          className={activeTab === 'pharmacy' ? 'active' : ''} 
          onClick={() => setActiveTab('pharmacy')}
        >
          Pharmacy Dispensing
        </button>
      )}
    </nav>
  );
};

export default UserExperience;
