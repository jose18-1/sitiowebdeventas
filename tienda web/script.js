// script.js - Carrito, combos dinámicos y envío al servidor (sin cargo de envío)

// Configuración
const CART_KEY = "tienda_cocina_cart_v1";
const API_ORDERS = "/api/orders";
const WA_PHONE_INT = "593995469134";
const COMBO_PRICE = 2.75;      // precio fijo del combo
const COMBO_MAX_ITEMS = 3;
const COMBO_MIN_ITEMS = 1;

// Estado
let cart = loadCart();

// DOM
const cartCountEl = document.getElementById("cart-count");
const cartButton = document.getElementById("cart-button");
const cartModal = document.getElementById("cart-modal");
const cartBackdrop = document.getElementById("cart-backdrop");
const closeCartBtn = document.getElementById("close-cart");
const cartItemsEl = document.getElementById("cart-items");
const cartSubtotalEl = document.getElementById("cart-subtotal");
const cartTotalEl = document.getElementById("cart-total");

const transferNameEl = document.getElementById("transfer-name");
const transferAddressEl = document.getElementById("transfer-address");
const confirmTransferBtn = document.getElementById("confirm-transfer");
const cancelTransferBtn = document.getElementById("cancel-transfer");

const guestNameEl = document.getElementById("guest-name");
const guestAddressEl = document.getElementById("guest-address");
const deliveryTypeEl = document.getElementById("delivery-type");
const confirmCodBtn = document.getElementById("confirm-cod");
const cancelCodBtn = document.getElementById("cancel-cod");

const openComboBtn = document.getElementById("open-combo");
const comboModal = document.getElementById("combo-modal");
const comboBackdrop = document.getElementById("combo-backdrop");
const closeComboBtn = document.getElementById("close-combo");
const comboOptionsEl = document.getElementById("combo-options");
const addComboBtn = document.getElementById("add-combo");
const comboQtyEl = document.getElementById("combo-qty");
const comboSelectedCountEl = document.getElementById("combo-selected-count");
const comboMaxCountEl = document.getElementById("combo-max-count");

const productsContainer = document.getElementById("productos");

// Inicializar
initPage();

function initPage(){
  bindAddToCartButtons();
  initComboOptions();
  if (comboMaxCountEl) comboMaxCountEl.textContent = COMBO_MAX_ITEMS;

  // Listeners
  cartButton.addEventListener("click", openCart);
  cartBackdrop?.addEventListener("click", closeCart);
  closeCartBtn?.addEventListener("click", closeCart);

  confirmTransferBtn?.addEventListener("click", confirmTransfer);
  cancelTransferBtn?.addEventListener("click", () => closeCart());

  confirmCodBtn?.addEventListener("click", confirmCod);
  cancelCodBtn?.addEventListener("click", () => closeCart());

  openComboBtn?.addEventListener("click", openCombo);
  comboBackdrop?.addEventListener("click", closeCombo);
  closeComboBtn?.addEventListener("click", closeCombo);
  addComboBtn?.addEventListener("click", addComboToCart);

  // Cerrar modales con ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!cartModal.classList.contains("hidden")) closeCart();
      if (!comboModal.classList.contains("hidden")) closeCombo();
    }
  });

  initProductsObserver();
  updateCartUI();
}

/* Observador de productos */
function initProductsObserver(){
  if (!productsContainer) return;
  const observer = new MutationObserver((mutationsList) => {
    let shouldRefresh = false;
    for (const m of mutationsList) {
      if (m.type === "childList" && (m.addedNodes.length > 0 || m.removedNodes.length > 0)) {
        shouldRefresh = true; break;
      }
    }
    if (shouldRefresh) {
      bindAddToCartButtons();
      initComboOptions();
    }
  });
  observer.observe(productsContainer, { childList: true, subtree: false });
}

/* Combo options dinámicas */
function initComboOptions(){
  if (!comboOptionsEl) return;
  comboOptionsEl.innerHTML = "";
  const productCards = document.querySelectorAll(".producto");
  productCards.forEach(card => {
    const id = card.dataset.id || generateTempProductId(card);
    const name = card.dataset.name || card.querySelector(".product-title")?.textContent?.trim() || "Producto";
    // Precio de producto: $1.00 (consistente con la UI)
    const price = parseFloat(card.dataset.price || "1.00") || 1.00;

    const div = document.createElement("div");
    div.className = "combo-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = id;
    checkbox.dataset.name = name;
    checkbox.dataset.price = price;
    checkbox.id = `combo-opt-${id}`;
    checkbox.addEventListener("change", onComboCheckboxChange);

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = `${name} — $${price.toFixed(2)}`;

    div.appendChild(checkbox);
    div.appendChild(label);
    comboOptionsEl.appendChild(div);
  });
  updateComboCounter();
}

