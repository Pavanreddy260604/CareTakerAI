import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyCaw4BDy_iaiQSQ19euR1YTlpkdD3xlR6I");

async function listAndTest() {
    try {
        console.log("Listing available models...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyCaw4BDy_iaiQSQ19euR1YTlpkdD3xlR6I`);
        const data = await response.json();

        if (data.models) {
            const generateModels = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent"));
            console.log("Found models with generateContent support:");
            generateModels.forEach(m => console.log(`- ${m.name}`));

            if (generateModels.length > 0) {
                const modelName = generateModels[0].name.replace("models/", "");
                console.log(`\nTesting model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Write a one-sentence greeting.");
                const text = result.response.text();
                console.log("SUCCESS:", text);
            }
        } else {
            console.error("No models found. Key might be invalid or restricted:", data);
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
}

listAndTest();
