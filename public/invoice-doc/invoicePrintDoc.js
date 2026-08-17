// Invoice print DOCUMENT — pure: invoice in, HTML string out.
//
// Extracted from invPrint() on 2026-08-04 so the SAME document staff prints can
// be served to a customer from a share link (Jett: "texting them a copy of the
// printed template ... consistent across what they see"). Before this there were
// already two divergent renderings of an invoice — this print view and the
// pdfkit PDF the email path sends, which lacks the SMS opt-in block
// (docs/BACKLOG.md:1069). A third would have made it worse, so the customer page
// consumes THIS file rather than reimplementing it.
//
// MUST stay free of `window`, `document` and `api`: a verbatim copy is vendored
// into flipsies-storefront/public/invoice-doc/ to render the public share page,
// and that copy is locked byte-for-byte by the storefront parity contract test.
// Anything referencing browser globals or the authed API client would break the
// public page. (The `window.print()` / QRCode references inside the returned
// HTML string are fine — they run in the document, not in this module.)

import { CUSTOM_ORDER_DEPOSIT_PCT, requiredDeposit } from './depositThresholds.js';
import { balanceDue } from './invoiceBalanceGate.js';
import { escapeHtml } from './format.js';
import { resolveStoreLocation } from './storeLocations.js';

const e = (s) => escapeHtml(s == null ? '' : s);

