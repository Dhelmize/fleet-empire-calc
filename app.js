function attachListeners() {
  const inputs = [
    // Global Multipliers
    'globalSeason', 'vipPass',
    
    // Tab 1: HQ & Overhead (Now fully dynamic)
    'fleetSemis', 'fleetBox', 'fleetVans', 
    'dispBase', 'mgrBase', 'feeSemi', 'feeBox', 'feeVan', 
    'insPremium', 'loanHourly',
    
    // Tab 2: Route Yields
    'basePay', 'distance', 'tripMinutes', 'cargoType', 'flashEvent', 'fuelPrice',
    
    // Tab 3: Business EV
    'cPallets', 'cRate', 'cLoads',
    
    // Tab 4: Federal Co-Op
    'fPallets', 'fPayout', 'fHostCap', 'fPartnerCap'
  ];

  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const eventType = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
      el.addEventListener(eventType, runAllCalculations);
    }
  });
}

function calcOverhead() {
  // Read Fleet Sizes
  const semis = parseInt(document.getElementById('fleetSemis').value) || 0;
  const box = parseInt(document.getElementById('fleetBox').value) || 0;
  const vans = parseInt(document.getElementById('fleetVans').value) || 0;
  
  // Read Custom Staff Salaries & Fees
  const dispBase = parseFloat(document.getElementById('dispBase').value) || 0;
  const mgrBase = parseFloat(document.getElementById('mgrBase').value) || 0;
  const feeSemi = parseFloat(document.getElementById('feeSemi').value) || 0;
  const feeBox = parseFloat(document.getElementById('feeBox').value) || 0;
  const feeVan = parseFloat(document.getElementById('feeVan').value) || 0;

  // Read Custom Insurance & Debt
  const insPremium = parseFloat(document.getElementById('insPremium').value) || 0;
  const loanHourly = parseFloat(document.getElementById('loanHourly').value) || 0;

  // Execute Math
  const basePayroll = dispBase + mgrBase;
  const vehicleFees = (semis * feeSemi) + (box * feeBox) + (vans * feeVan);
  const totalBurn = basePayroll + vehicleFees + insPremium + loanHourly;

  // DOM Updates
  document.getElementById('hqPayroll').innerText = `-$${basePayroll.toLocaleString()}`;
  document.getElementById('hqVehicles').innerText = `-$${vehicleFees.toLocaleString()}`;
  document.getElementById('hqInsurance').innerText = `-$${insPremium.toLocaleString()}`;
  document.getElementById('hqLoan').innerText = `-$${loanHourly.toLocaleString()}`;
  document.getElementById('hqTotalBurn').innerText = `-$${totalBurn.toLocaleString()} / hr`;
}