# Autocorrect Tool

A beginner-friendly Python project that corrects common English spelling mistakes using the `autocorrect` library and a simple Streamlit web interface.

## Requirements
- Python 3.9 or newer
- Internet access for the initial package installation

## Run on Windows (VS Code or PowerShell)

1. Extract the project ZIP file.
2. Open the extracted `autocorrect_tool_assignment` folder in VS Code.
3. Open Terminal > New Terminal.
4. (Optional but recommended) Create a virtual environment:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

   If PowerShell blocks activation, use Command Prompt instead, or continue without activating the environment.

5. Install dependencies:

   ```powershell
   python -m pip install -r requirements.txt
   ```

6. Start the app:

   ```powershell
   python -m streamlit run app.py
   ```

7. A browser tab should open. Enter a sentence such as `I hav a beautifull gardn.` and click **Correct Text**.

## How it works
1. The user enters English text in the text box.
2. Streamlit sends the text to the Python code.
3. `Speller(lang="en")` checks and corrects likely spelling errors.
4. The app displays the corrected text.

## Limitations
This is a basic spelling-correction demo, not a full grammar checker. It may occasionally change a word incorrectly, especially when the intended meaning depends on context. Review the output before using it.

## Files
- `app.py` — application code
- `requirements.txt` — Python dependencies
- `project_report.md` — short report template
- `demo_script.md` — short demonstration script
