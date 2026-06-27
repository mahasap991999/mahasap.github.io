// ===============================================================
// Mahasap POS — PWA REST API Bridge
// Add this to your existing Code.gs (or replace doGet with the
// version below so both the old GAS UI AND the PWA work).
// Deploy as: Execute as "Me", Who has access "Anyone"
// ===============================================================

/**
 * PWA entry point — serves the PWA shell or handles preflight.
 * The actual PWA files are hosted statically (see index.html).
 * This doGet is only needed if you still want to serve via GAS URL.
 */
function doGet(e) {
  // Return a minimal redirect page pointing to your PWA host, OR
  // keep your original GAS template serve if you haven't migrated yet.
  return HtmlService.createHtmlOutput('<p>Use the PWA URL.</p>');
}

/**
 * Main REST dispatcher — all PWA API calls land here.
 * POST body: { fn: "functionName", args: [...] }
 * Returns JSON: the function's return value, or { error: "..." }
 */
function doPost(e) {
  const allowedOrigins = [
    'https://mahasap991999.github.io',
    'http://localhost',
    'null' // for local file testing
  ];

  const origin = e?.parameter?.origin || '';

  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const body = JSON.parse(e.postData.contents);
    const fn   = body.fn;
    const args = body.args || [];

    const ALLOWED = [
      'login', 'getUsers', 'saveUser', 'deleteUser',
      'fetchCoreData', 'fetchSales', 'fetchPurchases', 'fetchShifts',
      'fetchCreditPayments',
      'getReportData', 'getProfitReport',
      'addOrUpdateProduct', 'deleteProduct', 'updateStock',
      'addSale', 'updateSale', 'deleteSale',
      'addOrUpdateCustomer', 'deleteCustomer',
      'saveDiscount', 'deleteDiscount', 'applyDiscountCode', 'incrementDiscountUsage',
      'addPurchase', 'updatePurchase', 'deletePurchase',
      'addOrUpdateExpense', 'deleteExpense',
      'addOrUpdateSupplier', 'deleteSupplier',
      'addCreditPayment', 'deleteCreditPayment',
      'openShift', 'closeShift',
      'uploadImage',
    ];

    if (!ALLOWED.includes(fn)) {
      output.setContent(JSON.stringify({ error: 'Function not allowed: ' + fn }));
      return output;
    }

    const func = this[fn];
    if (typeof func !== 'function') {
      output.setContent(JSON.stringify({ error: 'Function not found: ' + fn }));
      return output;
    }

    const result = func.apply(this, args);
    output.setContent(JSON.stringify({ result: result }));
  } catch (err) {
    output.setContent(JSON.stringify({ error: err.message || String(err) }));
  }

  return output;
}
