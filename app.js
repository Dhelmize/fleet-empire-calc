let gameData = {};

window.switchTab = function(tabId) {
  ['hauls', 'contracts', 'federal'].forEach(id => {
    document.getElementById(`tab-${id}`).classList.add('hidden');
    document.getElementById(`btn-${id}`).className = 'px-4 py-2 border-b-2 border-transparent text-gray-400 hover:text-white';
  });
  document.getElementById(`tab-${tabId}`).classList.remove('hidden');
  document.getElementById(`btn-${tabId}`).className = 'px-4 py-2 border-b-2 border-amber-400 text-white font-semibold';
};

async function init() {
  try {
    const res = await fetch('./data.json');
    gameData = await res.json();
  } catch (e) {
    // Fallback inline data if data.json is missing or running locally without server
    gameData = {
      fuel: { baseline_mpg: 9.58, market_avg_price: 19.00 },
      seasons: {
        summer: { name: "Summer", global_pay_mult: 1.04, fuel_cost_mult: 1.02, wear_cost_mult: 1.00, bonuses: { "Cold Beverages": 0.25, "Outdoor Products": 0.20, "Summer Produce": 0.20, "Camping Gear": 0.20 } },
        spring: { name: "Spring", global_pay_mult: 1.02, fuel_cost_mult: 1.03, wear_cost_mult: 1.05, bonuses: { "Farm Equipment": 0.30, "Building Materials": 0.25, "Lumber": 0.25, "Fertilizer": 0.20, "Seed Stock": 0.20 } }
      },
      flash_events: { none: { name: "None", pay_bonus: 0.0 }, spring_construction: { name: "Spring Construction Rush", pay_bonus: 0.30 } }
    };
  }
  
  // Attach Event Listeners
  ['basePay', 'distance', 'tripMinutes', 'cargoType', 'flashEvent', 'fuelPrice'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calcHaul);
  });
  ['cPallets', 'cRate', 'cLoads'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calcContracts);
  });
  ['fPallets', 'fPayout', 'fHostCap', 'fPartnerCap'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calcFederal);
  });

  // Run initial calculations
  calcHaul();
  calcContracts();
  calcFederal();
}

function calcHaul() {
  if (!gameData.seasons) return;
  const basePay = parseFloat(document.getElementById('basePay')?.value) || 0;
  const distance = parseFloat(document.getElementById('distance')?.value) || 0;
  const tripMinutes = parseFloat(document.getElementById('tripMinutes')?.value) || 1;
  const cargoType = document.getElementById('cargoType')?.value;
  const flashEventKey = document.getElementById('flashEvent')?.value;
  const fuelPrice = parseFloat(document.getElementById('fuelPrice')?.value) || 18.97;

  // Defaults to Summer season configuration based on your active empire data
  const season = gameData.seasons.summer || Object.values(gameData.seasons)[0];
  const cargoBonus = season.bonuses[cargoType] || 0.0;
  const eventBonus = flashEventKey && flashEventKey !== 'none' && gameData.flash_events[flashEventKey] ? gameData.flash_events[flashEventKey].pay_bonus : 0.0;

  // VIP Pass (+20% Delivery Cash) & Seasonal Multipliers applied
  const vipMultiplier = 1.20; 
  const gross = basePay * season.global_pay_mult * vipMultiplier * (1 + cargoBonus + eventBonus);
  const fuelCost = (distance / gameData.fuel.baseline_mpg) * season.fuel_cost_mult * fuelPrice;
  const net = gross - fuelCost;

  if (document.getElementById('outGross')) document.getElementById('outGross').innerText = `$${Math.round(gross).toLocaleString()}`;
  if (document.getElementById('outFuel')) document.getElementById('outFuel').innerText = `-$${Math.round(fuelCost).toLocaleString()}`;
  if (document.getElementById('outNet')) document.getElementById('outNet').innerText = `$${Math.round(net).toLocaleString()}`;
  if (document.getElementById('outRate')) document.getElementById('outRate').innerText = `$${Math.round(tripMinutes > 0 ? (net / tripMinutes) : 0).toLocaleString()}/min`;
}

function calcContracts() {
  const pallets = parseFloat(document.getElementById('cPallets')?.value) || 0;
  const rate = parseFloat(document.getElementById('cRate')?.value) || 0;
  
  const basePayout = pallets * rate;
  const totalBase = basePayout + (basePayout * 0.10); // Includes 10% completion bonus

  if (document.getElementById('evAccept')) document.getElementById('evAccept').innerText = `$${Math.round(totalBase).toLocaleString()}`;
  if (document.getElementById('evCounter15')) document.getElementById('evCounter15').innerText = `$${Math.round((totalBase * 1.15) * 0.97).toLocaleString()}`;
  if (document.getElementById('evCounter30')) document.getElementById('evCounter30').innerText = `$${Math.round((totalBase * 1.30) * 0.79).toLocaleString()}`;
}

function calcFederal() {
  const pallets = parseFloat(document.getElementById('fPallets')?.value) || 0;
  const payout = parseFloat(document.getElementById('fPayout')?.value) || 0;
  const hostCap = parseFloat(document.getElementById('fHostCap')?.value) || 0;
  const partnerCap = parseFloat(document.getElementById('fPartnerCap')?.value) || 0;

  const soloHours = hostCap > 0 ? (pallets / hostCap) : 0;
  const coopHours = (hostCap + partnerCap) > 0 ? (pallets / (hostCap + partnerCap)) : 0;

  if (document.getElementById('fDeposit')) document.getElementById('fDeposit').innerText = `$${Math.round(payout * 0.08).toLocaleString()}`;
  if (document.getElementById('fSoloTime')) document.getElementById('fSoloTime').innerText = `${soloHours.toFixed(2)} hrs`;
  if (document.getElementById('fCoopTime')) document.getElementById('fCoopTime').innerText = `${coopHours.toFixed(2)} hrs`;
  if (document.getElementById('fCoopRate')) document.getElementById('fCoopRate').innerText = `$${Math.round(coopHours > 0 ? (payout / coopHours) : 0).toLocaleString()}/hr`;
}

window.addEventListener('DOMContentLoaded', init);