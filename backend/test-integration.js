const { processHealthData } = require("./src/services/aiService");
const connectDB = require('./src/config/db');
const mongoose = require('mongoose');
require("dotenv").config();

async function testIntegration() {
    await connectDB();

    const context = {
        userName: "TestUser",
        userId: "507f1f77bcf86cd799439011", // Valid dummy ObjectId
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
    try {
        const result = await processHealthData(context);
        console.log("\nRESULT:");
        console.log("System Status:", result.systemStatus);
        console.log("Action:", result.action);
        console.log("Explanation:", result.explanation);
    } catch (error) {
        console.error("Test Error:", error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

testIntegration();
