const STORAGE_KEY = "naloxone_cart_v1";
const ORDERS_KEY  = "naloxone_orders_v1";

function loadCart(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveCart(cart){ localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); }

function money(n){
  return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(n||0));
}
function cartCount(cart){ return cart.reduce((s,i)=>s+(i.qty||0),0); }
function cartSubtotal(cart){ return cart.reduce((s,i)=>s + (Number(i.price||0) * Number(i.qty||0)), 0); }

function showToast(msg){
  const t = document.getElementById("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(showToast._id);
  showToast._id = setTimeout(()=>t.classList.remove("show"), 2000);
}

async function submitNetlifyForm(formName, data){
  const params = new URLSearchParams();
  params.append("form-name", formName);
  params.append("bot-field", "");
  Object.entries(data).forEach(([k,v]) => params.append(k, typeof v === "string" ? v : JSON.stringify(v)));

  // Netlify Forms endpoint
  return fetch("/", {
    method: "POST",
    headers: {"Content-Type":"application/x-www-form-urlencoded"},
    body: params.toString()
  });
}

function openModal(id){
  const modal = document.getElementById(id);
  const overlay = document.getElementById("overlay");
  if(!modal || !overlay) return;
  overlay.classList.add("open");
  modal.classList.add("open");
  document.body.style.overflow="hidden";
}
function closeModal(id){
  const modal = document.getElementById(id);
  const overlay = document.getElementById("overlay");
  if(modal) modal.classList.remove("open");
  if(!document.querySelector(".modal.open") && overlay) overlay.classList.remove("open");
  document.body.style.overflow="";
}
function closeAll(){
  document.querySelectorAll(".modal.open").forEach(m=>m.classList.remove("open"));
  document.getElementById("overlay")?.classList.remove("open");
  document.body.style.overflow="";
}

function renderCart(){
  const cart = loadCart();

  const countEl = document.getElementById("cartCount");
  if(countEl) countEl.textContent = String(cartCount(cart));

  const emptyEl = document.getElementById("cartEmpty");
  const listEl  = document.getElementById("cartList");
  if(!listEl) return;

  listEl.innerHTML = "";

  if(emptyEl) emptyEl.style.display = cart.length ? "none" : "block";

  cart.forEach(item => {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div>
        <div class="cart-title">${escapeHtml(item.title)} — ${escapeHtml(item.date)}</div>
        <div class="cart-meta">${escapeHtml(item.time)} • ${escapeHtml(item.location)}</div>
        <div class="cart-controls">
          <span><b>${money(item.price)}</b></span>
          <span class="qty">
            <button type="button" data-act="dec" data-id="${item.id}">−</button>
            <span>${item.qty}</span>
            <button type="button" data-act="inc" data-id="${item.id}">+</button>
          </span>
          <button type="button" class="remove" data-act="rm" data-id="${item.id}">Remove</button>
        </div>
      </div>
      <div style="text-align:right;font-weight:900">${money(item.price * item.qty)}</div>
    `;
    listEl.appendChild(row);
  });

  const subtotal = cartSubtotal(cart);
  const total = subtotal;

  setText("sumItems", String(cartCount(cart)));
  setText("sumSubtotal", money(subtotal));
  setText("sumFees", money(0));
  setText("sumTotal", money(total));

  const checkoutBtn = document.getElementById("checkoutBtn");
  if(checkoutBtn){
    checkoutBtn.disabled = cart.length === 0;
    checkoutBtn.style.opacity = cart.length === 0 ? 0.6 : 1;
  }
}

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function setText(id, text){
  const el = document.getElementById(id);
  if(el) el.textContent = text;
}

function addToCart(item){
  const cart = loadCart();
  const idx = cart.findIndex(x=>x.id===item.id);
  if(idx >= 0) cart[idx].qty += 1;
  else cart.push({...item, qty: 1});
  saveCart(cart);
  renderCart();
  showToast(`Added: ${item.title}`);
}

function setQty(id, qty){
  const cart = loadCart();
  const i = cart.findIndex(x=>x.id===id);
  if(i < 0) return;
  cart[i].qty = Math.max(1, qty);
  saveCart(cart);
  renderCart();
}
function removeItem(id){
  saveCart(loadCart().filter(x=>x.id!==id));
  renderCart();
}
function clearCart(){
  saveCart([]);
  renderCart();
  showToast("Cart cleared");
}

function wire(){
  // Mobile nav
  const menuBtn = document.getElementById("menuBtn");
  const navLinks = document.getElementById("navLinks");
  menuBtn?.addEventListener("click", ()=>{
    const isOpen = navLinks.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(isOpen));
  });

  // Overlay close
  document.getElementById("overlay")?.addEventListener("click", closeAll);
  window.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeAll(); });

  // Open cart buttons
  document.getElementById("openCartBtn")?.addEventListener("click", ()=>openModal("cartModal"));
  document.querySelectorAll("[data-open-cart]").forEach(b=>{
    b.addEventListener("click", ()=>openModal("cartModal"));
  });

  document.getElementById("closeCartBtn")?.addEventListener("click", ()=>closeModal("cartModal"));
  document.getElementById("continueBtn")?.addEventListener("click", ()=>closeModal("cartModal"));
  document.getElementById("clearCartBtn")?.addEventListener("click", clearCart);

  // Cart list actions
  document.getElementById("cartList")?.addEventListener("click",(e)=>{
    const btn = e.target.closest("button");
    if(!btn) return;
    const act = btn.dataset.act;
    const id = btn.dataset.id;
    if(!act || !id) return;

    const cart = loadCart();
    const item = cart.find(x=>x.id===id);
    if(!item) return;

    if(act==="inc") setQty(id, item.qty + 1);
    if(act==="dec") setQty(id, item.qty - 1);
    if(act==="rm") removeItem(id);
  });

  // Add-to-cart buttons
  document.querySelectorAll(".js-add").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      addToCart({
        id: btn.dataset.id,
        title: btn.dataset.title,
        date: btn.dataset.date,
        time: btn.dataset.time,
        location: btn.dataset.location,
        price: Number(btn.dataset.price || 0)
      });
    });
  });

  // Checkout
  document.getElementById("checkoutBtn")?.addEventListener("click", ()=>{
    if(!loadCart().length) return;
    openModal("checkoutModal");
  });
  document.getElementById("closeCheckoutBtn")?.addEventListener("click", ()=>closeModal("checkoutModal"));
  document.getElementById("backToCartBtn")?.addEventListener("click", ()=>{
    closeModal("checkoutModal");
    openModal("cartModal");
  });

  const placeBtn = document.getElementById("placeBookingBtn");
  placeBtn?.addEventListener("click", async (e)=>{
    e.preventDefault();
    const name = document.getElementById("name")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    if(!name || !email){
      showToast("Please enter your name and email.");
      return;
    }

    const cart = loadCart();
    const order = {
      id: "order_" + Date.now(),
      createdAt: new Date().toISOString(),
      customer: {
        name,
        email,
        phone: document.getElementById("phone")?.value.trim() || "",
        notes: document.getElementById("notes")?.value.trim() || ""
      },
      items: cart,
      totals: {
        subtotal: cartSubtotal(cart),
        fees: 0,
        total: cartSubtotal(cart)
      }
    };

    // Store locally (demo log)
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    orders.push(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

    // Netlify Forms (booking)
    try{
      await submitNetlifyForm("booking", {
        order_id: order.id,
        createdAt: order.createdAt,
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
        notes: order.customer.notes,
        items: order.items,
        totals: order.totals
      });
    }catch(err){
      console.warn("Netlify form submit failed", err);
    }

    // Google Sheets via Netlify Function (optional)
    try{
      await fetch("/.netlify/functions/order-to-sheets", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(order)
      });
    }catch(err){
      console.warn("Sheets sync failed", err);
    }

    // Success UI
    saveCart([]);
    renderCart();
    const success = document.getElementById("checkoutSuccess");
    if(success){
      success.style.display = "block";
      setTimeout(()=>{ success.style.display="none"; }, 3500);
    }
    showToast("Booking placed!");
  });

  renderCart();
}

document.addEventListener("DOMContentLoaded", wire);