function generateTempProductId(card){
  const name = card.dataset.name || card.querySelector(".product-title")?.textContent?.trim() || "p";
  return `${name.toLowerCase().replace(/\s+/g,'-')}-${Date.now()}`;
}

function onComboCheckboxChange(){
  const checkedCount = comboOptionsEl.querySelectorAll('input[type="checkbox"]:checked').length;
  const allCheckboxes = Array.from(comboOptionsEl.querySelectorAll('input[type="checkbox"]'));
  if (checkedCount >= COMBO_MAX_ITEMS) {
    allCheckboxes.forEach(cb => { if (!cb.checked) cb.disabled = true; });
  } else {
    allCheckboxes.forEach(cb => cb.disabled = false);
  }
  allCheckboxes.forEach(cb => {
    const parent = cb.closest('.combo-option');
    if (parent) cb.checked ? parent.classList.add('selected') : parent.classList.remove('selected');
  });
  updateComboCounter();
}

function updateComboCounter(){
  const checked = comboOptionsEl.querySelectorAll('input[type="checkbox"]:checked').length;
  if (comboSelectedCountEl) comboSelectedCountEl.textContent = checked;
}

/* Bind botones Agregar al carrito */
function bindAddToCartButtons(){
  document.querySelectorAll(".add-to-cart").forEach(btn => {
    if (!btn.dataset.bound) {
      btn.addEventListener("click", (e) => {
        const card = e.target.closest(".producto");
        if (!card) return;
        const id = card.dataset.id || generateTempProductId(card);
        const name = card.dataset.name || card.querySelector(".product-title")?.textContent?.trim() || "Producto";
        // Precio fijo por producto: $1.00
        const price = 1.00;
        const img = card.querySelector("img")?.src || "images/placeholder.jpg";
        addItem({ id, name, price, img });
      });
      btn.dataset.bound = "true";
    }
  });
}

