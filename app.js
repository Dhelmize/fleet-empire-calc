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
  const res = await fetch('./data.json');
  gameData = await res.json();
  
  // Attach Event Listeners
  ['basePay', 'distance', 'tripMinutes', 'cargoType', 'flashEvent', 'fuelPrice'].forEach(id => document.getElementById(id).addEventListener('input', calcHaul));
  ['cPallets', 'cRate', 'cLoads'].forEach(id => document.getElementById(id).addEventListener('input', calcContracts));
  ['fPallets', 'fPayout', 'fHostCap', 'fPartnerCap'].forEach(id => document.getElementById(id).addEventListener('input', calcFederal));

  // Run initial calculations
  calcHaul();
  calcContracts();
  calcFederal();
}

function calcHaul() {
  if (!gameData.seasons) return;
  const basePay = parseFloat(document.getElementById('basePay').value) || 0;
  const distance = parseFloat(document.getElementById('distance').value) || 0;
  const tripMinutes = parseFloat(document.getElementById('tripMinutes').value) || 1;
  const cargoType = document.getElementById('cargoType').value;
  const flashEventKey = document.getElementById('flashEvent').value;
  const fuelPrice = parseFloat(document.getElementById('fuelPrice').value) || 18.97;

  const spring = gameData.seasons.spring;
  const cargoBonus = spring.bonuses[cargoType] || 0.0;
  const eventBonus = flashEventKey !== 'none' ? gameData.flash_events[flashEventKey].pay_bonus : 0.0;

  const gross = basePay * spring.global_pay_mult * (1 + cargoBonus + eventBonus);
  const fuelCost = (distance / gameData.fuel.baseline_mpg) * spring.fuel_cost_mult * fuelPrice;
  const net = gross - fuelCost;

  document.getElementById('outGross').innerText = `$${Math.round(gross).toLocaleString()}`;
  document.getElementById('outFuel').innerText = `-$${Math.round(fuelCost).toLocaleString()}`;
  document.getElementById('outNet').innerText = `$${Math.round(net).toLocaleString()}`;
  document.getElementById('outRate').innerText = `$${Math.round(tripMinutes > 0 ? (net / tripMinutes) : 0).toLocaleString()}/min`;
}

function calcContracts() {
  const pallets = parseFloat(document.getElementById('cPallets').value) || 0;
  const rate = parseFloat(document.getElementById('cRate').value) || 0;
  
  const basePayout = pallets * rate;
  const totalBase = basePayout + (basePayout * 0.10); // Includes 10% completion bonus

  document.getElementById('evAccept').innerText = `$${Math.round(totalBase).toLocaleString()}`;
  document.getElementById('evCounter15').innerText = `$${Math.round((totalBase * 1.15) * 0.97).toLocaleString()}`;
  document.getElementById('evCounter30').innerText = `$${Math.round((totalBase * 1.30) * 0.79).toLocaleString()}`;
}

function calcFederal() {
  const pallets = parseFloat(document.getElementById('fPallets').value) || 0;
  const payout = parseFloat(document.getElementById('fPayout').value) || 0;
  const hostCap = parseFloat(document.getElementById('fHostCap').value) || 0;
  const partnerCap = parseFloat(document.getElementById('fPartnerCap').value) || 0;

  const soloHours = hostCap > 0 ? (pallets / hostCap) : 0;
  const coopHours = (hostCap + partnerCap) > 0 ? (pallets / (hostCap + partnerCap)) : 0;

  document.getElementById('fDeposit').innerText = `$${Math.round(payout * 0.08).toLocaleString()}`;
  document.getElementById('fSoloTime').innerText = `${soloHours.toFixed(2)} hrs`;
  document.getElementById('fCoopTime').innerText = `${coopHours.toFixed(2)} hrs`;
  document.getElementById('fCoopRate').innerText = `$${Math.round(coopHours > 0 ? (payout / coopHours) : 0).toLocaleString()}/hr`;
}

window.addEventListener('DOMContentLoaded', init);