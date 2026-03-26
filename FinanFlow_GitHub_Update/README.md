# Run and deploy your AI Studio app

![GHBanner](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

This contains everything you need to run your app locally.

View your app in AI Studio: [https://ai.studio/apps/drive/1q_RZkL82w6iGYXq9K_ZiaKFnUIvNySgb](https://ai.studio/apps/drive/1q_RZkL82w6iGYXq9K_ZiaKFnUIvNySgb)

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `VITE_GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key (or configure `VITE_GEMINI_API_KEY` in your Vercel project settings).
3. Run the app:
   `npm run dev`

## Deploying to Vercel

1. Create a Vercel project pointing at this repo.
2. Set the environment variable `VITE_GEMINI_API_KEY` in Vercel.
3. Confirm the build command is `npm run build` and the output directory is `dist`.
4. Enable the `Clean URLs` / `Rewrite all routes to /index.html` behavior (this is already configured in `vercel.json`).

## GitHub Actions (CI + Releases)

A GitHub Actions workflow is included at `.github/workflows/ci.yml`.

- **On push to `main`** it runs the web build and uploads `dist/` as a workflow artifact.
- **On GitHub Release publish**, it builds Electron installers for **Linux/Windows/macOS** and uploads them as workflow artifacts.

To publish a new release:

1. Create a GitHub release (tag the commit and publish the release).
2. Wait for the `Build Electron Releases` job to finish.
3. Download the generated installer artifacts from the workflow run.
