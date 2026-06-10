const puppeteer = require('puppeteer');
const fs = require('fs');

async function runTests() {
    console.log('Starting UI Acceptance Tests...');
    
    const browser = await puppeteer.launch({ 
        headless: 'new',
        defaultViewport: { width: 1280, height: 800 }
    });
    const page = await browser.newPage();
    
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(`Console Error: ${msg.text()}`);
        }
    });
    page.on('pageerror', error => {
        errors.push(`Page Error: ${error.message}`);
    });
    page.on('requestfailed', request => {
        errors.push(`Network Error: ${request.url()} failed with ${request.failure().errorText}`);
    });

    let successPort = null;
    try {
        await page.goto(`http://localhost:3001/autologin.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('button', { timeout: 15000 });
        successPort = 3001;
        console.log(`Successfully connected on port 3001`);
    } catch (e) {
        console.log(`Failed on port 3001 with error:`, e.message);
        console.log('Current Page Title:', await page.title());
        console.log('Current Page URL:', page.url());
        await page.screenshot({ path: 'connection_error_screenshot.png', fullPage: true });
        console.log('Saved connection_error_screenshot.png');
        console.log('Collected Errors:', errors);
    }
    if (!successPort) throw new Error("Could not connect to Vite server");
    
    console.log('Validating Dashboard Tab...');
    await new Promise(r => setTimeout(r, 2000)); // Give data time to render
    await page.screenshot({ path: 'tab_dashboard.png', fullPage: true });

    // Click Vendor Registry tab
    console.log('Validating Vendor Registry Tab...');
    const tabs = await page.$$('button');
    let registryTab;
    for (let t of tabs) {
        const text = await page.evaluate(el => el.textContent, t);
        if (text.includes('Vendor Registry')) {
            registryTab = t;
            break;
        }
    }
    if (registryTab) {
        await registryTab.click();
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: 'tab_registry.png', fullPage: true });
    }

    // Contracts Tab
    console.log('Validating Contracts Tab...');
    for (let t of tabs) {
        if ((await page.evaluate(el => el.textContent, t)).includes('Contracts')) {
            await t.click();
            await new Promise(r => setTimeout(r, 1000));
            await page.screenshot({ path: 'tab_contracts.png', fullPage: true });
            break;
        }
    }

    // Work Orders Tab
    console.log('Validating Work Orders Tab...');
    for (let t of tabs) {
        if ((await page.evaluate(el => el.textContent, t)).includes('Work Orders')) {
            await t.click();
            await new Promise(r => setTimeout(r, 1000));
            await page.screenshot({ path: 'tab_work_orders.png', fullPage: true });
            break;
        }
    }

    // Compliance Tab
    console.log('Validating Compliance Tab...');
    for (let t of tabs) {
        if ((await page.evaluate(el => el.textContent, t)).includes('Compliance')) {
            await t.click();
            await new Promise(r => setTimeout(r, 1000));
            await page.screenshot({ path: 'tab_compliance.png', fullPage: true });
            break;
        }
    }

    // Performance Tab
    console.log('Validating Performance Tab...');
    for (let t of tabs) {
        if ((await page.evaluate(el => el.textContent, t)).includes('Performance')) {
            await t.click();
            await new Promise(r => setTimeout(r, 1000));
            await page.screenshot({ path: 'tab_performance.png', fullPage: true });
            break;
        }
    }

    // Audit Trail Tab
    console.log('Validating Audit Trail Tab...');
    for (let t of tabs) {
        if ((await page.evaluate(el => el.textContent, t)).includes('Audit Trail')) {
            await t.click();
            await new Promise(r => setTimeout(r, 1000));
            await page.screenshot({ path: 'tab_audit_trail.png', fullPage: true });
            break;
        }
    }

    console.log('Test complete. Closing browser.');
    await browser.close();

    console.log('\n--- ERRORS ---');
    if (errors.length === 0) {
        console.log('No console, page, or network errors detected.');
    } else {
        errors.forEach(e => console.log(e));
    }
}

runTests().catch(console.error);
