let gameData = {};

// Handle dynamic tab switching and styling
window.switchTab = function(tabId) {
  const tabs = ['overview', 'hauls', 'contracts', 'federal'];
  
  tabs.forEach(id => {
    // Hide panels
    document.getElementById(`tab-${id}`).classList.add('hidden');
    document.getElementById(`tab-${id}`).classList.remove('animate-fade-in');
    
    // Reset button styles
    const btn = document.getElementById(`btn-${id}`);
    btn.classList.remove('border-brand-accent', 'text-white');
    btn.classList.add('border-transparent', 'text-gray-400');
  });
  
  // Show active panel
  document.getElementById(`tab-${tabId}`).classList.remove('hidden');
  
  // Trigger ultra-light fade animation (using Tailwind arbitrary values in CSS if configured)
  setTimeout(() => document.getElementById(`tab-${tabId}`).classList.add('animate-fade-in'), 10);
  
  // Set active button style
  const activeBtn = document.getElementById(`btn-${tabId}`);
  activeBtn.classList.remove('border-transparent', 'text-gray-400');
  activeBtn.classList.add('border-brand-accent', 'text-white');
};

// Initialize App: Fetch JSON and bind listeners
async function init() {
  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error("JSON fetch failed");
    gameData = await res.json();
  } catch (e) {
    console.error("Critical Error: Failed to load data.json. Are you running a local server or Cloudflare environment?", e);
    return; // Halt execution if constants fail to load
  }
  
  attachListeners();
  runAllCalculations(); // Run initial math on load
}

// Bind every input to the master recalculation function
function attachListeners() {
  const inputs = [
    // Global Multipliers
    'globalSeason', 'vipPass',
    
    // Tab 1: HQ & Overhead
    'fleetSemis', 'fleetBox', 'fleetVans', 'staffDispatcher', 'staffManager', 'activeLoan',
    
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
      // Use 'input' for text/numbers, 'change' for selects/checkboxes
      const eventType = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
      el.addEventListener(eventType, runAllCalculations);
    }
  });
}

function runAllCalculations() {
  if (!gameData || Object.keys(gameData).length === 0) return;
  
  calcOverhead();
  calcHaul();
  calcContracts();
  calcFederal();
}

// ==========================================
// CALCULATION ENGINES
// ==========================================

function calcOverhead() {
  const semis = parseInt(document.getElementById('fleetSemis').value) || 0;
  const box = parseInt(document.getElementById('fleetBox').value) || 0;
  const vans = parseInt(document.getElementById('fleetVans').value) || 0;
  
  const dispatcherVal = document.getElementById('staffDispatcher').value;
  const managerVal = document.getElementById('staffManager').value;
  const loanVal = document.getElementById('activeLoan').value;

  let basePayroll = 0;
  let vehicleFees = 0;
  
  // Legendary Dispatcher Logic
  if (dispatcherVal === 'legendary') {
    basePayroll += gameData.staff.dispatcher.base_salary;
    vehicleFees += (semis * gameData.staff.dispatcher.vehicle_fees.semi) + 
                   (box * gameData.staff.dispatcher.vehicle_fees.box) + 
                   (vans * gameData.staff.dispatcher.vehicle_fees.van);
  }
  
  // Legendary Fleet Manager Logic
  if (managerVal === 'legendary') {
    basePayroll += gameData.staff.fleet_manager.salary;
  }

  // Insurance & Loan Deductions
  const insurance = gameData.insurance.premium_full;
  const loanPayment = (gameData.loans[loanVal] || gameData.loans.none).hourly_payment;

  // Total Real-Time Hourly Drain
  const totalBurn = basePayroll + vehicleFees + insurance + loanPayment;

  // DOM Updates
  document.getElementById('hqPayroll').innerText = `-$${basePayroll.toLocaleString()}`;
  document.getElementById('hqVehicles').innerText = `-$${vehicleFees.toLocaleString()}`;
  document.getElementById('hqInsurance').innerText = `-$${insurance.toLocaleString()}`;
  document.getElementById('hqLoan').innerText = `-$${loanPayment.toLocaleString()}`;
  document.getElementById('hqTotalBurn').innerText = `-$${totalBurn.toLocaleString()} / hr`;
}

