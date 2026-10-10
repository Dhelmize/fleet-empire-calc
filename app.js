let gameData = {};

window.switchTab = function(tabId) {
  ['overview', 'hauls', 'contracts', 'federal', 'offline', 'corporate'].forEach(id => {
    document.getElementById(`tab-${id}`).classList.add('hidden');
    document.getElementById(`btn-${id}`).className = 'px-4 py-3 border-b-2 border-transparent text-slate-500 hover:text-slate-300 font-semibold tracking-wide text-xs uppercase transition-colors';
  });
  document.getElementById(`tab-${tabId}`).classList.remove('hidden');
  document.getElementById(`btn-${tabId}`).className = 'px-4 py-3 border-b-2 border-brand-accent text-white font-semibold tracking-wide text-xs uppercase transition-colors';
};

async function init() {
  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error("JSON fetch failed");
    gameData = await res.json();
  } catch (e) {
    console.error("Critical Error: Failed to load data.json", e);
    return;
  }
  attachListeners();
  runAllCalculations(); 
}

function attachListeners() {
  const inputs = [
    'globalSeason', 'vipPass',
    'fleetSemis', 'fleetBox', 'fleetVans', 'dispBase', 'mgrBase', 'feeSemi', 'feeBox', 'feeVan', 'insPremium', 'loanHourly',
    'basePay', 'distance', 'tripMinutes', 'cargoType', 'flashEvent', 'fuelPrice', 'corpActive', 'corpFuel', 'event2x', 'lvlFreight', 'lvlLogistics', 'truckTier',
    'cPallets', 'cRate', 'cLoads', 'chance15', 'chance30',
    'fPallets', 'fPayout', 'fHostCap', 'fPartnerCap',
    'afkDrivers', 'afkRate', 'afkHours', 'afkWage', 'afkFuel', 'afkRepair', 'lvlMaint',
    'mfgProd', 'mfgUpkeep', 'mfgStock', 'lvlWarehouse', 'loanAmount', 'loanTerm', 'loanRate'
  ];

  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
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
  calcOffline();
  calcCorpAssets();
}

// 1. HQ Telemetry
function calcOverhead() {
  const semis = parseInt(document.getElementById('fleetSemis').value) || 0;
  const box = parseInt(document.getElementById('fleetBox').value) || 0;
  const vans = parseInt(document.getElementById('fleetVans').value) || 0;
  
  const dispBase = parseFloat(document.getElementById('dispBase').value) || 0;
  const mgrBase = parseFloat(document.getElementById('mgrBase').value) || 0;
  const feeSemi = parseFloat(document.getElementById('feeSemi').value) || 0;
  const feeBox = parseFloat(document.getElementById('feeBox').value) || 0;
  const feeVan = parseFloat(document.getElementById('feeVan').value) || 0;
  const insPremium = parseFloat(document.getElementById('insPremium').value) || 0;

  const basePayroll = dispBase + mgrBase;
  const vehicleFees = (semis * feeSemi) + (box * feeBox) + (vans * feeVan);
  const totalBurn = basePayroll + vehicleFees + insPremium;

  document.getElementById('hqPayroll').innerText = `-$${basePayroll.toLocaleString()}`;
  document.getElementById('hqVehicles').innerText = `-$${vehicleFees.toLocaleString()}`;
  document.getElementById('hqInsurance').innerText = `-$${insPremium.toLocaleString()}`;
  document.getElementById('hqTotalBurn').innerHTML = `-$${totalBurn.toLocaleString()} <span class="text-sm text-slate-500">/ hr</span>`;
}

