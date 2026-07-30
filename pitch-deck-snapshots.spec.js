import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

const PLAYER_EMAIL = "trustno1.entertainment@gmail.com"; 
const PASS = "TestPass123!";
const APP_URL = 'http://localhost:4173'; // Vite preview default port

const OUT_DIR = path.resolve('pitch-deck', 'assets', 'screenshots');

const viewports = [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'mobile', width: 390, height: 844 }, // iPhone size
];

const views = [
    { id: 'feed', action: async (page) => {
        await page.evaluate(() => window.location.hash = 'home');
        await page.waitForTimeout(2000);
    } },
    { id: 'profile', action: async (page) => {
        await page.evaluate(() => window.location.hash = 'profile');
        await page.waitForTimeout(2000);
    } },
    { id: 'inbox', action: async (page) => {
        await page.evaluate(() => window.location.hash = 'inbox');
        await page.waitForTimeout(2000);
    } },
    { id: 'search', action: async (page) => {
        await page.evaluate(() => window.location.hash = 'search');
        await page.waitForTimeout(2000);
    } },
];

for (const vp of viewports) {
    test(`Capture screenshots for ${vp.name}`, async ({ browser }) => {
        // Create context with specific viewport
        const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            deviceScaleFactor: 2, // High resolution
        });
        
        const page = await context.newPage();
        
        console.log(`[${vp.name}] Loading app at /founder-access...`);
        await page.goto(APP_URL + '/founder-access');
        
        // Wait for initial render
        await page.waitForTimeout(2000);
        
        // Try to login
        try {
            console.log(`[${vp.name}] Attempting login...`);
            await page.fill('input[placeholder="E-Mail oder Username"]', PLAYER_EMAIL);
            await page.fill('input[type="password"]', PASS);
            // Press Enter to submit the form
            await page.keyboard.press('Enter');
            
            // Wait for bottom nav to indicate successful login
            await page.waitForSelector('nav > button, .lucide-home, .lucide-search', { timeout: 10000 });
            console.log(`[${vp.name}] Login successful!`);
            await page.waitForTimeout(3000); // Give feed time to render
        } catch (e) {
            console.log(`[${vp.name}] Login failed or already logged in:`, e.message);
            // Take a debug screenshot if login fails
            await page.screenshot({ path: path.join(OUT_DIR, `debug_${vp.name}_failed_login.png`) });
        }

        // Hide scrollbars for clean screenshots
        await page.addStyleTag({
            content: `
                ::-webkit-scrollbar { display: none !important; }
                * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
            `
        });
        
        // Create output dir if it doesn't exist
        if (!fs.existsSync(OUT_DIR)) {
            fs.mkdirSync(OUT_DIR, { recursive: true });
        }

        for (const view of views) {
            console.log(`[${vp.name}] Navigating to ${view.id}...`);
            await view.action(page);
            
            // Wait for loaders to disappear if any
            try {
                await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 5000 });
            } catch (e) {}

            // Extra wait to ensure all images and micro-animations settle
            await page.waitForTimeout(2000);

            const filePath = path.join(OUT_DIR, `${view.id}_${vp.name}.png`);
            await page.screenshot({ path: filePath, fullPage: false });
            console.log(`[${vp.name}] Saved ${filePath}`);
        }
        
        await context.close();
    });
}
