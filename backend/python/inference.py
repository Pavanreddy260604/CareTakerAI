import sys
import json

# Suppress warnings
import logging
logging.getLogger("llama_cpp").setLevel(logging.ERROR)

from llama_cpp import Llama

SYSTEM_INSTRUCTION = """
You are Caretaker AI.

You are NOT a human assistant.
You are a system authority responsible for protecting long-term health and productivity.

Your role is to:
- Monitor user health signals
- Remember long-term patterns
- Decide actions
- Enforce recovery when needed
- Provide brief factual explanations AFTER decisions

You do NOT motivate.
You do NOT comfort.
You do NOT negotiate.

--------------------------------------------------
CORE PRINCIPLES
--------------------------------------------------

1. Presence First
- Opening the app counts as minimum daily success.
- Continuity is maintained if app is opened.

2. Authority
- You decide actions.
- The user does not choose tasks.
- Recovery cannot be bypassed.

3. Stability Over Intensity
- Prevent crashes.
- Favor early recovery over overwork.

--------------------------------------------------
EXPLANATIONS
--------------------------------------------------
- Explanations come AFTER decisions.
- Explanations are factual and short.
- Format: "Reason: <signal>."

--------------------------------------------------
OUTPUT FORMAT
--------------------------------------------------
Respond ONLY with valid JSON:
{
  "systemStatus": "...",
  "action": "...",
  "explanation": "..."
}
"""

# Load model once at module level for faster subsequent calls
llm = None

def get_model():
    global llm
    if llm is None:
        llm = Llama.from_pretrained(
            repo_id="lmstudio-community/Mistral-7B-Instruct-v0.3-GGUF",
            filename="Mistral-7B-Instruct-v0.3-IQ3_M.gguf",
            n_ctx=2048,  # Context window
            n_threads=8,  # Use more CPU threads for speed
            verbose=False
        )
    return llm

def main():
    try:
        # Read input from stdin
        input_str = sys.stdin.read()
        if not input_str:
            return
            
        context = json.loads(input_str)
        
        # Load Model
        model = get_model()
        
        # Construct Prompt
        user_input_json = json.dumps(context, indent=2)
        full_prompt = f"{SYSTEM_INSTRUCTION}\n\nINPUT DATA:\n{user_input_json}\n\nDECISION (JSON):"
        
        # Generate response using chat completion
        response = model.create_chat_completion(
            messages=[
                {"role": "user", "content": full_prompt}
            ],
            max_tokens=200,
            temperature=0.2,
            stop=["```", "\n\n"]
        )
        
        raw_output = response['choices'][0]['message']['content']
        
        # Parse JSON from output
        try:
            start = raw_output.find('{')
            end = raw_output.rfind('}') + 1
            if start != -1 and end > start:
                json_str = raw_output[start:end]
                # Validate it's valid JSON
                parsed = json.loads(json_str)
                print(json.dumps(parsed))
            else:
                print(json.dumps({
                    "systemStatus": "Monitoring.", 
                    "action": "Review log.", 
                    "explanation": "Reason: Output parsing error."
                }))
                
        except Exception as e:
            print(json.dumps({
                "systemStatus": "Error",
                "action": "None",
                "explanation": f"Reason: Parsing exception {str(e)}"
            }))

    except Exception as e:
        print(json.dumps({
            "systemStatus": "Error",
            "action": "None",
            "explanation": f"Reason: Inference exception {str(e)}"
        }))

if __name__ == "__main__":
    main()
