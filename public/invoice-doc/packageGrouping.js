// utils/packageGrouping.js
//
// One implementation of "how does a package appear on an invoice", shared by
// every surface that renders invoice lines.
//
// ── Why this is a util and not three copies ────────────────────────
//
// A package is stored EXPANDED — one invoice_items row per physical piece, each
// carrying the same `package_id`. That is deliberate and load-bearing: the
// qty_committed trigger sums per product_id, reservations stamp a bin to a
// LINE, fulfillment_status and needs_po are per component, returns reference an
// invoice_item, and margin comes off per-line cost. Collapsing the STORAGE
// would re-plumb all of it.
//
// So the collapse is a DISPLAY concern — and display happens in three places:
// the invoice form, the customer/print copy, and the invoice detail view.
// Before this file, two of them had grown their own grouping loop and the third
// had none at all. That is the exact shape of bug this codebase keeps paying
// for (one rule, several implementations, quietly drifting), so the rule lives
// here once and the surfaces render it.
//
// ── The display, per Jett 2026-08-23 ───────────────────────────────
//
//   5 Piece Louis Phillip Bedroom Suite - White
//   Includes Dresser, Mirror, Nightstand, Queen Bed, Chest
//
// Concise, carrying everything relevant: name, contents, package price, and the
// saving against component retail. The component rows are NOT separately
// editable — a package sells at its designated price, and anything custom is
// either a different package or entered row by row.

/** A component's own retail, used only as the savings BASIS. */
function retailOf(line) {
  return Number(line._origPrice ?? line.product?.retail_price ?? 0);
}

/**
 * Human contents list: "Dresser, Mirror, Nightstand, Queen Bed, Chest".
 *
 * Uses the line's display name, trimmed of the package's own name when the
 * component repeats it (a "Louis Phillip Dresser" inside a "Louis Phillip
 * Bedroom Suite" should read as "Dresser", or the row becomes unreadable).
 * A qty above one is shown, because "2 Nightstands" is the kind of thing a
 * customer checks against what came off the truck.
 */
export function packageContentsLabel(lines, packageName = '') {
  const stop = String(packageName || '')
    .replace(/\b\d+\s*(pc|piece)\b/gi, '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .map(w => w.toLowerCase());

  return (lines || []).map((l) => {
    const raw = String(l.name || l.sku || 'Item').trim();
    // Drop the words the package name already said, then tidy separators.
    let short = raw;
    if (stop.length) {
      const kept = raw.split(/\s+/).filter(w => !stop.includes(w.replace(/[^\w]/g, '').toLowerCase()));
      // Only use the trimmed form if something survived — never render "".
      if (kept.length) short = kept.join(' ');
    }
    short = short.replace(/^[\s·\-–—,]+|[\s·\-–—,]+$/g, '').replace(/\s{2,}/g, ' ');
    if (!short) short = raw;
    const qty = Number(l.qty || 1);
    return qty > 1 ? `${qty} ${short}` : short;
  }).join(', ');
}

/**
 * Totals for one package group.
 *
 * `group_total` is what the customer pays for the set — the sum of the
 * distributed line prices, which is the package price (the expansion allocates
 * it exactly, cent-drift absorbed). `savings` is against summed component
 * retail, which is the number worth showing: a package sells below component
 * retail by design.
 *
 * Replaces computePackageHeaderInfo, which lived inside invoiceFormItems.js.
 */
export function packageTotals(lines) {
  let line_count = 0, group_total = 0, retail_sum = 0, units = 0;
  for (const l of (lines || [])) {
    const qty = Number(l.qty || 0);
    line_count += 1;
    units      += qty;
    group_total += Number(l.unit_price || 0) * qty;
    retail_sum  += retailOf(l) * qty;
  }
  return {
    line_count, units,
    group_total: Math.round(group_total * 100) / 100,
    retail_sum:  Math.round(retail_sum * 100) / 100,
    savings:     Math.max(0, Math.round((retail_sum - group_total) * 100) / 100),
  };
}

/**
 * Group a flat invoice line list into render entries, preserving order.
 *
 * Returns a mixed list of:
 *   { kind: 'package', package_id, name, lines, indices, ...packageTotals }
 *   { kind: 'line',    item, index }
 *
 * `index` / `indices` are the positions in the ORIGINAL array. That is not
 * decoration: the invoice form edits and removes by array index
 * (updateItem(i) / removeItem(i)), so a grouped render still has to know where
 * each line really sits. Losing that mapping is how a collapse ends up
 * deleting the wrong row.
 *
 * Grouping is by package_id across the WHOLE list rather than by consecutive
 * runs. The previous per-surface loops keyed on "first of a consecutive run",
 * which silently produced two headers for one package if anything reordered the
 * lines between them.
 */
export function groupInvoiceLines(items) {
  const list = Array.isArray(items) ? items : [];
  const out = [];
  const seen = new Map(); // package_id -> entry

  list.forEach((item, index) => {
    const pid = item && item.package_id;
    if (!pid) { out.push({ kind: 'line', item, index }); return; }

    let entry = seen.get(pid);
    if (!entry) {
      entry = {
        kind: 'package',
        package_id: pid,
        name: item._packageName || item.package?.name || item.package_name || 'Package',
        lines: [],
        indices: [],
      };
      seen.set(pid, entry);
      out.push(entry);
    }
    entry.lines.push(item);
    entry.indices.push(index);
  });

  // Totals + contents once the group is complete.
  for (const entry of out) {
    if (entry.kind !== 'package') continue;
    Object.assign(entry, packageTotals(entry.lines));
    entry.contents = packageContentsLabel(entry.lines, entry.name);
  }
  return out;
}
