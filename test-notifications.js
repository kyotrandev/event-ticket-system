import puppeteer from 'puppeteer';
import { execSync } from 'child_process';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTest() {
  console.log('Starting E2E Notification Test...');
  
  // Launch two separate browser instances to ensure isolated sessions
  const organizerBrowser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const customerBrowser = await puppeteer.launch({ headless: false, defaultViewport: null });

  try {
    const orgPage = await organizerBrowser.newPage();
    const cusPage = await customerBrowser.newPage();

    console.log('Logging in as Organizer...');
    await orgPage.goto('http://localhost:3000/login');
    await orgPage.type('input[type="email"]', 'organizer@example.com');
    await orgPage.type('input[type="password"]', 'secret');
    await orgPage.click('button[type="submit"]');
    await orgPage.waitForNavigation({ waitUntil: 'networkidle0' });

    console.log('Logging in as Customer...');
    await cusPage.goto('http://localhost:3000/login');
    await cusPage.type('input[type="email"]', 'john.doe@example.com');
    await cusPage.type('input[type="password"]', 'secret');
    await cusPage.click('button[type="submit"]');
    await cusPage.waitForNavigation({ waitUntil: 'networkidle0' });

    console.log('Organizer is creating a new event...');
    await orgPage.goto('http://localhost:3000/organizer/events/create');
    await orgPage.type('input[name="name"]', 'Test Realtime Notification Event');
    await orgPage.type('input[name="location"]', 'Virtual');
    await orgPage.type('input[name="maxTicketsPerOrder"]', '5');
    // Set dates
    await orgPage.evaluate(() => {
      document.querySelector('input[name="startTime"]').value = '2026-12-31T10:00';
      document.querySelector('input[name="endTime"]').value = '2026-12-31T12:00';
    });
    // Upload banner if needed, but it might be optional
    await orgPage.click('button[type="submit"]');
    await delay(3000); // Wait for redirect to event details

    // Now get the event ID from URL
    const url = orgPage.url();
    const eventId = url.split('/').pop();
    console.log('Created event ID:', eventId);

    // Create a ticket type
    await orgPage.click('button:has-text("Add ticket type")').catch(() => {});
    await delay(1000);
    // Find the add ticket dialog and fill it
    // Wait, the UI might require precise selectors, maybe it's easier to use the API directly for setup?
    console.log('To save time, calling the API directly to set up the event fully...');
    
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    // await organizerBrowser.close();
    // await customerBrowser.close();
  }
}

runTest();
