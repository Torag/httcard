<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2b46f6fc-e01e-434a-932d-ea109501afe8

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Security and Secret Safety

> [!WARNING]
> **Secret Rotation Warning:** If you have previously hardcoded any API keys, database connection strings, or private credentials in the codebase, those values may still persist in your Git history. 
> 
> You must **rotate all previously hardcoded credentials immediately** to prevent unauthorized access.

