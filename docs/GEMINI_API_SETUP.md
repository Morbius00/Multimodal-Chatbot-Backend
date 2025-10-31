# Google Gemini API Setup Guide

## Problem
Your current Google API key is not working with the Gemini API. You're getting a 404 error when trying to use any Gemini model.

## Solution

### Option 1: Get a Free Gemini API Key (Recommended)

1. **Go to Google AI Studio:**
   - Visit: https://makersuite.google.com/app/apikey
   - Or: https://aistudio.google.com/app/apikey

2. **Sign in with your Google Account**

3. **Create API Key:**
   - Click "Create API Key" button
   - Select "Create API key in new project" (or choose an existing project)
   - Copy the generated API key (starts with `AIza...`)

4. **Update your `.env` file:**
   ```bash
   GOOGLE_GENAI_API_KEY=your_new_api_key_here
   ```

5. **Restart the server:**
   ```bash
   npm run dev
   ```

### Option 2: Enable Gemini API in Google Cloud Console

If you want to use Google Cloud Console:

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/

2. **Create or Select a Project**

3. **Enable the Generative Language API:**
   - Go to: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
   - Click "Enable"

4. **Create API Credentials:**
   - Go to: APIs & Services > Credentials
   - Click "+ CREATE CREDENTIALS" > API key
   - Copy the API key

5. **Update your `.env` file** (same as Option 1)

## Testing Your API Key

Run this test command to verify your API key works:

```bash
node test-gemini-api.js
```

You should see a successful response from Gemini.

## Current Configuration

The system is now configured to use:
- **Model:** `gemini-2.5-flash` (changed from `gemini-2.5-flash`)
- All agents (general, education, finance, medical) use this model

## Free Tier Limits

Google's free tier for Gemini includes:
- 15 requests per minute
- 1 million tokens per minute
- 1,500 requests per day

This should be sufficient for development and testing.

## Troubleshooting

If you still get errors after setting up a new API key:

1. **Check API key format:**
   - Should start with `AIza`
   - Should be 39 characters long

2. **Verify no spaces:**
   - Make sure there are no spaces before/after the API key in `.env`

3. **Restart the server:**
   - Stop the server (Ctrl+C)
   - Run `npm run dev` again

4. **Check API quotas:**
   - Visit: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas

## Current Status

❌ **Not Working:** The current API key `AIzaSyDL-YxJj4noYeGoCgL5GVorTCx_kuTEU04` is failing for all Gemini models.

✅ **Action Required:** Get a new API key from Google AI Studio and update your `.env` file.
