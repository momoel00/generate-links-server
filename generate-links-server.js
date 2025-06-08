const { executablePath } = require('puppeteer');
const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const db = require('./db'); // اتصال MySQL

const app = express();
app.use(bodyParser.json());

const COOKIES_PATH = path.resolve(__dirname, 'gmail_cookies.json');

// ✅ API للاستقبال من WordPress أو أي واجهة
app.post('/generate-links', async (req, res) => {
  const { authority_link_target_url, authority_link_description, authority_link_platforms } = req.body;

  console.log('📩 Received link generation request:', req.body);
  const results = {};

  try {
    if (authority_link_platforms.includes('Google Sites')) {
      const link = await createGoogleSite(authority_link_target_url, authority_link_description);
      results.googleSites = link;

      // ⬇️ حفظ في قاعدة البيانات
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

// ✅ Endpoint إضافي لتشغيل يدوي
app.get('/run-now', (req, res) => {
  db.query('SELECT * FROM generated_links ORDER BY created_at DESC LIMIT 1', (err, rows) => {
    if (err || !rows.length) return res.status(500).send('No recent data found');

    const latest = rows[0];
    console.log('🚀 Manual Trigger - Last Entry:', latest);
    // من هنا ممكن تعاود تنفذ عليه باك لينك
    return res.send('Trigger done ✅');
  });
});

// 🧠 createGoogleSite: placeholder function
async function createGoogleSite(targetUrl, description) {
  const browser = await puppeteer.launch({
  headless: true,
  executablePath: executablePath(), // مهم جداً
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
    console.log('🔐 Manual login required... Please log in in the opened window.');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 300000 });
    const cookies = await page.cookies();
    fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
    console.log('✅ Cookies saved');
  }

  // ❗️ هنا خاصك تزيد الكود باش تنشئ فعلياً Google Site
  console.log(`🚧 Placeholder: would now create Google Site with backlink to ${targetUrl}`);

  await browser.close();
  return `https://sites.google.com/.../placeholder-link-to-${encodeURIComponent(targetUrl)}`;
}

// ⏱ اختيارية: تجلب آخر روابط تلقائياً كل دقيقة
setInterval(() => {
  db.query('SELECT * FROM generated_links ORDER BY created_at DESC LIMIT 5', (err, rows) => {
    if (err) return console.error('⛔️ DB fetch error:', err);
    console.log('📦 Latest Generated Links:');
    rows.forEach(link => {
      console.log(`🔗 [${link.platform}] ${link.url}`);
    });
  });
}, 60000); // كل 60 ثانية

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Link Generator running on http://localhost:${PORT}`));
