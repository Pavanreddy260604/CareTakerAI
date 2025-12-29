const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { generateDecision } = require('./src/services/rulesService');
const HealthLog = require('./src/models/HealthLog');
const User = require('./src/models/User');

dotenv.config();

const TEST_USER_ID = '507f1f77bcf86cd799439011'; // A valid ObjectId

async function testEdgeCases() {
    console.log("🛠️ Starting Edge Case Tests...");

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ DB Connected");

        // TEST 1: Pattern Recognition (3 Days of Low Sleep)
        console.log("\n🧪 Test 1: Pattern Recognition (Data Logic)");

        // Mock History: Day 1 (Low), Day 2 (Low)
        const mockHistory = [
            { health: { sleep: 'LOW', water: 'OK', food: 'OK', mentalLoad: 'OK' } }, // Yesterday
            { health: { sleep: 'LOW', water: 'OK', food: 'OK', mentalLoad: 'OK' } }  // Day Before
        ];

        // Current Input: Day 3 (Low)
        const currentHealth = { sleep: 'LOW', water: 'OK', food: 'OK', mentalLoad: 'OK' };

        // Run Logic
        const decision = generateDecision(currentHealth, mockHistory, 'CARETAKER');

        if (decision.decision.systemMode === 'LOCKED_RECOVERY') {
            console.log("✅ PASS: Recovery Mode triggered by 3-day sleep deficit pattern.");
        } else {
            console.error("❌ FAIL: Recovery Mode FAILED to trigger. Mode:", decision.decision.systemMode);
            console.log("   Debug Info:", JSON.stringify(decision.decision, null, 2));
        }


        // TEST 2: Schema Validation (Bad Data)
        console.log("\n🧪 Test 2: Schema Validation (Bad Data)");

        try {
            const badLog = new HealthLog({
                userId: TEST_USER_ID,
                health: {
                    water: 'SPLASHY', // Invalid Enum
                    mentalLoad: 'OK'
                }
            });
            await badLog.validate(); // Should throw
            console.error("❌ FAIL: Invalid Enum 'SPLASHY' was accepted!");
        } catch (error) {
            console.log("✅ PASS: Mongoose correctly rejected invalid enum value:", error.message);
        }

        // TEST 3: Null Safety (Empty Object)
        console.log("\n🧪 Test 3: Null Safety (Empty Input)");
        try {
            const safeDecision = generateDecision({}, [], 'CARETAKER');
            if (safeDecision.decision.confidence < 0.8) {
                console.log("✅ PASS: System handled empty input gracefully (Low Confidence: " + safeDecision.decision.confidence + ")");
            } else {
                console.warn("⚠️ WARN: Confidence might be too high for empty input: " + safeDecision.decision.confidence);
            }
        } catch (e) {
            console.error("❌ FAIL: Crash on empty input:", e.message);
        }

    } catch (error) {
        console.error("🔥 FATAL TEST ERROR:", error);
    } finally {
        await mongoose.disconnect();
        console.log("\n🏁 Tests Completed.");
        process.exit(0);
    }
}

testEdgeCases();
