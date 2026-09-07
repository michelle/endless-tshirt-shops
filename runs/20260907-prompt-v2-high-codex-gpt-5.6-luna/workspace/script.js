const PRODUCTS = {
  "signal-moth": { name: "Signal Moth Tee", price: 34, asset: "signal-moth.svg" },
  "night-shift": { name: "Night Shift Tee", price: 34, asset: "night-shift.svg" },
  "lunar-garden": { name: "Lunar Garden Tee", price: 36, asset: "lunar-garden.svg" }
};
let cart = JSON.parse(localStorage.getItem("moonmoth-cart") || "[]");
let selectedProduct = "signal-moth";
const $ = (id) => document.getElementById(id);
const productModal = $("product-modal"), checkoutModal = $("checkout-modal");
function saveCart() { localStorage.setItem("moonmoth-cart", JSON.stringify(cart)); renderCart(); }
function money(value) { return `$${value.toFixed(2).replace(".00", "")}`; }
function renderCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + PRODUCTS[item.productId].price * item.quantity, 0);
  $("cart-count").textContent = count; $("drawer-count").textContent = count; $("cart-total").textContent = money(total); $("checkout-button").disabled = !cart.length;
  $("cart-items").innerHTML = cart.length ? cart.map((item, index) => { const p = PRODUCTS[item.productId]; return `<div class="cart-row"><div class="cart-thumb"><img src="/art/${p.asset}" alt=""></div><div><h3>${p.name}</h3><p>Size ${item.size} · Qty ${item.quantity}</p><button class="remove" data-remove="${index}">Remove</button></div><strong>${money(p.price * item.quantity)}</strong></div>`; }).join("") : `<div class="empty-cart"><div>☾</div><p>Your bag is quiet.<br>Add a signal to wake it up.</p></div>`;
  document.querySelectorAll("[data-remove]").forEach((button) => button.addEventListener("click", () => { cart.splice(Number(button.dataset.remove), 1); saveCart(); }));
}
function openCart() { $("cart-drawer").classList.add("open"); $("scrim").classList.add("open"); $("cart-drawer").setAttribute("aria-hidden", "false"); }
function closeCart() { $("cart-drawer").classList.remove("open"); $("scrim").classList.remove("open"); $("cart-drawer").setAttribute("aria-hidden", "true"); }
document.querySelectorAll(".add-product").forEach((button) => button.addEventListener("click", () => { selectedProduct = button.closest(".product-card").dataset.product; const p = PRODUCTS[selectedProduct]; $("modal-product-name").textContent = p.name; $("modal-product-price").textContent = money(p.price); $("product-quantity").value = 1; productModal.showModal(); }));
$("product-form").addEventListener("submit", (event) => { event.preventDefault(); const size = $("product-size").value; const quantity = Math.max(1, Math.min(10, Number($("product-quantity").value) || 1)); const existing = cart.find((item) => item.productId === selectedProduct && item.size === size); if (existing) existing.quantity = Math.min(10, existing.quantity + quantity); else cart.push({ productId: selectedProduct, size, quantity }); saveCart(); productModal.close(); openCart(); showToast("Added to your orbit"); });
$("qty-minus").addEventListener("click", () => { $("product-quantity").value = Math.max(1, Number($("product-quantity").value) - 1); }); $("qty-plus").addEventListener("click", () => { $("product-quantity").value = Math.min(10, Number($("product-quantity").value) + 1); });
$("open-cart").addEventListener("click", openCart); $("close-cart").addEventListener("click", closeCart); $("scrim").addEventListener("click", closeCart); document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => $(button.dataset.close).close()));
$("checkout-button").addEventListener("click", () => { closeCart(); checkoutModal.classList.remove("success"); $("order-success").classList.remove("show"); $("checkout-form").reset(); $("form-error").textContent = ""; checkoutModal.showModal(); });
$("checkout-form").addEventListener("submit", async (event) => { event.preventDefault(); const button = $("place-order"); const error = $("form-error"); button.disabled = true; button.innerHTML = "Sending to Prodigi <span>…</span>"; error.textContent = ""; const form = new FormData(event.target); const customer = Object.fromEntries(form.entries()); try { const response = await fetch("/api/create-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer, items: cart }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not place order"); $("order-id").textContent = data.orderId ? `Order ID: ${data.orderId}` : "Order submitted"; checkoutModal.classList.add("success"); $("order-success").classList.add("show"); cart = []; saveCart(); } catch (err) { error.textContent = err.message; } finally { button.disabled = false; button.innerHTML = "Place sandbox order <span>↗</span>"; } });
$("done-button").addEventListener("click", () => checkoutModal.close());
function showToast(message) { const toast = $("toast"); toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2200); }
renderCart();