// 2. Route Yields (Integrated Truck Tiers & Corp Buffs)
function calcHaul() {
  const seasonKey = document.getElementById('globalSeason').value;
  const isVip = document.getElementById('vipPass').checked;
  const basePay = parseFloat(document.getElementById('basePay').value) || 0;
  const distance = parseFloat(document.getElementById('distance').value) || 0;
  const baseEta = parseFloat(document.getElementById('tripMinutes').value) || 1;
  const cargoType = document.getElementById('cargoType').value;
  const flashEventKey = document.getElementById('flashEvent').value;
  const fuelPrice = parseFloat(document.getElementById('fuelPrice').value) || 18.97;
  
  const corpActive = document.getElementById('corpActive').checked;
  const corpFuel = document.getElementById('corpFuel').checked;
  const event2x = document.getElementById('event2x').checked;
  const lvlFreight = parseFloat(document.getElementById('lvlFreight').value) || 0;
  const lvlLogistics = parseFloat(document.getElementById('lvlLogistics').value) || 0;
  const tierKey = document.getElementById('truckTier').value;

  const seasonData = gameData.seasons[seasonKey];
  const cargoBonus = seasonData.bonuses[cargoType] || 0.0;
  const eventBonus = (flashEventKey !== 'none' && gameData.flash_events[flashEventKey]) ? gameData.flash_events[flashEventKey].pay_bonus : 0.0;
  const vipMultiplier = isVip ? 1.20 : 1.0;
  const truckStats = gameData.truck_tiers[tierKey];
  
  // Calculate Gross
  let grossMultiplier = seasonData.global_pay_mult * vipMultiplier * (1 + cargoBonus + eventBonus);
  if (corpActive) {
    const dynamicPayoutPerk = lvlFreight * gameData.corporate.scaling.payout_per_level;
    grossMultiplier *= (1 + dynamicPayoutPerk + gameData.corporate.specialty_perk);
  }
  let gross = basePay * grossMultiplier;
  let tax = corpActive ? (gross * gameData.corporate.delivery_tax) : 0;
  let payout = gross - tax;

  // Calculate Fuel
  let fuelCost = 0;
  if (!corpFuel) {
    const mpg = gameData.fuel.baseline_mpg / (1 - truckStats.fuel_reduction);
    const gallons = (distance / mpg) * seasonData.fuel_cost_mult;
    fuelCost = gallons * fuelPrice;
  }
  let net = payout - fuelCost;

  // Calculate Speed
  let effectiveEta = baseEta;
  if (corpActive) {
    const dynamicSpeedPerk = lvlLogistics * gameData.corporate.scaling.speed_per_level;
    effectiveEta /= (1 + dynamicSpeedPerk);
  }
  effectiveEta /= (1 + truckStats.speed_bonus);
  if (event2x) effectiveEta *= 0.5;

  const rate = effectiveEta > 0 ? (net / effectiveEta) : 0;

  document.getElementById('outGross').innerText = `$${Math.round(gross).toLocaleString()}`;
  document.getElementById('outFuel').innerText = corpFuel ? '$0 (Corp)' : `-$${Math.round(fuelCost).toLocaleString()}`;
  document.getElementById('outNet').innerText = `$${Math.round(net).toLocaleString()}`;
  document.getElementById('outRate').innerText = `$${Math.round(rate).toLocaleString()} / min`;
}

// 3. Business Contracts EV
function calcContracts() {
  const pallets = parseFloat(document.getElementById('cPallets').value) || 0;
  const rate = parseFloat(document.getElementById('cRate').value) || 0;
  const chance15 = (parseFloat(document.getElementById('chance15').value) || 0) / 100;
  const chance30 = (parseFloat(document.getElementById('chance30').value) || 0) / 100;
  
  const basePayout = pallets * rate;
  const totalBase = basePayout * 1.10; // Includes 10% completion bonus

  const ev15 = (totalBase * 1.15) * chance15;
  const ev30 = (totalBase * 1.30) * chance30;

  document.getElementById('evAccept').innerText = `$${Math.round(totalBase).toLocaleString()}`;
  document.getElementById('label15').innerText = `Counter +15% (~${Math.round(chance15*100)}% Win)`;
  document.getElementById('evCounter15').innerText = `$${Math.round(ev15).toLocaleString()}`;
  document.getElementById('label30').innerText = `Counter +30% (~${Math.round(chance30*100)}% Win)`;
  document.getElementById('evCounter30').innerText = `$${Math.round(ev30).toLocaleString()}`;

  const recEl = document.getElementById('contractRecommendation');
  if (ev15 > ev30 && ev15 > totalBase) {
    recEl.innerText = "Recommendation: Submit +15% Counter (Optimal Risk EV)";
    recEl.className = "mt-4 text-center text-xs font-bold uppercase tracking-wide text-brand-success";
  } else if (ev30 >= ev15 && ev30 > totalBase) {
    recEl.innerText = "Recommendation: Submit +30% Counter (Optimal High Risk EV)";
    recEl.className = "mt-4 text-center text-xs font-bold uppercase tracking-wide text-brand-accent";
  } else {
    recEl.innerText = "Recommendation: Accept As-Is (Counters too risky)";
    recEl.className = "mt-4 text-center text-xs font-bold uppercase tracking-wide text-brand-danger";
  }
}

// 4. Federal Co-Op
function calcFederal() {
  const pallets = parseFloat(document.getElementById('fPallets').value) || 0;
  const payout = parseFloat(document.getElementById('fPayout').value) || 0;
  const hostCap = parseFloat(document.getElementById('fHostCap').value) || 0;
  const partnerCap = parseFloat(document.getElementById('fPartnerCap').value) || 0;

  const deposit = payout * 0.08;
  const soloHours = hostCap > 0 ? (pallets / hostCap) : 0;
  const coopHours = (hostCap + partnerCap) > 0 ? (pallets / (hostCap + partnerCap)) : 0;
  const coopRate = coopHours > 0 ? (payout / coopHours) : 0;

  document.getElementById('fDeposit').innerText = `-$${Math.round(deposit).toLocaleString()}`;
  document.getElementById('fSoloTime').innerText = `${soloHours.toFixed(2)} hrs`;
  document.getElementById('fCoopTime').innerText = `${coopHours.toFixed(2)} hrs`;
  document.getElementById('fCoopRate').innerText = `$${Math.round(coopRate).toLocaleString()} / hr`;
}

