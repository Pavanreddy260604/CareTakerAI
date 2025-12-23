const { GoogleGenerativeAI } = require("@google/generative-ai");

const key = "AIzaSyCaw4BDy_iaiQSQ19euR1YTlpkdD3xlR6I";
const genAI = new GoogleGenerativeAI(key);

async function finalTest() {
    const models = [
        "gemini-flash-latest",
        "gemini-2.0-flash-exp",
        "gemini-3-flash-preview"
    ];

    for (const m of models) {
        console.log(`\n--- Testing ${m} ---`);
        try {
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("Respond with exactly: Success from " + m);
            const text = result.response.text().trim();
            console.log(`✅ ${m}: ${text}`);
            process.exit(0);
        } catch (err) {
            console.error(`❌ ${m} Error: ${err.message}`);
        }
    }
}

finalTest();
