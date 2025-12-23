const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyCaw4BDy_iaiQSQ19euR1YTlpkdD3xlR6I`);
        const data = await response.json();

        if (data.models) {
            console.log("ALL MODELS:");
            data.models.forEach(m => {
                const methods = m.supportedGenerationMethods || [];
                console.log(`- ${m.name} | Methods: ${methods.join(", ")}`);
            });
        } else {
            console.log("Error response:", JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("Fetch error:", error.message);
    }
}

listModels();
