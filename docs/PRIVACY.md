# Privacy & Data Processing Policy: AuraVoice (`voice-agent`)

## 1. Core Privacy Commitments
- **Zero Training on User Data**: User transcripts and uploaded documents are strictly utilized for in-session inference and are never persisted or utilized to train external machine learning models.
- **Client-Side Speech Processing**: Web Speech Recognition processes speech audio directly in the user's browser whenever available.
- **Server-Side Secret Hygiene**: API keys (`GEMINI_API_KEY`) remain strictly encapsulated on the server and are never delivered or exposed to browser clients.
- **Session Isolation**: Every user interaction operates in an isolated memory container identified by a non-deterministic UUID session identifier.

## 2. Third-Party Service Disclosures
When utilizing external AI models:
- **Google GenAI API**: Audio transcription (`gemini-3.5-transcribe`), text generation (`gemini-3.8-flash`), and speech synthesis (`gemini-3.8-flash-lite-tts`, `gemini-3.8-flash-tts`) are processed in accordance with Google Cloud enterprise privacy standards.
- **Browser Speech Synthesis**: If fallback TTS is active, audio is synthesized locally using the device's native speech synthesizers without outbound network telemetry.

## 3. Data Deletion
Users can immediately purge their active session memory, conversation history, and uploaded document references by clicking **Reset Context** or deleting individual files directly from the Document Studio interface.