function calcHaul() {
  const seasonKey = document.getElementById('globalSeason').value;
  const isVip = document.getElementById('vipPass').checked;
  
  const basePay = parseFloat(document.getElementById('basePay').value) || 0;
  const distance = parseFloat(document.getElementById('distance').value) || 0;
  const tripMinutes = parseFloat(document.getElementById('tripMinutes').value) || 1;
  const cargoType = document.getElementById('cargoType').value;
  const flashEventKey = document.getElementById('flashEvent').value;
  const fuelPrice = parseFloat(document.getElementById('fuelPrice').value) || 18.97;

  // Load appropriate multipliers
  const seasonData = gameData.seasons[seasonKey];
  const cargoBonus = seasonData.bonuses[cargoType] || 0.0;
  const eventBonus = (flashEventKey !== 'none' && gameData.flash_events[flashEventKey]) 
      ? gameData.flash_events[flashEventKey].pay_bonus : 0.0;
  
  const vipMultiplier = isVip ? gameData.passes.vip_pay_multiplier : 1.0;
  
  // Math Execution
  const gross = basePay * seasonData.global_pay_mult * vipMultiplier * (1 + cargoBonus + eventBonus);
  const fuelCost = (distance / gameData.fuel.baseline_mpg) * seasonData.fuel_cost_mult * fuelPrice;
  const net = gross - fuelCost;
  const rate = tripMinutes > 0 ? (net / tripMinutes) : 0;

  // DOM Updates
  document.getElementById('outGross').innerText = `$${Math.round(gross).toLocaleString()}`;
  document.getElementById('outFuel').innerText = `-$${Math.round(fuelCost).toLocaleString()}`;
  document.getElementById('outNet').innerText = `$${Math.round(net).toLocaleString()}`;
  document.getElementById('outRate').innerText = `$${Math.round(rate).toLocaleString()} / min`;
}

function calcContracts() {
  const pallets = parseFloat(document.getElementById('cPallets').value) || 0;
  const rate = parseFloat(document.getElementById('cRate').value) || 0;
  
  // Calculate Base + 10% Completion Bonus
  const basePayout = pallets * rate;
  const totalBase = basePayout * (1 + gameData.negotiations.completion_bonus_rate);

  // Grab EV modifiers
  const counter15 = gameData.negotiations.counter_offers.counter_15;
  const counter30 = gameData.negotiations.counter_offers.counter_30;

  // Expected Value = (Total Payout * Offer Multiplier) * Probability of Success
  const ev15 = (totalBase * counter15.multiplier) * counter15.win_rate;
  const ev30 = (totalBase * counter30.multiplier) * counter30.win_rate;

  // DOM Updates
  document.getElementById('evAccept').innerText = `$${Math.round(totalBase).toLocaleString()}`;
  document.getElementById('evCounter15').innerText = `$${Math.round(ev15).toLocaleString()}`;
  document.getElementById('evCounter30').innerText = `$${Math.round(ev30).toLocaleString()}`;
}

function calcFederal() {
  const pallets = parseFloat(document.getElementById('fPallets').value) || 0;
  const payout = parseFloat(document.getElementById('fPayout').value) || 0;
  const hostCap = parseFloat(document.getElementById('fHostCap').value) || 0;
  const partnerCap = parseFloat(document.getElementById('fPartnerCap').value) || 0;

  // 8% upfront security deposit drain
  const deposit = payout * gameData.federal.security_deposit_rate;
  
  // Completion math
  const soloHours = hostCap > 0 ? (pallets / hostCap) : 0;
  const coopHours = (hostCap + partnerCap) > 0 ? (pallets / (hostCap + partnerCap)) : 0;
  
  // Gross Co-Op Rate
  const coopRate = coopHours > 0 ? (payout / coopHours) : 0;

  // DOM Updates
  document.getElementById('fDeposit').innerText = `-$${Math.round(deposit).toLocaleString()}`;
  document.getElementById('fSoloTime').innerText = `${soloHours.toFixed(2)} hrs`;
  document.getElementById('fCoopTime').innerText = `${coopHours.toFixed(2)} hrs`;
  document.getElementById('fCoopRate').innerText = `$${Math.round(coopRate).toLocaleString()} / hr`;
}

// Boot up
window.addEventListener('DOMContentLoaded', init);