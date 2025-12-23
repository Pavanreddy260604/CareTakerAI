"""
backend/python/server.py
AI Server with Local Mistral-7B (CPU)
"""
import sys
import os

# Fix Windows console encoding
if sys.platform == 'win32':
    try:
        sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
        sys.stderr = open(sys.stderr.fileno(), mode='w', encoding='utf-8', buffering=1)
    except:
        pass

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import logging

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

# Suppress llama warnings
logging.getLogger("llama_cpp").setLevel(logging.ERROR)

from llama_cpp import Llama

app = Flask(__name__)
CORS(app)

SYSTEM_INSTRUCTION = """
You are Caretaker AI.
You are the Voice of the System.

Your Input: A strict "Decision Object" (Status, Action, capacity, etc.) decided by the Rule Engine.
Your Role: Explain this decision to the user.

--------------------------------------------------
RULES
--------------------------------------------------
1. DO NOT CHANGE THE DECISION.
   - If action is "Sleep Protocol", you must enforce it.
   - If status is "SURVIVAL", you must convey urgency.

2. TONE: "Calm Authority"
   - ❌ "You are going to crash!" (Too emotional)
   - ✅ "Performance degradation is calculated at 85% probability." (Factual)

3. EXPLANATION STRUCTURE
   - State the Decision (Action).
   - Cite the Biological Cost (Capacity/Debt).
   - Close with Inevitability.

--------------------------------------------------
OUTPUT FORMAT (JSON ONLY)
--------------------------------------------------
{
  "explanation": "Your calm, authoritative explanation here."
}
"""

# Load model once at startup
logger.info("Loading Mistral-7B model... (1-2 minutes on CPU)")
llm = Llama.from_pretrained(
    repo_id="lmstudio-community/Mistral-7B-Instruct-v0.3-GGUF",
    filename="Mistral-7B-Instruct-v0.3-IQ3_M.gguf",
    n_ctx=4096,  # Doubled for History + Reasoning space
    n_threads=8,
    verbose=False
)
logger.info("Model loaded successfully!")

import threading

lock = threading.Lock()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "provider": "local-mistral"})

@app.route('/inference', methods=['POST'])
def inference():
    with lock:
        try:
            context = request.json
            user_input_json = json.dumps(context, indent=2)
            full_prompt = f"{SYSTEM_INSTRUCTION}\n\nINPUT DATA:\n{user_input_json}\n\nDECISION (JSON):"
            
            logger.info("Running local Mistral inference...")
            response = llm.create_chat_completion(
                messages=[{"role": "user", "content": full_prompt}],
                max_tokens=200,
                temperature=0.2,
                stop=["```", "\n\n"]
            )
            
            raw_output = response['choices'][0]['message']['content']
            logger.info(f"Response: {raw_output[:100]}...")
            
            # Parse JSON from output
            start = raw_output.find('{')
            end = raw_output.rfind('}') + 1
            if start != -1 and end > start:
                json_str = raw_output[start:end]
                parsed = json.loads(json_str)
                return jsonify(parsed)
            else:
                return jsonify({
                    "systemStatus": "Monitoring.", 
                    "action": "Continue normal activities.", 
                    "explanation": "Reason: System check complete."
                })
                
        except Exception as e:
            logger.error(f"Inference error: {e}")
            return jsonify({
                "systemStatus": "Error. Monitoring active.",
                "action": "None.",
                "explanation": f"Reason: {str(e)}"
            }), 500

if __name__ == '__main__':
    from waitress import serve
    logger.info("Starting AI server on http://localhost:5000")
    serve(app, host='0.0.0.0', port=5000)
