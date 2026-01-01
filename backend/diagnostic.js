const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');

// Load Env
dotenv.config();

const COLORS = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(status, message) {
    const color = status === 'OK' ? COLORS.green : status === 'FAIL' ? COLORS.red : COLORS.yellow;
    console.log(`${color}[${status}]${COLORS.reset} ${message}`);
}

async function runDiagnostics() {
    console.log(`${COLORS.bold}\n🔍 STARTING SYSTEM DIAGNOSTICS...${COLORS.reset}\n`);
    let errors = 0;

    // 1. ENV VARIABLES
    console.log(`${COLORS.bold}1. Checking Configuration...${COLORS.reset}`);
    const requiredKeys = ['MONGODB_URI', 'GEMINI_API_KEY', 'SUPERMEMORY_API_KEY'];
    requiredKeys.forEach(key => {
        if (process.env[key]) {
            log('OK', `${key} is set.`);
        } else {
            log('FAIL', `${key} is MISSING!`);
            errors++;
        }
    });

    // 2. DATABASE
    console.log(`\n${COLORS.bold}2. Testing MongoDB Connection...${COLORS.reset}`);
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        log('OK', 'Connected to MongoDB successfully.');

        // Test Read
        const collections = await mongoose.connection.db.listCollections().toArray();
        log('OK', `Read Access Confirmed. Found ${collections.length} collections.`);
    } catch (e) {
        log('FAIL', `MongoDB Connection Error: ${e.message}`);
        errors++;
    }

    // 3. AI SERVICE (Gemini)
    console.log(`\n${COLORS.bold}3. Testing AI Service (Gemini)...${COLORS.reset}`);
    if (process.env.GEMINI_API_KEY) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent("Reply with 'OK'");
            const response = await result.response;
            const text = response.text();
            if (text.includes('OK') || text.length > 0) {
                log('OK', `Gemini API responded: "${text.trim()}"`);
            } else {
                log('WARN', `Gemini response was empty.`);
            }
        } catch (e) {
            log('FAIL', `Gemini API Error: ${e.message}`);
            errors++;
        }
    } else {
        log('SKIP', 'Skipping AI test (No Key)');
    }

    // 4. MEMORY SERVICE (Supermemory)
    console.log(`\n${COLORS.bold}4. Testing Memory Service (Supermemory)...${COLORS.reset}`);
    if (process.env.SUPERMEMORY_API_KEY) {
        // We do a manual fetch request to avoid importing the whole service logic which might be side-effect heavy
        try {
            // Supermemory simple health check or query (using search as ping)
            // Note: If supermemory sdk is used in project, we could use that, but raw fetch tests the key isolation better.
            // Using the project's dependency:
            const Supermemory = require('supermemory').default;
            const client = new Supermemory({ apiKey: process.env.SUPERMEMORY_API_KEY });

            // Just try to query non-existent tag to test auth
            const response = await client.search.documents({ q: 'ping', limit: 1 });
            log('OK', 'Supermemory Auth Valid (Query executed).');

        } catch (e) {
            log('FAIL', `Supermemory Error: ${e.message}`);
            errors++;
        }
    } else {
        log('SKIP', 'Skipping Memory test (No Key)');
    }

    // 5. SUMMARY
    console.log(`\n${COLORS.bold}--- DIAGNOSTIC SUMMARY ---${COLORS.reset}`);
    if (errors === 0) {
        console.log(`${COLORS.green}✅ ALL SYSTEMS GO. No issues found.${COLORS.reset}`);
    } else {
        console.log(`${COLORS.red}❌ FOUND ${errors} ISSUES. Review logs above.${COLORS.reset}`);
    }

    // Cleanup
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
    }
    process.exit(errors > 0 ? 1 : 0);
}

runDiagnostics();