export function buildInvoicePrintHtml(inv) {
  const items       = inv.items || [];
  const isTaxExempt = !!inv.tax_exempt;
  // If the invoice is tax-exempt (resale cert, state fleet, etc.) we
  // force the displayed tax rate to 0 so the printed totals line up
  // with what the customer actually owes. Pre-fix we'd compute the
  // statutory rate and print it as a line item, which confused
  // B2B customers ("why is there tax on my tax-exempt order?").
  const TAX_RATE    = isTaxExempt ? 0 : Number(inv.tax_rate ?? 0.10);
  // Read persisted DB columns; do NOT recompute tax/total in JS. The
  // DB trigger + ck_invoices_total_internally_consistent guarantee
  // these add up. Past divergence (haul_away migration regressed the
  // tax base; printed Sales tax differed from on-screen) is closed
  // by reading inv.tax_amount instead of recomputing it.
  const subtotal     = Number(inv.subtotal || 0);
  const deliveryFee  = Number(inv.delivery_fee  || 0);
  const assemblyFee  = Number(inv.assembly_fee  || 0);
  const haulAwayFee  = Number(inv.haul_away_fee || 0);
  const tax          = Number(inv.tax_amount || 0);
  const grandTotal   = Number(inv.total || 0);
  const paid        = Number(inv.amount_paid || 0);
  const balance     = balanceDue(inv); // grandTotal === inv.total; nets returns_credit

  const retailTotal  = items.reduce((s,i) => s + (Number(i.product?.retail_price||0) * Number(i.qty||1)), 0);
  const retailGrand  = retailTotal + (retailTotal * TAX_RATE);
  const savings      = retailGrand - grandTotal;
  const showDiscount = savings > 0.01;

  const isLayaway = inv.type === 'layaway' || inv.status === 'layaway';
  // A voided invoice must never print looking like a live one (fraud-defense,
  // audit C6) — stamp it and color the status red.
  const isVoided = inv.status === 'voided';
  const isQuote   = inv.type === 'quote';
  // Date-only strings (sale_date = YYYY-MM-DD) are parsed as UTC midnight
  // by `new Date(...)` which renders as the prior day in Central Time.
  // Pin date-only values to local noon so the printed invoice matches
  // what the salesperson entered.
  const rawDate   = inv.sale_date || inv.created_at;
  const dateObj   = typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
    ? new Date(rawDate + 'T12:00:00')
    : new Date(rawDate);
  const dateStr   = dateObj.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});

  // Build item rows with optional package-group headers. Lines sharing
  // a package_id render under a single "🎁 Package — N pieces" header
  // row that totals the group price + savings vs retail-sum. Matches
  // the invoice-form visual collapse.
  const itemRows = (() => {
    const out = [];
    let prevPackageId = null;
    for (let idx = 0; idx < items.length; idx++) {
      const i = items[idx];
      const retail    = Number(i.product?.retail_price || 0);
      const price     = Number(i.unit_price || 0);
      const qty       = Number(i.qty || 1);
      const lineTotal = price * qty;

      // Package header: emit when entering a new package_id run.
      if (i.package_id && i.package_id !== prevPackageId) {
        let pkgLineCount = 0;
        let pkgGroupTotal = 0;
        let pkgRetailSum  = 0;
        let pkgName = '';
        for (let k = idx; k < items.length && items[k].package_id === i.package_id; k++) {
          const ik = items[k];
          const ikRetail = Number(ik.product?.retail_price || 0);
          const ikQty    = Number(ik.qty || 1);
          pkgLineCount  += 1;
          pkgGroupTotal += Number(ik.unit_price || 0) * ikQty;
          pkgRetailSum  += ikRetail * ikQty;
          if (!pkgName) pkgName = ik._packageName || ik.package?.name || ik.package_name || '';
        }
        const pkgSavings = Math.max(0, pkgRetailSum - pkgGroupTotal);
        const savingsCell = pkgSavings > 0.01
          ? '<span style="color:#D98C00;font-weight:500;margin-left:8px;">saves $' + pkgSavings.toFixed(2) + '</span>'
          : '';
        out.push(
          '<tr style="background:#E8F7F0;border-top:1px solid #A8D9C4;border-bottom:1px solid #A8D9C4;">' +
          '<td colspan="3" style="padding:7px 10px;font-size:12px;font-weight:600;color:#13684E;">' +
            '🎁 ' + e(pkgName || 'Package') +
            ' <span style="color:#666;font-weight:500;">— ' + pkgLineCount + ' piece' + (pkgLineCount !== 1 ? 's' : '') + '</span>' +
          '</td>' +
          '<td colspan="2" style="text-align:right;padding:7px 10px;font-size:12px;font-weight:600;color:#13684E;">' +
            '$' + pkgGroupTotal.toFixed(2) + savingsCell +
          '</td>' +
          '</tr>'
        );
      }
      prevPackageId = i.package_id || null;

      // 2026-05-08 — post pass-through migration discount lives in
      // unit_price, so the strikethrough retail goes INLINE next to
      // the discounted price (per Jett: "original price with a strike
      // through next to the new line item price"). The separate Retail
      // column was dropped to make the savings legible at a glance.
      // For packaged lines we skip the strikethrough (the package
      // header already shows the savings against retail-sum).
      const priceCellInner = (!i.package_id && retail > 0 && retail > price)
        ? '<span style="color:#999;text-decoration:line-through;font-size:11px;margin-right:6px;">$' + retail.toFixed(2) + '</span>$' + price.toFixed(2)
        : '$' + price.toFixed(2);
      // 2026-05-02: render fabric / custom-config as a sub-line under the
      // item name. Pre-fix the customer's printed invoice didn't surface
      // the fabric they picked (e.g. "172 Parkway / Sand") even though
      // the form modal showed it correctly — customers couldn't verify
      // their config at hand-off. Prefer fabric_label (human "Vendor —
      // Color Name"), fall back to fabric_code, then custom_config.
      const fabricLine = i.fabric_label || i.fabric_code || i.custom_config;
      const subLineHtml = fabricLine
        ? '<div style="font-size:11px;color:#7C5C0C;margin-top:2px;font-style:italic;">🧵 ' + e(String(fabricLine)) + '</div>'
        : '';
      const skuCellIndent = i.package_id ? 'padding-left:24px;' : '';
      out.push(
        '<tr style="border-bottom:1px solid #eee;">' +
        '<td style="padding:9px 10px;' + skuCellIndent + 'font-family:monospace;font-size:11px;color:#0C447C;">' + e(i.sku||'—') + '</td>' +
        '<td style="padding:9px 10px;font-size:13px;">' + e(i.name||i.description||'—') + subLineHtml + '</td>' +
        '<td style="text-align:center;padding:9px 10px;font-size:13px;">' + qty + '</td>' +
        '<td style="text-align:right;padding:9px 10px;font-size:13px;">' + priceCellInner + '</td>' +
        '<td style="text-align:right;padding:9px 10px;font-size:13px;font-weight:600;">$' + lineTotal.toFixed(2) + '</td>' +
        '</tr>'
      );
    }
    return out.join('');
  })();

  const discountBanner = showDiscount
    ? '<div style="background:#1D9E75;color:white;border-radius:10px;padding:14px 20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">' +
        '<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.85;margin-bottom:2px;">Your savings today</div>' +
        '<div style="font-size:22px;font-weight:800;">$' + savings.toFixed(2) + ' off retail</div></div>' +
        '<div style="text-align:right;opacity:.9;font-size:13px;line-height:1.8;">' +
        '<div>Retail value: $' + retailGrand.toFixed(2) + '</div>' +
        '<div>Your price: $' + grandTotal.toFixed(2) + '</div></div></div>'
    : '';

  const layawayBlock = isLayaway
    ? '<div style="border:1px solid #F5E6B2;background:#FEF9EC;border-radius:8px;padding:14px 16px;margin-bottom:20px;font-size:12px;color:#7C5C0C;">' +
        '<strong>Layaway Agreement:</strong> A 20% non-refundable deposit is required to hold layaway items. ' +
        'Remaining balance is due before delivery or pickup. Layaway items will be held for 90 days. ' +
        'Items not paid in full within 90 days may be returned to inventory with no refund of deposit.</div>'
    : '';

  const paidRow = !isQuote
    ? '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;">' +
        '<span style="color:#1D9E75;">Amount paid</span><span style="color:#1D9E75;">$' + paid.toFixed(2) + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;padding:7px 0;font-size:15px;font-weight:800;border-top:2px solid #e5e5e3;margin-top:4px;color:' + (balance > 0 ? '#c0392b' : '#1D9E75') + ';">' +
        '<span>Balance due</span><span>$' + balance.toFixed(2) + '</span></div>'
    : '';

  // Itemize each payment so the customer sees the date, method, and amount of
  // every payment (e.g. a store-credit + credit-card split). The data is already
  // in inv.payments (invoice_payments rows); the rolled-up "Amount paid" total
  // below still shows the sum. Labels mirror PAYMENT_METHODS in views/invoices.js
  // (kept inline so the print util has no view dependency).
  const PRINT_PAY_LABELS = {
    cash: 'Cash', check: 'Check', credit_card: 'Credit Card', paypal: 'PayPal',
    zelle: 'Zelle', synchrony: 'Synchrony', progressive: 'Progressive Leasing',
    '1st_franklin': '1st Franklin', store_credit: 'Store Credit',
  };
  const payments = Array.isArray(inv.payments) ? inv.payments : [];
  const paymentsBlock = (!isQuote && payments.length)
    ? payments.map((p) => {
        const when = p.payment_date || p.created_at;
        const whenObj = typeof when === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(when)
          ? new Date(when + 'T12:00:00') : new Date(when);
        const whenStr = when ? whenObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
        const label = PRINT_PAY_LABELS[p.method] || p.method || 'Payment';
        const ref = p.reference_number ? ' · Ref ' + e(p.reference_number) : '';
        return '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:#555;">' +
          '<span>' + e(whenStr) + (whenStr ? ' · ' : '') + e(label) + ref + '</span>' +
          '<span>$' + Number(p.amount || 0).toFixed(2) + '</span></div>';
      }).join('')
    : '';

  const notesBlock = inv.notes
    ? '<div style="background:#FEF9EC;border:1px solid #F5E6B2;border-radius:8px;padding:12px 16px;margin-bottom:20px;">' +
        '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:4px;">Notes</div>' +
        '<div style="font-size:12px;color:#555;line-height:1.6;">' + e(inv.notes) + '</div></div>'
    : '';

  // UltaCare policy number (Savannah W 2026-08-16: "even having it printed on
  // invoice"). Deliberately its OWN block rather than a line inside Notes: the
  // customer is handed a separate paper certificate carrying this number, and
  // the whole point is that the two can be matched when they file a claim.
  // Buried in a free-text notes paragraph it is not findable, which is the
  // status quo this replaces.
  const warrantyBlock = inv.warranty_number
    ? '<div style="border:1px solid #ddd;border-radius:8px;padding:10px 16px;margin-bottom:20px;' +
        'display:flex;align-items:baseline;gap:10px;">' +
        '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#888;">' +
        'UltaCare warranty #</div>' +
        '<div style="font-size:15px;font-weight:700;color:#1a1a1a;letter-spacing:.02em;">' +
        e(inv.warranty_number) + '</div>' +
        '<div style="font-size:11px;color:#888;margin-left:auto;">Keep with your warranty certificate</div>' +
      '</div>'
    : '';

  const salespersonLine = inv.salesperson?.name
    ? '<div style="font-size:12px;color:#555;margin-top:2px;">Sales: ' + e(inv.salesperson.name) + '</div>'
    : '';

  const phoneLine = inv.customer_phone
    ? '<div style="font-size:12px;color:#555;margin-top:3px;">' + e(inv.customer_phone) + '</div>'
    : '';

  const addrLine = inv.customer_address
    ? '<div style="font-size:12px;color:#555;margin-top:3px;">' + e(inv.customer_address) + '</div>'
    : '';

  const layawayBadge = isLayaway
    ? '<span style="margin-left:8px;background:#FEF9EC;color:#7C5C0C;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;">Layaway</span>'
    : '';

  const smsPhone = inv.customer_phone || '______________________';

  // Resolve the selling showroom for the printed header + pickup block:
  // inv.location → salesperson.store → Irondale default (see storeLocations.js).
  const store = resolveStoreLocation(inv);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${isQuote ? 'Quote' : 'Invoice'} ${e(inv.invoice_number)} \u2014 Flipsies Furniture</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#1a1a1a; background:white; padding:32px; font-size:13px; }
    @media print { body { padding:16px; } .no-print { display:none !important; } @page { margin:12mm 14mm; } }
    table { border-collapse:collapse; width:100%; }
    th { background:#f5f5f3; text-align:left; padding:9px 10px; font-size:11px; font-weight:600; color:#666; text-transform:uppercase; letter-spacing:.05em; border-bottom:2px solid #e5e5e3; }
    .void-stamp { position:fixed; top:44%; left:50%; transform:translate(-50%,-50%) rotate(-26deg);
      font-size:120px; font-weight:800; letter-spacing:10px; color:rgba(224,75,74,0.18);
      border:8px solid rgba(224,75,74,0.18); padding:6px 46px; border-radius:14px;
      pointer-events:none; z-index:9999; white-space:nowrap;
      -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  </style>
</head>
<body>
  ${isVoided ? '<div class="void-stamp">VOID</div>' : ''}
  <div class="no-print" style="margin-bottom:24px;display:flex;gap:10px;align-items:center;">
    <button onclick="window.print()" style="background:#0C447C;color:white;border:none;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">\uD83D\uDDA8 Print / Save as PDF</button>
    <button onclick="window.close()" style="background:#f0f0ee;color:#333;border:none;padding:9px 16px;border-radius:6px;font-size:13px;cursor:pointer;">Close</button>
    <span style="font-size:12px;color:#888;margin-left:4px;">Tip: choose "Save as PDF" in the print dialog</span>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:20px;border-bottom:2px solid #0C447C;">
    <div>
      <div style="font-size:26px;font-weight:800;color:#0C447C;letter-spacing:-.5px;">Flipsies Furniture</div>
      <div style="font-size:12px;color:#555;margin-top:4px;line-height:1.8;">
        <strong style="color:#333;">${e(store.name)}</strong><br>
        ${e(store.address)}<br>
        ${e(store.phone)} &nbsp;&middot;&nbsp; ${e(store.website)}
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:22px;font-weight:800;color:#0C447C;">${isQuote ? 'QUOTE' : 'INVOICE'}</div>
      <div style="font-family:monospace;font-size:14px;font-weight:600;margin-top:2px;">${e(inv.invoice_number)}</div>
      <div style="font-size:12px;color:#888;margin-top:4px;">${dateStr}</div>
      ${salespersonLine}
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
    <div style="background:#f8f8f8;border-radius:8px;padding:14px 16px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:6px;">Bill To</div>
      <div style="font-size:15px;font-weight:700;">${inv.customer_name ? e(inv.customer_name) : '&mdash;'}</div>
      ${phoneLine}
      ${addrLine}
    </div>
    <div style="background:#f8f8f8;border-radius:8px;padding:14px 16px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:6px;">Details</div>
      <div style="font-size:12px;color:#555;line-height:2;">
        <span style="color:#888;">Status:</span>
        <strong style="margin-left:6px;${isVoided ? 'color:#E04B4A;' : ''}">${(inv.status||'').charAt(0).toUpperCase()+(inv.status||'').slice(1)}</strong>
        ${layawayBadge}
        <br><span style="color:#888;">Location:</span>
        <strong style="margin-left:6px;">${inv.location ? e(inv.location) : '&mdash;'}</strong>
      </div>
    </div>
  </div>

  ${discountBanner}

  ${(() => {
    // 2026-05-02: positive-state gate. Only show "Delivery Charge: Not
    // Yet Paid" when there is GENUINELY no fulfillment commitment yet:
    //   - no delivery_fee (or 0)
    //   - no delivery_date set (no slot picked)
    //   - no delivery_order_id (no order created)
    //   - no pickup_date (didn't choose pickup either)
    // Pre-fix this gated on inv.delivery_later alone, so an invoice
    // with delivery_later=true (set by a stray /deliver-later call or
    // slot-expiry sweep) plus a real delivery_fee + delivery_date
    // would print BOTH the "Not Yet Paid" banner AND the
    // "Scheduled Delivery" banner — contradictory and customer-facing.
    const hasFee   = Number(inv.delivery_fee || 0) > 0;
    const hasDate  = !!inv.delivery_date;
    const hasOrder = !!inv.delivery_order_id;
    const hasPickup = !!inv.pickup_date || inv.delivery_mode === 'pickup';
    const trulyDeferred = inv.delivery_later && !hasFee && !hasDate && !hasOrder && !hasPickup;
    return trulyDeferred ? `
  <div style="background:#FFF8E1;border:2px solid #F0A500;border-radius:10px;
    padding:18px 20px;margin-bottom:24px;">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
      <div>
        <div style="font-size:13px;font-weight:800;color:#7C4A00;text-transform:uppercase;
          letter-spacing:.06em;margin-bottom:8px;">📦 Delivery Charge: Not Yet Paid</div>
        <div style="font-size:15px;font-weight:700;color:#7C4A00;">
          This invoice does not include the delivery fee.
        </div>
        <div style="font-size:13px;color:#92580A;margin-top:6px;line-height:1.6;">
          A separate charge will be billed once your delivery is scheduled.
        </div>
      </div>
      <button onclick="invOpenDeliveryOptions('${inv.id}')"
        style="flex-shrink:0;background:#F0A500;color:#fff;border:none;border-radius:8px;
          padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">
        Change Fulfillment
      </button>
    </div>
  </div>` : '';
  })()}

  ${isQuote ? `
  <div style="background:#FEF3E1;border:2px solid #F0A500;border-radius:10px;
    padding:18px 20px;margin-bottom:24px;text-align:center;">
    <div style="font-size:28px;font-weight:900;color:#92580A;letter-spacing:.08em;">
      QUOTE
    </div>
    <div style="font-size:12px;color:#92580A;margin-top:6px;line-height:1.5;">
      This is an estimate only. Prices and availability are subject to change.<br>
      Valid for 30 days from the date above.
    </div>
  </div>` : (inv.delivery_mode === 'pickup' || inv.pickup_date) ? `
  <div style="background:#E6F1FB;border:2px solid #0C447C;border-radius:10px;
    padding:18px 20px;margin-bottom:24px;">
    <div style="font-size:13px;font-weight:800;color:#0C447C;text-transform:uppercase;
      letter-spacing:.06em;margin-bottom:8px;">📦 Customer Pick Up</div>
    <div style="font-size:18px;font-weight:800;color:#0C447C;">
      Flipsies Furniture — ${e(store.name)}
    </div>
    <div style="font-size:15px;font-weight:600;color:#1a1a1a;margin-top:4px;">
      ${e(store.address)}
    </div>
    ${inv.pickup_date ? `
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid #9FC3E8;
      font-size:13px;color:#333;">
      <span style="color:#0C447C;font-weight:600;">Scheduled:</span>
      ${new Date(inv.pickup_date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
      ${inv.pickup_time ? `at <strong>${inv.pickup_time}</strong>` : ''}
    </div>` : ''}
  </div>` : (inv.delivery_mode === 'schedule' || inv.delivery_date) ? `
  <div style="background:#E8F5E9;border:2px solid #2E7D32;border-radius:10px;
    padding:18px 20px;margin-bottom:24px;">
    <div style="font-size:13px;font-weight:800;color:#2E7D32;text-transform:uppercase;
      letter-spacing:.06em;margin-bottom:8px;">🚚 Scheduled Delivery</div>
    <div style="font-size:15px;font-weight:600;color:#1a1a1a;">
      Delivery to: ${(inv.customer_address || inv.address) ? e(inv.customer_address || inv.address) : '&mdash;'}
    </div>
    ${inv.delivery_date ? `
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid #A5D6A7;
      font-size:13px;color:#333;">
      <span style="color:#2E7D32;font-weight:600;">Date:</span>
      ${new Date(inv.delivery_date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
      ${inv.delivery_time ? `&nbsp;&nbsp;<span style="color:#2E7D32;font-weight:600;">Window:</span> <strong>${inv.delivery_time}</strong>` : ''}
    </div>` : ''}
    ${Number(inv.delivery_fee||0) > 0 ? `
    <div style="margin-top:6px;font-size:13px;color:#555;">
      <span style="color:#2E7D32;font-weight:600;">Delivery Fee:</span>
      <strong>$${Number(inv.delivery_fee).toFixed(2)}</strong>
    </div>` : ''}
  </div>` : ''}

  <div style="margin-bottom:24px;">
    <table>
      <thead>
        <tr>
          <th style="width:80px;">SKU</th>
          <th>Description</th>
          <th style="text-align:center;width:48px;">Qty</th>
          <th style="text-align:right;width:140px;">Your Price</th>
          <th style="text-align:right;width:90px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows || '<tr><td colspan="5" style="padding:20px;text-align:center;color:#aaa;">No items</td></tr>'}
      </tbody>
    </table>
  </div>

  <!-- padding-right:10px is load-bearing, not cosmetic. Measured in Chrome at
       Letter with the @page margins below: every figure in this stack — Total,
       Balance due, Amount paid — landed at x=694, which IS the content-box edge.
       Zero slack. The items table's money column has 10px of cell padding and
       ends at 684, so the two were never aligned AND this one had nothing to
       give: any printer hardware margin, a "Minimum margins" dialog choice, or
       sub-pixel rounding clipped the last digit ("cutting off the right margin,
       last digit only partially displayed" — operator, 2026-08-06).
       width 260 -> 270 with box-sizing:border-box keeps the label column at its
       original 260px, so only the gutter changes. -->
  <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
    <div style="width:270px;padding-right:10px;">
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;">
        <span style="color:#888;">Subtotal</span><span>$${subtotal.toFixed(2)}</span>
      </div>
      ${deliveryFee > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;">
        <span style="color:#888;">${isQuote ? 'Est. delivery fee' : 'Delivery fee'}</span><span>$${deliveryFee.toFixed(2)}</span>
      </div>` : ''}
      ${assemblyFee > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;">
        <span style="color:#888;">Assembly</span><span>$${assemblyFee.toFixed(2)}</span>
      </div>` : ''}
      ${isTaxExempt ? `
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;
        background:#fdfbf4;border:1px dashed #e8dcb0;border-radius:4px;padding:4px 8px;margin:4px 0;">
        <span style="color:#6b4e1c;font-weight:600;">TAX EXEMPT${inv.tax_exempt_reason ? ' — ' + e(inv.tax_exempt_reason) : ''}</span>
        <span style="color:#6b4e1c;font-weight:600;">$0.00</span>
      </div>` : `
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;">
        <span style="color:#888;">Sales tax (${(TAX_RATE*100).toFixed(0)}%)</span><span>$${tax.toFixed(2)}</span>
      </div>`}
      ${haulAwayFee > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;">
        <span style="color:#888;">Haul-away <span style="font-size:10px;color:#bbb;">(not taxed)</span></span><span>$${haulAwayFee.toFixed(2)}</span>
      </div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:7px 0;font-size:15px;font-weight:800;border-top:2px solid #1a1a1a;margin-top:4px;">
        <span>Total</span><span>$${grandTotal.toFixed(2)}</span>
      </div>
      ${paymentsBlock}
      ${paidRow}
    </div>
  </div>

  ${warrantyBlock}
  ${notesBlock}

  <div style="border:1.5px solid #0C447C;border-radius:10px;padding:16px 18px;margin-bottom:20px;">
    <div style="font-size:13px;font-weight:700;color:#0C447C;margin-bottom:6px;">&#128241; Text Message Updates</div>
    <div style="font-size:12px;color:#444;margin-bottom:10px;line-height:1.6;">
      Get text messages about your order &mdash; delivery arrival windows, pickup-ready alerts,
      custom-order status updates, and an occasional review request after your purchase.
    </div>
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;">
      <div style="width:18px;height:18px;border:2px solid #0C447C;border-radius:3px;flex-shrink:0;margin-top:1px;"></div>
      <div style="font-size:12px;color:#333;line-height:1.6;">
        Yes! I agree to receive account, order, delivery, and review-request text messages
        from Flipsies Furniture at:
        <span style="font-family:monospace;font-weight:600;color:#0C447C;margin-left:4px;">${smsPhone}</span><br>
        <span style="font-size:11px;color:#999;">Consent is not a condition of purchase. Message frequency varies.
        Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help.</span>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;font-size:12px;color:#555;">
      <span>Customer initials: ___________</span>
      <span style="margin-left:auto;">Date: ___________</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin-top:10px;padding-top:8px;border-top:1px dashed #d5d5d5;">
      <div id="inv-sms-terms-qr" style="flex-shrink:0;line-height:0;"></div>
      <div style="font-size:10px;color:#777;line-height:1.5;">
        Full SMS Terms &amp; Privacy Policy:<br>
        flipsiesfurniture.com/terms &nbsp;&middot;&nbsp; flipsiesfurniture.com/privacy
      </div>
    </div>
  </div>

  ${layawayBlock}

  <div style="margin-top:8px;padding-top:16px;border-top:1px solid #e5e5e3;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:16px;">
      <div>
        <div style="border-bottom:1px solid #333;margin-bottom:4px;height:36px;"></div>
        <div style="font-size:11px;color:#888;">Customer Signature</div>
      </div>
      <div>
        <div style="border-bottom:1px solid #333;margin-bottom:4px;height:36px;"></div>
        <div style="font-size:11px;color:#888;">Date</div>
      </div>
    </div>
    <div style="font-size:10px;color:#aaa;line-height:1.7;">
      All sales are final. Merchandise is sold as-is unless otherwise noted. Flipsies Furniture is not responsible for
      damage during customer-arranged transport. Delivery fees are non-refundable once a delivery date is scheduled.
      Special orders and custom items are non-refundable. By signing above, customer acknowledges receipt of merchandise
      and agrees to all terms.
    </div>
  </div>

  <!-- Google Review QR -->
  <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e5e5e3;text-align:center;">
    <div style="font-size:13px;font-weight:700;color:#0C447C;margin-bottom:6px;">Love your new furniture?</div>
    <div style="font-size:12px;color:#555;margin-bottom:12px;">Scan the QR code below to leave us a Google review — it means the world to us!</div>
    <div id="inv-review-qr" style="display:inline-block;"></div>
    <div style="font-size:10px;color:#aaa;margin-top:6px;">Flipsies Furniture — Thank you for your business!</div>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" integrity="sha384-3zSEDfvllQohrq0PHL1fOXJuC/jSOO34H46t6UQfobFOmxE5BpjjaIJY5F2/bMnU" crossorigin="anonymous"><\/script>
  <script>
    new QRCode(document.getElementById('inv-review-qr'), {
      text: 'https://g.page/r/flipsies-furniture/review',
      width: 100, height: 100,
      colorDark: '#0C447C', colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
    new QRCode(document.getElementById('inv-sms-terms-qr'), {
      text: 'https://www.flipsiesfurniture.com/terms',
      width: 56, height: 56,
      colorDark: '#0C447C', colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  <\/script>
</body>
</html>`;

  return html;
}
