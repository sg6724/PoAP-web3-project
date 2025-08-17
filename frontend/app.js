// Import Aptos SDK via UMD
const { AptosClient, TokenClient, FaucetClient } = window.aptos;

// Config
const NODE_URL    = "https://fullnode.devnet.aptoslabs.com";
const FAUCET_URL  = "https://faucet.devnet.aptoslabs.com";
const MODULE_ADDR = "d97248e5d29be6dd506d19a9ba6d40d7317c183de20aac4facbb025be0a5dfe6";
const MODULE_NAME = "risein_poap";

// Clients
const client      = new AptosClient(NODE_URL);
const tokenClient = new TokenClient(client);
const faucet      = new FaucetClient(NODE_URL, FAUCET_URL);

// State
let userAddress = null;

// Elements
const connectBtn    = document.getElementById("connectBtn");
const eventsList    = document.getElementById("eventsList");
const badgesList    = document.getElementById("badgesList");
const createEventBtn = document.getElementById("createEventBtn");
const modalOverlay  = document.getElementById("modalOverlay");
const closeModal    = document.getElementById("closeModal");
const submitEvent   = document.getElementById("submitEvent");

// Connect wallet
connectBtn.onclick = async () => {
  if (window.aptos) {
    const acct = await window.aptos.connect();
    userAddress = acct.address;
    connectBtn.textContent = userAddress.slice(0,6)+"…"+userAddress.slice(-4);
    loadData();
  } else {
    alert("Install an Aptos wallet extension (Petra/Martian) first.");
  }
};

// Load events & badges
async function loadData() {
  // Fetch events
  const evts = await client.view({
    function: `${MODULE_ADDR}::${MODULE_NAME}::get_all_events`,
    arguments: [userAddress],
    type_arguments: []
  });
  renderEvents(evts);

  // Fetch badges
  const bgs = await client.view({
    function: `${MODULE_ADDR}::${MODULE_NAME}::get_user_badges`,
    arguments: [userAddress, userAddress],
    type_arguments: []
  });
  renderBadges(bgs);
}

// Render events
function renderEvents(events) {
  eventsList.innerHTML = "";
  events.forEach(evt => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${evt.name}</h3>
      <span class="badge">${new Date(evt.start_time*1000).toLocaleString()}</span>
      <p>${evt.description}</p>
      <button class="btn-primary">Claim Badge</button>
    `;
    card.querySelector("button").onclick = () => claimBadge(evt.id);
    eventsList.append(card);
  });
}

// Render badges
function renderBadges(badges) {
  badgesList.innerHTML = "";
  badges.forEach(b => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${b.event_name}</h3>
      <p>Minted at ${new Date(b.minted_at*1000).toLocaleString()}</p>
    `;
    badgesList.append(card);
  });
}

// Claim badge
async function claimBadge(eventId) {
  const payload = {
    function: `${MODULE_ADDR}::${MODULE_NAME}::claim_badge`,
    type_arguments: [],
    arguments: [MODULE_ADDR, eventId]
  };
  const tx = await window.aptos.signAndSubmitTransaction(payload);
  await window.aptos.waitForTransaction(tx.hash);
  loadData();
}

// Create Event Modal
createEventBtn.onclick = () => modalOverlay.classList.remove("hidden");
closeModal.onclick    = () => modalOverlay.classList.add("hidden");
submitEvent.onclick = async () => {
  const name = document.getElementById("evtName").value;
  const desc = document.getElementById("evtDesc").value;
  const loc  = document.getElementById("evtLoc").value;
  const start= +document.getElementById("evtStart").value;
  const end  = +document.getElementById("evtEnd").value;
  const cap  = +document.getElementById("evtCap").value;

  const payload = {
    function: `${MODULE_ADDR}::${MODULE_NAME}::create_event`,
    type_arguments: [],
    arguments: [name, desc, start, end, loc, cap]
  };

  const tx = await window.aptos.signAndSubmitTransaction(payload);
  await window.aptos.waitForTransaction(tx.hash);
  modalOverlay.classList.add("hidden");
  loadData();
};

// On load, if wallet already connected
window.addEventListener("aptos#connected", e => {
  userAddress = e.detail.address;
  connectBtn.textContent = userAddress.slice(0,6)+"…"+userAddress.slice(-4);
  loadData();
});