/* Carrito */
function loadCart(){ try { const raw = localStorage.getItem(CART_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; } }
function saveCart(){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

function addItem(item){
  if (!item.isCombo) {
    const existing = cart.find(i => i.id === item.id && !i.isCombo);
    if(existing) existing.qty += 1; else cart.push({...item, qty:1});
  } else cart.push({...item});
  saveCart(); updateCartUI(); flashMessage(`${item.name} agregado al carrito`);
}

function removeItem(id){ cart = cart.filter(i => i.id !== id); saveCart(); updateCartUI(); }
function changeQty(id, delta){ const item = cart.find(i => i.id === id); if(!item) return; item.qty += delta; if(item.qty <= 0) removeItem(id); saveCart(); updateCartUI(); }

function calculateTotals(){
  const subtotal = cart.reduce((s,i) => s + i.price * i.qty, 0);
  // No hay cargo de envío
  const shipping = 0;
  const total = subtotal + shipping;
  return { subtotal, shipping, total };
}

function updateCartUI(){ cartCountEl.textContent = cart.reduce((s,i) => s + i.qty, 0); renderCartItems(); }

function renderCartItems(){
  cartItemsEl.innerHTML = "";
  const { subtotal, shipping, total } = calculateTotals();
  cartSubtotalEl.textContent = subtotal.toFixed(2);
  cartTotalEl.textContent = total.toFixed(2);

  if(cart.length === 0){
    const li = document.createElement("li"); li.textContent = "Tu carrito está vacío."; li.style.color = "#6b7280"; cartItemsEl.appendChild(li); return;
  }

  cart.forEach(item => {
    const li = document.createElement("li"); li.className = "cart-item";
    const img = document.createElement("img"); img.src = item.img || "images/placeholder.jpg"; img.alt = item.name;
    const info = document.createElement("div"); info.className = "item-info";
    const name = document.createElement("p"); name.textContent = item.name + (item.isCombo ? " (Combo)" : "");
    const price = document.createElement("small"); price.style.color = "#6b7280"; price.textContent = `$${item.price.toFixed(2)} x ${item.qty}`;
    info.appendChild(name); info.appendChild(price);

    const actions = document.createElement("div"); actions.className = "item-actions";
    const minus = document.createElement("button"); minus.className = "qty-btn"; minus.textContent = "-"; minus.addEventListener("click", () => changeQty(item.id, -1));
    const qty = document.createElement("span"); qty.textContent = item.qty; qty.style.minWidth = "20px"; qty.style.textAlign = "center";
    const plus = document.createElement("button"); plus.className = "qty-btn"; plus.textContent = "+"; plus.addEventListener("click", () => changeQty(item.id, 1));
    const del = document.createElement("button"); del.className = "qty-btn"; del.textContent = "Eliminar"; del.addEventListener("click", () => removeItem(item.id));
    actions.appendChild(minus); actions.appendChild(qty); actions.appendChild(plus); actions.appendChild(del);

    li.appendChild(img); li.appendChild(info); li.appendChild(actions);
    cartItemsEl.appendChild(li);
  });
}

/* Modales */
function openCart(){ cartModal.classList.remove("hidden"); document.body.style.overflow = "hidden"; }
function closeCart(){ cartModal.classList.add("hidden"); document.body.style.overflow = ""; }

function openCombo(){ initComboOptions(); comboModal.classList.remove("hidden"); document.body.style.overflow = "hidden"; }
function closeCombo(){ comboModal.classList.add("hidden"); document.body.style.overflow = ""; }

/* Envío al servidor */
function generateOrderId(){ return 'ORD-' + Date.now(); }

async function sendOrderToServer(order){
  try {
    const res = await fetch(API_ORDERS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
    if (!res.ok) { console.error('Error al enviar pedido al servidor', res.status); return null; }
    return await res.json();
  } catch (err) { console.error('Error de red al enviar pedido', err); return null; }
}

/* Agregar combo */
function addComboToCart(){
  const checked = Array.from(comboOptionsEl.querySelectorAll('input[type="checkbox"]:checked'));
  if (checked.length < COMBO_MIN_ITEMS) { alert(`Selecciona al menos ${COMBO_MIN_ITEMS} producto(s) para crear un combo.`); return; }
  if (checked.length > COMBO_MAX_ITEMS) { alert(`Puedes seleccionar hasta ${COMBO_MAX_ITEMS} productos en un combo.`); return; }
  const qty = parseInt(comboQtyEl.value, 10) || 1; if (qty < 1) { alert("Cantidad inválida."); return; }
  const names = checked.map(ch => ch.dataset.name || ch.nextSibling?.textContent?.trim()).filter(Boolean);
  const comboName = `Combo: ${names.join(', ')}`;
  const comboId = `combo-${Date.now()}`;
  const comboItem = { id: comboId, name: comboName, price: COMBO_PRICE, img: "images/placeholder.jpg", qty: qty, isCombo: true, components: checked.map(ch => ({ id: ch.value, name: ch.dataset.name, price: parseFloat(ch.dataset.price) })) };
  cart.push(comboItem); saveCart(); updateCartUI();
  comboOptionsEl.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; cb.disabled = false; cb.closest('.combo-option')?.classList.remove('selected'); });
  comboQtyEl.value = 1; updateComboCounter(); closeCombo(); flashMessage(`Combo agregado: ${comboName}`);
}

/* Confirmar transferencia */
async function confirmTransfer(){
  const { subtotal, shipping, total } = calculateTotals();
  if (total === 0) { alert("Tu carrito está vacío."); return; }
  const name = transferNameEl?.value?.trim() || ""; const address = transferAddressEl?.value?.trim() || "";
  if (!name || !address) { alert("Por favor completa tu nombre y dirección antes de enviar el comprobante."); return; }
  const orderId = generateOrderId();
  const order = { id: orderId, customer: { name, address }, items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, isCombo: !!i.isCombo, components: i.components || [] })), subtotal: parseFloat(subtotal.toFixed(2)), shipping: 0, total: parseFloat(total.toFixed(2)), payment_method: "transferencia", status: "pendiente_transferencia", created_at: new Date().toISOString() };
  await sendOrderToServer(order);
  const productLines = order.items.map(it => it.isCombo && it.components?.length ? `${it.name} (${it.components.map(c=>c.name).join(', ')}) x${it.qty} - $${(it.price*it.qty).toFixed(2)}` : `${it.name} x${it.qty} - $${(it.price*it.qty).toFixed(2)}`);
  const productsText = productLines.join("\n");
  const bankAccount = document.getElementById("bank-account")?.textContent || "TU_NUMERO_CUENTA";
  const bankHolder = document.getElementById("bank-holder")?.textContent || "NOMBRE_TITULAR";
  const bankName = "Banco Pichincha";
  const messageLines = [
    `Hola, te envío el comprobante de pago.`,
    `Pedido: ${orderId}`,
    ``,
    `Cliente: ${order.customer.name}`,
    `Dirección: ${order.customer.address}`,
    ``,
    `Productos:`,
    `${productsText}`,
    ``,
    `Subtotal: $${order.subtotal.toFixed(2)}`,
    `Total a pagar: $${order.total.toFixed(2)}`,
    ``,
    `Banco: ${bankName}`,
    `Cuenta: ${bankAccount}`,
    `Titular: ${bankHolder}`,
    ``,
    `Observaciones: `
  ];
  const message = encodeURIComponent(messageLines.join("\n"));
  const waUrl = `https://wa.me/${WA_PHONE_INT}?text=${message}`;
  cart = []; saveCart(); updateCartUI(); if (transferNameEl) transferNameEl.value = ""; if (transferAddressEl) transferAddressEl.value = ""; closeCart();
  alert(`Pedido creado: ${orderId}\n\nSe abrirá WhatsApp con un mensaje prellenado. Adjunta la foto del comprobante y envíalo.`);
  window.open(waUrl, "_blank", "noopener");
}

