const { GoogleGenerativeAI } = require("@google/generative-ai");

// Use the reliable @google/generative-ai SDK for API Key auth
const genAI = new GoogleGenerativeAI("AIzaSyCaw4BDy_iaiQSQ19euR1YTlpkdD3xlR6I");

async function main() {
    try {
        // Using a known working model from previous tests
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent("Explain how AI works in a few words.");
        const response = await result.response;
        const text = response.text();

        console.log("--- API RESPONSE ---");
        console.log(text);
        console.log("--------------------");
    } catch (error) {
        console.error("SDK Error:", error.message);
    }
}

main();