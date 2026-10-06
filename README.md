# Lumina AI

1. Install Node.js 18+ from https://nodejs.org
2. Get a free Gemini key at https://aistudio.google.com/apikey
3. Open the `.env` file and paste your key(s) next to the matching provider name (e.g. `VITE_GEMINI_KEY=`)
4. In this folder run:

       npm install
       npm run dev

5. Open the URL printed in the terminal (usually http://localhost:5173)

Without a key the app still runs using a scripted offline engine.
Note: the key is bundled into the frontend, so keep this for local demos and
do not deploy it publicly. A public version needs a small backend that holds the key.