/* Confirmar COD */
async function confirmCod(){
  const { subtotal, shipping, total } = calculateTotals();
  if (total === 0) { alert("Tu carrito está vacío."); return; }
  const name = guestNameEl.value.trim(); const address = guestAddressEl.value.trim(); const deliveryType = deliveryTypeEl.value;
  if(!name || !address){ alert("Por favor completa tu nombre y dirección."); return; }
  const orderId = generateOrderId();
  const order = { id: orderId, customer: { name, address, deliveryType }, items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, isCombo: !!i.isCombo, components: i.components || [] })), subtotal: parseFloat(subtotal.toFixed(2)), shipping: 0, total: parseFloat(total.toFixed(2)), payment_method: "efectivo_al_recibir", status: "pendiente_pago_en_efectivo", created_at: new Date().toISOString() };
  await sendOrderToServer(order);
  const productLines = order.items.map(it => it.isCombo && it.components?.length ? `${it.name} (${it.components.map(c=>c.name).join(', ')}) x${it.qty} - $${(it.price*it.qty).toFixed(2)}` : `${it.name} x${it.qty} - $${(it.price*it.qty).toFixed(2)}`);
  const productsText = productLines.join("\n");
  const messageLines = [
    `Hola, quiero confirmar un pedido con pago en efectivo al recibir.`,
    `Pedido: ${orderId}`,
    ``,
    `Cliente: ${order.customer.name}`,
    `Dirección: ${order.customer.address}`,
    `Tipo de entrega: ${order.customer.deliveryType}`,
    ``,
    `Productos:`,
    `${productsText}`,
    ``,
    `Subtotal: $${order.subtotal.toFixed(2)}`,
    `Total a pagar en efectivo: $${order.total.toFixed(2)}`,
    ``,
    `Observaciones: `
  ];
  const message = encodeURIComponent(messageLines.join("\n"));
  const waUrl = `https://wa.me/${WA_PHONE_INT}?text=${message}`;
  cart = []; saveCart(); updateCartUI(); guestNameEl.value = ""; guestAddressEl.value = ""; deliveryTypeEl.value = "Domicilio"; closeCart();
  let summary = `Pedido creado: ${orderId}\n\nNombre: ${order.customer.name}\nDirección: ${order.customer.address}\nTipo de entrega: ${order.customer.deliveryType}\n\nProductos:\n`;
  order.items.forEach(it => { summary += `- ${it.name} x${it.qty} - $${(it.price*it.qty).toFixed(2)}\n`; });
  summary += `\nSubtotal: $${order.subtotal.toFixed(2)}\nTotal a pagar en efectivo: $${order.total.toFixed(2)}\n\nSe abrirá WhatsApp para enviar la confirmación y coordinar la entrega.`;
  alert(summary);
  window.open(waUrl, "_blank", "noopener");
}

/* Utilidades */
function flashMessage(text){ console.log(text); }