// 5. Offline AFK Dispatcher
function calcOffline() {
  const drivers = parseFloat(document.getElementById('afkDrivers').value) || 0;
  const rate10m = parseFloat(document.getElementById('afkRate').value) || 0;
  const hours = parseFloat(document.getElementById('afkHours').value) || 0;
  const wageCut = (parseFloat(document.getElementById('afkWage').value) || 0) / 100;
  
  const fuelCovered = document.getElementById('afkFuel').checked;
  const repairDiscountActive = document.getElementById('afkRepair').checked;
  const lvlMaint = parseFloat(document.getElementById('lvlMaint').value) || 0;
  const tierKey = document.getElementById('truckTier').value;
  const truckStats = gameData.truck_tiers[tierKey];

  const hourlyDeliveries = rate10m * 6;
  const totalDeliveries = hourlyDeliveries * hours;

  // Empirical defaults
  const avgGrossPerDelivery = 14845;
  const companyRevPerDelivery = avgGrossPerDelivery * (1 - wageCut);

  let maintPerDelivery = gameData.offline_defaults.maintenance_per_delivery;
  maintPerDelivery *= (1 - truckStats.wear_reduction); // Truck Tier wear modifier
  if (repairDiscountActive) {
    const corpDiscount = lvlMaint * gameData.corporate.scaling.repair_discount_per_level;
    maintPerDelivery *= (1 - corpDiscount);
  }

  let fuelPerDelivery = fuelCovered ? 0 : gameData.offline_defaults.fuel_per_delivery * (1 - truckStats.fuel_reduction);

  const hourlyBankDrain = (maintPerDelivery + fuelPerDelivery) * hourlyDeliveries;
  const requiredBuffer = hourlyBankDrain * hours;
  const hourlyNet = (companyRevPerDelivery - maintPerDelivery - fuelPerDelivery) * hourlyDeliveries;
  const totalCollect = companyRevPerDelivery * totalDeliveries;

  document.getElementById('outAfkBuffer').innerText = `$${Math.round(requiredBuffer).toLocaleString()}`;
  document.getElementById('outAfkHourly').innerText = `$${Math.round(hourlyNet).toLocaleString()}`;
  document.getElementById('outAfkTotal').innerText = `$${Math.round(totalCollect).toLocaleString()}`;
}

// 6. Corporate Assets (Manufacturing & Loans)
function calcCorpAssets() {
  // Manufacturing
  const prod = parseFloat(document.getElementById('mfgProd').value) || 0;
  const upkeep = parseFloat(document.getElementById('mfgUpkeep').value) || 0;
  const stored = parseFloat(document.getElementById('mfgStock').value) || 0;
  const lvlWarehouse = parseFloat(document.getElementById('lvlWarehouse').value) || 0;

  const maxCapacity = gameData.manufacturing.base_storage + (lvlWarehouse * gameData.corporate.scaling.storage_per_level);
  const costBasis = prod > 0 ? (upkeep / prod) : 0;
  const spaceRemaining = Math.max(0, maxCapacity - stored);
  const monthsUntilFull = prod > 0 ? (spaceRemaining / prod) : 0;

  document.getElementById('outMfgCost').innerText = `$${costBasis.toFixed(2)}`;
  document.getElementById('outMfgCap').innerText = `${maxCapacity.toLocaleString()}`;
  document.getElementById('outMfgTime').innerText = `${monthsUntilFull.toFixed(1)}`;

  // Loans
  const amount = parseFloat(document.getElementById('loanAmount').value) || 0;
  const term = parseFloat(document.getElementById('loanTerm').value) || 1;
  const rate = (parseFloat(document.getElementById('loanRate').value) || 0) / 100;

  const totalInterest = amount * rate;
  const totalRepayment = amount + totalInterest;
  const monthlyPayment = term > 0 ? (totalRepayment / term) : 0;

  document.getElementById('outLoanInt').innerText = `$${Math.round(totalInterest).toLocaleString()}`;
  document.getElementById('outLoanTotal').innerText = `$${Math.round(totalRepayment).toLocaleString()}`;
  document.getElementById('outLoanMo').innerText = `$${Math.round(monthlyPayment).toLocaleString()} / mo`;
}

window.addEventListener('DOMContentLoaded', init);