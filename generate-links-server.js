const { executablePath } = require('puppeteer');
const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const db = require('./db'); // الاتصال بقاعدة البيانا

const app = express();
app.use(bodyParser.json());

const COOKIES_PATH = path.resolve(__dirname, 'gmail_cookies.json');

// ✅ API من WordPress
app.post('/generate-links', async (req, res) => {
  const { authority_link_target_url, authority_link_description, authority_link_platforms } = req.body;
  console.log('📩 Received link generation request:', req.body);

  const results = {};

  try {
    if (authority_link_platforms.includes('Google Sites')) {
      const link = await createGoogleSite(authority_link_target_url, authority_link_description);
      results.googleSites = link;

      db.query(
        'INSERT INTO generated_links (platform, url, description) VALUES (?, ?, ?)',
        ['Google Sites', link, authority_link_description],
        (err) => {
          if (err) console.error('❌ DB Insert Error:', err);
          else console.log('✅ Link saved to DB');
        }
      );
    }

    return res.json({ success: true, results });
  } catch (e) {
    console.error('❌ Generation error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ✅ Manual GET endpoint
app.get('/run-now', (req, res) => {
  db.query('SELECT * FROM generated_links ORDER BY created_at DESC LIMIT 1', (err, rows) => {
    if (err || !rows.length) return res.status(500).send('No recent data found');
    const latest = rows[0];
    console.log('🚀 Manual Trigger - Last Entry:', latest);
    return res.send('Trigger done ✅');
  });
});

// ✅ Puppeteer Logic
async function createGoogleSite(targetUrl, description) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  if (fs.existsSync(COOKIES_PATH)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH));
    await page.setCookie(...cookies);
    console.log('🍪 Cookies loaded');
  }

  await page.goto('https://sites.google.com/new', { waitUntil: 'networkidle2' });

  if (page.url().includes('accounts.google.com')) {
    console.log('🔐 Login required manually');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 300000 });
    const cookies = await page.cookies();
    fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
    console.log('✅ Cookies saved');
  }

  console.log(`🚧 Placeholder: would now create Google Site with backlink to ${targetUrl}`);

  await browser.close();
  return `https://sites.google.com/.../placeholder-link-to-${encodeURIComponent(targetUrl)}`;
}

// ✅ Auto fetch preview every 60s
setInterval(() => {
  db.query('SELECT * FROM generated_links ORDER BY created_at DESC LIMIT 5', (err, rows) => {
    if (err) return console.error('⛔️ DB fetch error:', err);
    console.log('📦 Latest Generated Links:');
    rows.forEach(link => {
      console.log(`🔗 [${link.platform}] ${link.url}`);
    });
  });
}, 60000);

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Link Generator running on http://localhost:${PORT}`));
