from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)

@app.get("/")
def home():
    return render_template("index.html")

@app.get("/api/suggest")
def suggest():
    word = request.args.get("word", "").strip()
    if not word or len(word) < 2:
        return jsonify([])
    try:
        response = requests.get(
            "https://api.datamuse.com/sug",
            params={"s": word, "max": 6},
            timeout=3,
        )
        response.raise_for_status()
        words = response.json()
        return jsonify([item["word"] for item in words if item.get("word")][:6])
    except requests.RequestException:
        return jsonify([])

@app.post("/api/correct")
def correct():
    payload = request.get_json(silent=True) or {}
    text = payload.get("text", "")
    language = payload.get("language", "en-US")
    
    if not isinstance(text, str) or not text.strip():
        return jsonify({"error": "Please enter some text to check."}), 400
    
    try:
        # Use LanguageTool Public API (No Java required, instant response)
        response = requests.post(
            "https://api.languagetool.org/v2/check",
            data={
                "text": text,
                "language": language
            },
            timeout=5
        )
        response.raise_for_status()
        data = response.json()
        matches = data.get("matches", [])
        
        # Build corrected text using match offsets
        corrected_chars = list(text)
        changes = []
        
        for match in sorted(matches, key=lambda x: x["offset"], reverse=True):
            offset = match["offset"]
            length = match["length"]
            original = text[offset:offset + length]
            
            replacements = match.get("replacements", [])
            top_replacement = replacements[0]["value"] if replacements else ""
            
            if top_replacement:
                corrected_chars[offset:offset + length] = list(top_replacement)
            
            rule_id = match.get("rule", {}).get("id", "GRAMMAR")
            msg = match.get("message", "Suggested correction")
            
            category = "Grammar"
            rule_lower = rule_id.lower()
            if "spell" in rule_lower or "typokata" in rule_lower:
                category = "Spelling"
            elif "punct" in rule_lower:
                category = "Punctuation"
            elif "style" in rule_lower:
                category = "Style"

            changes.append({
                "original": original,
                "replacement": top_replacement,
                "message": msg,
                "category": category
            })
            
        corrected = "".join(corrected_chars)
        
        # Compute text stats
        words_list = text.split()
        word_count = len(words_list)
        char_count = len(text)
        sentence_count = max(1, text.count('.') + text.count('!') + text.count('?'))
        reading_time = max(1, round(word_count / 200))

        return jsonify({
            "corrected": corrected,
            "changes": changes[::-1], # Reverse back to normal order
            "stats": {
                "words": word_count,
                "characters": char_count,
                "sentences": sentence_count,
                "readingTime": reading_time
            }
        })
    except Exception as e:
        return jsonify({
            "error": "The grammar checking service is temporarily busy. Please try again in a moment."
        }), 503

if __name__ == "__main__":
    app.run(debug=True, port=5000)