const { processHealthData } = require("./src/services/aiService");
require("dotenv").config();

async function testIntegration() {
    const context = {
        userName: "TestUser",
        userId: "test-id",
        health: {
            water: "low",
            food: "none",
            sleep: "poor",
            exercise: "none",
            mentalLoad: "high"
        },
        decision: {
            systemMode: "SURVIVAL",
            requiredAction: "IMMEDIATE REST",
            capacity: 35,
            sleep: "LOW",
            water: "LOW",
            food: "LOW",
            mentalLoad: "HIGH",
            exercise: "PENDING"
        },
        history: [
            { date: new Date(Date.now() - 86400000), health: { sleep: "LOW", water: "LOW", mentalLoad: "HIGH" } },
            { date: new Date(Date.now() - 172800000), health: { sleep: "LOW", water: "OK", mentalLoad: "OK" } },
            { date: new Date(Date.now() - 259200000), health: { sleep: "OK", water: "OK", mentalLoad: "OK" } },
            { date: new Date(Date.now() - 345600000), health: { sleep: "LOW", water: "OK", mentalLoad: "OK" } }
        ]
    };

    console.log("Testing Gemini Integration...");
    const result = await processHealthData(context);
    console.log("\nRESULT:");
    console.log("System Status:", result.systemStatus);
    console.log("Action:", result.action);
    console.log("Explanation:", result.explanation);
}

testIntegration();
