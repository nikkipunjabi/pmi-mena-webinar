// ============================================================
// PMI UAE Webinar Tracker - Google Apps Script Backend
// Paste this entire file into Extensions → Apps Script
// Deploy as Web App: Execute as Me, Access: Anyone
// ============================================================

const WEBINARS_SHEET = "Webinars";
const TRACKING_SHEET = "Tracking Data";

// ── Sheet Setup ─────────────────────────────────────────────

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground("#5B2C6F")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getWebinarsSheet() {
  return getOrCreateSheet(WEBINARS_SHEET, [
    "id", "title", "targetUrl", "slug", "platforms", "createdAt", "status"
  ]);
}

function getTrackingSheet() {
  return getOrCreateSheet(TRACKING_SHEET, [
    "timestamp", "webinarId", "webinarTitle", "targetUrl",
    "source", "userAgent", "referrer", "language", "screenSize"
  ]);
}

// ── CORS Helper ──────────────────────────────────────────────

function corsResponse(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ── GET Handler ──────────────────────────────────────────────

function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === "get_webinars") {
      return handleGetWebinars();
    }

    if (action === "get_webinar") {
      return handleGetWebinar(e.parameter.id);
    }

    if (action === "get_stats") {
      return handleGetStats();
    }

    return corsResponse({ status: "error", message: "Unknown action" });
  } catch (err) {
    return corsResponse({ status: "error", message: err.toString() });
  }
}

function handleGetWebinars() {
  const sheet = getWebinarsSheet();
  const rows = sheet.getDataRange().getValues();

  if (rows.length <= 1) {
    return corsResponse({ status: "success", webinars: [] });
  }

  const headers = rows[0];
  const webinars = rows.slice(1)
    .filter(row => row[headers.indexOf("status")] === "active")
    .map(row => rowToWebinar(headers, row));

  return corsResponse({ status: "success", webinars });
}

function handleGetWebinar(id) {
  if (!id) {
    return corsResponse({ status: "error", message: "No id provided" });
  }

  const sheet = getWebinarsSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const slugIndex = headers.indexOf("slug");
  const statusIndex = headers.indexOf("status");

  const row = rows.slice(1).find(
    r => r[slugIndex] === id && r[statusIndex] === "active"
  );

  if (!row) {
    return corsResponse({ status: "error", message: "Webinar not found" });
  }

  return corsResponse({ status: "success", webinar: rowToWebinar(headers, row) });
}

function handleGetStats() {
  const webinarsSheet = getWebinarsSheet();
  const trackingSheet = getTrackingSheet();

  const webinarRows = webinarsSheet.getDataRange().getValues();
  const trackingRows = trackingSheet.getDataRange().getValues();

  const totalWebinars = Math.max(0, webinarRows.length - 1);
  const totalClicks = Math.max(0, trackingRows.length - 1);

  return corsResponse({
    status: "success",
    stats: { totalWebinars, totalClicks }
  });
}

// ── POST Handler ─────────────────────────────────────────────

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === "save_webinar") {
      return handleSaveWebinar(data);
    }

    if (action === "delete_webinar") {
      return handleDeleteWebinar(data.id);
    }

    // No action = tracking log
    return handleTrackingLog(data);
  } catch (err) {
    return corsResponse({ status: "error", message: err.toString() });
  }
}

function handleSaveWebinar(data) {
  const sheet = getWebinarsSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const platforms = Array.isArray(data.platforms)
    ? data.platforms.join(",")
    : data.platforms;

  const row = headers.map(h => {
    if (h === "platforms") return platforms;
    if (h === "status") return "active";
    return data[h] !== undefined ? data[h] : "";
  });

  sheet.appendRow(row);

  return corsResponse({ status: "success", message: "Webinar saved" });
}

function handleDeleteWebinar(id) {
  const sheet = getWebinarsSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idIndex = headers.indexOf("id");
  const statusIndex = headers.indexOf("status");

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idIndex]) === String(id)) {
      sheet.getRange(i + 1, statusIndex + 1).setValue("deleted");
      return corsResponse({ status: "success", message: "Webinar deleted" });
    }
  }

  return corsResponse({ status: "error", message: "Webinar not found" });
}

function handleTrackingLog(data) {
  const sheet = getTrackingSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const row = headers.map(h => data[h] !== undefined ? data[h] : "");
  sheet.appendRow(row);

  return corsResponse({ status: "success", message: "Click tracked" });
}

// ── Helpers ──────────────────────────────────────────────────

function rowToWebinar(headers, row) {
  const obj = {};
  headers.forEach((h, i) => { obj[h] = row[i]; });

  // Parse platforms back to array
  if (typeof obj.platforms === "string") {
    obj.platforms = obj.platforms.split(",").map(p => p.trim()).filter(Boolean);
  }

  return obj;
}
