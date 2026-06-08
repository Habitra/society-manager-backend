const puppeteer = require('puppeteer');
const fs = require('fs');

async function runAudit() {
  console.log('Starting Puppeteer UI Audit...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // Step 1: Login
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3001/auth/login', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'ui_login_page.png' });

    console.log('Typing credentials...');
    await page.type('input[name="username"], input[type="text"], input[type="email"]', 'SYS-000001');
    await page.type('input[type="password"]', 'password123');
    await page.screenshot({ path: 'ui_login_filled.png' });

    console.log('Clicking login...');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    console.log('Waiting for dashboard...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(()=>console.log('Navigation timeout, continuing...'));
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'ui_dashboard.png' });

    // Step 2: Navigate to all other pages
    const routes = [
      { name: 'Residents', path: '/community/residents' },
      { name: 'Staff', path: '/community/services' },
      { name: 'Visitors', path: '/community/visitor-logs' },
      { name: 'Towers', path: '/community/towers' },
      { name: 'Units', path: '/community/units' },
      { name: 'Billing', path: '/community/billing' },
      { name: 'Invoices', path: '/community/billing/invoices' },
      { name: 'Maintenance', path: '/community/maintenance-tickets' },
      { name: 'Settings', path: '/community/settings' }
    ];

    for (const route of routes) {
      console.log(`Navigating to ${route.name}...`);
      await page.goto(`http://localhost:3001${route.path}`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 3000)); // give it time to load data
      await page.screenshot({ path: `ui_${route.name.toLowerCase()}.png` });
      console.log(`Captured ${route.name}`);
    }

    // Step 3: Swagger
    console.log('Capturing Swagger...');
    await page.goto('http://localhost:3000/docs', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'ui_swagger.png' });

    console.log('Audit complete.');
  } catch (error) {
    console.error('Error during audit:', error);
  } finally {
    await browser.close();
  }
}

runAudit();
