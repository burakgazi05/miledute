const { google } = require('googleapis');

let sheetsClient = null;

function getSheets() {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

const SHEET_ID = () => process.env.GOOGLE_SHEET_ID;
const RANGE = 'Sheet1';

async function appendEmail(email) {
  const sheets = getSheets();
  const now = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID(),
    range: `${RANGE}!A:B`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[email, now]]
    }
  });
}

async function findEmail(email) {
  const rows = await getAllRows();
  const lowerEmail = email.toLowerCase();
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] && rows[i][0].toLowerCase() === lowerEmail) {
      return { rowIndex: i + 2, email: rows[i][0], createdAt: rows[i][1] };
    }
  }
  return null;
}

async function getAllRows() {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: `${RANGE}!A2:B`
  });
  return res.data.values || [];
}

async function getEmails(page, limit, search) {
  let rows = await getAllRows();

  // Her satira index ekle (silme icin gerekli)
  rows = rows.map((row, i) => ({
    email: row[0] || '',
    createdAt: row[1] || '',
    rowIndex: i + 2
  }));

  // Arama filtresi
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(r => r.email.toLowerCase().includes(s));
  }

  // En yeniden eskiye sirala
  rows.reverse();

  const total = rows.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const emails = rows.slice(start, start + limit);

  return { emails, total, page, totalPages };
}

async function deleteEmailByRow(rowIndex) {
  const sheets = getSheets();
  const spreadsheetId = SHEET_ID();

  // Sheet ID'yi al (ilk sheet)
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetId = meta.data.sheets[0].properties.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex
          }
        }
      }]
    }
  });
}

async function deleteEmailsByRows(rowIndexes) {
  const sheets = getSheets();
  const spreadsheetId = SHEET_ID();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetId = meta.data.sheets[0].properties.sheetId;

  // Buyukten kucuge sirala ki index kaymasi olmasin
  const sorted = [...rowIndexes].sort((a, b) => b - a);

  const requests = sorted.map(rowIndex => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex: rowIndex - 1,
        endIndex: rowIndex
      }
    }
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests }
  });
}

async function deleteEmailByAddress(email) {
  const found = await findEmail(email);
  if (!found) return false;
  await deleteEmailByRow(found.rowIndex);
  return true;
}

module.exports = {
  appendEmail,
  findEmail,
  getEmails,
  deleteEmailByRow,
  deleteEmailsByRows,
  deleteEmailByAddress
};
