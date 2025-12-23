const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const genAI = new GoogleGenerativeAI("AIzaSyCaw4BDy_iaiQSQ19euR1YTlpkdD3xlR6I");
  
  try {
    // We can't use the SDK to list models easily without a dedicated method, 
    // but we can use fetch manually.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyCaw4BDy_iaiQSQ19euR1YTlpkdD3xlR6I`);
    const data = await response.json();
    
    if (data.models) {
      console.log("AVAILABLE MODELS:");
      data.models.forEach(m => {
        if (m.supportedGenerationMethods.includes("generateContent")) {
          console.log(`- ${m.name} (${m.displayName})`);
        }
      });
    } else {
      console.log("No models found or error:", data);
    }
  } catch (error) {
    console.error("Error listing models:", error.message);
  }
}

listModels();
