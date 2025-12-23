const { GoogleGenerativeAI } = require("@google/generative-ai");

const key = "AIzaSyCaw4BDy_iaiQSQ19euR1YTlpkdD3xlR6I";
const genAI = new GoogleGenerativeAI(key);

async function validateKey() {
    const modelsToTry = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-1.0-pro",
        "gemini-2.0-flash-exp",
        "gemini-2.0-flash-lite-preview-02-05"
    ];

    for (const modelName of modelsToTry) {
        console.log(`Checking model: ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say only the word 'WORKING'.");
            const text = result.response.text().trim();
            if (text.includes("WORKING")) {
                console.log(`✅ SUCCESS: Model '${modelName}' is working!`);
                process.exit(0);
            }
        } catch (error) {
            console.log(`❌ FAILED: ${modelName} - ${error.message}`);
            if (error.message.includes("quota")) {
                console.log("   (Rate limited/Quota exceeded)");
            }
        }
    }

    console.log("No common models worked. Listing all available models for this key...");
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        if (data.models) {
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- Potential: ${m.name}`);
                }
            });
        }
    } catch (e) {
        console.error("List failed:", e.message);
    }
}

validateKey();
