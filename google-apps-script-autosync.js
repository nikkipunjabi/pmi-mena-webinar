// ============================================================
// PMI UAE Webinar Tracker - Google Apps Script Backend
// Paste this entire file into Extensions → Apps Script
// Deploy as Web App: Execute as Me, Access: Anyone
// ============================================================

const WEBINARS_SHEET = "Webinars";
const TRACKING_SHEET = "Tracking Data";
const SUMMARY_SHEET  = "Summary";

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
    "id", "title", "targetUrl", "slug", "platforms", "webinarDate", "createdAt", "status"
  ]);
}

function getTrackingSheet() {
  return getOrCreateSheet(TRACKING_SHEET, [
    "timestamp", "webinarId", "webinarTitle", "targetUrl",
    "source", "userAgent", "referrer", "language", "screenSize"
  ]);
}

// ── Summary Sheet ────────────────────────────────────────────
// Rebuilds the Summary sheet whenever a webinar is added or deleted.
// COUNTIFS formulas update click counts live as tracking data arrives.

function rebuildSummarySheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Remove and recreate for a clean rebuild
  const existing = ss.getSheetByName(SUMMARY_SHEET);
  if (existing) ss.deleteSheet(existing);
  const sheet = ss.insertSheet(SUMMARY_SHEET);

  // Move Summary to first position
  ss.setActiveSheet(sheet);
  ss.moveActiveSheet(1);

  const platforms = ["email", "linkedin", "facebook", "instagram", "twitter"];
  // Columns: Webinar | Webinar Date | Date Added | Status | Email | LinkedIn | Facebook | Instagram | Twitter | Total
  const headers = [
    "Webinar", "Webinar Date", "Date Added", "Status",
    ...platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)),
    "Total"
  ];

  // Header row
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground("#5B2C6F")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold");
  sheet.setFrozenRows(1);

  // Load ALL webinars (active + deleted) — never hide from Summary
  const webinarsSheet = getWebinarsSheet();
  const rows = webinarsSheet.getDataRange().getValues();
  if (rows.length <= 1) return;

  const wHeaders = rows[0];
  const slugIndex        = wHeaders.indexOf("slug");
  const titleIndex       = wHeaders.indexOf("title");
  const statusIndex      = wHeaders.indexOf("status");
  const createdAtIndex   = wHeaders.indexOf("createdAt");
  const webinarDateIndex = wHeaders.indexOf("webinarDate");

  const allWebinars = rows.slice(1);
  if (allWebinars.length === 0) return;

  // Sort newest first by createdAt
  allWebinars.sort((a, b) => {
    const dateA = a[createdAtIndex] ? new Date(a[createdAtIndex]) : new Date(0);
    const dateB = b[createdAtIndex] ? new Date(b[createdAtIndex]) : new Date(0);
    return dateB - dateA;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  allWebinars.forEach((webinar, i) => {
    const rowNum = i + 2;
    const slug        = webinar[slugIndex];
    const title       = webinar[titleIndex];
    const sheetStatus = webinar[statusIndex];
    const rawCreated  = webinar[createdAtIndex];
    const rawWebDate  = webinar[webinarDateIndex];

    const dateAdded  = rawCreated ? Utilities.formatDate(new Date(rawCreated), Session.getScriptTimeZone(), "dd MMM yyyy") : "";
    const webinarDate = rawWebDate ? Utilities.formatDate(new Date(rawWebDate + "T00:00:00"), Session.getScriptTimeZone(), "dd MMM yyyy") : "";

    // Determine status: Completed if deleted OR webinar date has passed
    const isCompleted = sheetStatus === "deleted" ||
      (rawWebDate && new Date(rawWebDate + "T00:00:00") < today);
    const displayStatus = isCompleted ? "Completed" : "Active";

    // Col A: title, B: webinar date, C: date added, D: status
    sheet.getRange(rowNum, 1).setValue(title);
    sheet.getRange(rowNum, 2).setValue(webinarDate);
    sheet.getRange(rowNum, 3).setValue(dateAdded);
    sheet.getRange(rowNum, 4).setValue(displayStatus);

    // Cols E–I: COUNTIFS per platform
    platforms.forEach((platform, pi) => {
      const col = pi + 5;
      const formula = `=COUNTIFS('Tracking Data'!B:B,"${slug}",'Tracking Data'!E:E,"${platform}")`;
      sheet.getRange(rowNum, col).setFormula(formula);
    });

    // Col J: Total
    const firstPlatformCol = "E";
    const lastPlatformCol  = String.fromCharCode(64 + 5 + platforms.length - 1); // I
    sheet.getRange(rowNum, platforms.length + 5)
      .setFormula(`=SUM(${firstPlatformCol}${rowNum}:${lastPlatformCol}${rowNum})`);

    // Row styling: grey out completed, white/light for active
    if (isCompleted) {
      sheet.getRange(rowNum, 1, 1, headers.length)
        .setBackground("#F0F0F0")
        .setFontColor("#999999");
    } else if (i % 2 === 0) {
      sheet.getRange(rowNum, 1, 1, headers.length).setBackground("#FFFFFF");
    } else {
      sheet.getRange(rowNum, 1, 1, headers.length).setBackground("#F9F6FC");
    }

    // Status cell colour
    if (isCompleted) {
      sheet.getRange(rowNum, 4).setBackground("#E0E0E0").setFontColor("#888888");
    } else {
      sheet.getRange(rowNum, 4).setBackground("#E8F5E9").setFontColor("#2E7D32").setFontWeight("bold");
    }
  });

  // Bold Total column, center-align date columns and status
  sheet.getRange(2, headers.length, allWebinars.length, 1).setFontWeight("bold");
  sheet.getRange(2, 2, allWebinars.length, 3).setHorizontalAlignment("center");

  // Auto-resize columns
  sheet.autoResizeColumns(1, headers.length);
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
  rebuildSummarySheet();

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
      rebuildSummarySheet();
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
