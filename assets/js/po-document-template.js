/* Shared PO document markup. The editable preview and PDF payload use this exact structure. */
function poEscape(value) {
  const node = document.createElement("span");
  node.textContent = value == null ? "" : String(value);
  return node.innerHTML;
}

function poMoney(value) {
  return "₹ " + Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderPurchaseOrderDocument(order, supplier, company) {
  const rows = (order.items || []).map((item, index) => `<tr>
    <td>${index + 1}</td><td>${poEscape(item.description || item.item_code || "Item")}</td>
    <td>${poEscape(item.quantity)} ${poEscape(item.unit || "")}</td><td>${poMoney(item.unit_price)}</td>
    <td>${poEscape(item.tax || 0)}%</td><td>${poMoney(item.line_total)}</td>
  </tr>`).join("");
  return `<article class="po-paper" data-po-number="${poEscape(order.po_number)}">
    <header class="po-header"><img class="po-logo" src="${company.logoData || "../picture/logo.png"}" alt="BlueSun logo"><div><h1>${poEscape(company.name)}</h1><strong>${poEscape(company.legalName)}</strong><p><b>Address:</b> ${poEscape(company.address)}<br><b>Phone:</b> ${poEscape(company.phone)} &nbsp; <b>Email:</b> ${poEscape(company.email)}<br><b>Tax ID:</b> ${poEscape(company.taxId || "[To be provided]")}</p></div><div class="po-title"><h2>PURCHASE ORDER</h2><p><b>PO Number:</b> ${poEscape(order.po_number)}<br><b>PO Date:</b> ${poEscape(order.po_date)}<br><b>Reference:</b> ${poEscape(order.reference_number || "—")}</p></div></header>
    <section class="po-blocks"><div><h3>Supplier</h3><p><b>Name:</b> ${poEscape(supplier.name || order.supplier_name)}<br><b>Address:</b> ${poEscape(supplier.address || "—")}<br><b>Phone:</b> ${poEscape(supplier.phone || "—")}<br><b>Email:</b> ${poEscape(supplier.email || "—")}<br><b>Tax ID:</b> ${poEscape(supplier.tax_number || "—")}</p></div><div><h3>Deliver To</h3><p><b>Location:</b> ${poEscape(order.delivery_location || "—")}<br><b>Expected Delivery:</b> ${poEscape(order.expected_delivery_date || "—")}<br><b>Payment Terms:</b> ${poEscape(order.payment_terms || "—")}</p></div></section>
    <table class="po-items"><thead><tr><th>#</th><th>Description</th><th>Quantity</th><th>Unit Price</th><th>Tax</th><th>Line Total</th></tr></thead><tbody>${rows}</tbody></table>
    <section class="po-bottom"><div><h3>Terms &amp; Conditions</h3><p>${poEscape(order.notes || company.terms).replace(/\n/g, "<br>")}</p></div><table class="po-totals"><tr><td>Subtotal</td><td>${poMoney(order.subtotal)}</td></tr><tr><td>Tax</td><td>${poMoney(order.total_tax)}</td></tr><tr class="grand"><td>Grand Total</td><td>${poMoney(order.grand_total)}</td></tr></table></section>
    <footer class="po-footer"><span>${poEscape(company.footerNote || "")}</span><div class="signature-line"><img class="signature-image" alt=""><span>Authorized Signature</span></div></footer>
  </article>`;
}
