# Creator Assistant - PWA for Content Creators

An AI-powered assistant designed for content creators with privacy features and multiple operating modes.

## Features

### Three Operating Modes

1. **Silent Mode** - Background monitoring with minimal UI footprint
   - Shows only a small indicator in the corner
   - Automatically hides content during screen sharing
   - Perfect for live streaming/recording

2. **On Mode** - Full assistant interface
   - Complete chat interface with AI responses
   - Real-time evaluation metrics (BLEU, ROUGE, Semantic Similarity)
   - Model selection and configuration

3. **Off Mode** - Completely hidden
   - No visible UI elements
   - Tiny dot indicator to restore launcher
   - Useful when you need to hide the app quickly

### Privacy Features

- **Screen Share Detection**: Automatically detects when screen sharing is active
- **Content Hiding**: Blanks the screen during screen capture in Silent mode
- **Privacy Notice**: Shows warning when screen sharing is detected in On mode

### AI Integration

- **Ollama Integration**: Uses local AI models (llama3, gemma2, qwen3-coder, whisper)
- **Fallback Chain**: Automatically tries multiple models if primary fails
- **Hugging Face Evaluation**: Every response evaluated with multiple metrics
  - BLEU score (n-gram precision)
  - ROUGE-1/L (recall-oriented overlap)
  - Semantic Similarity (using sentence-transformers)
  - Quality metrics (relevance, coherence, completeness)

### PWA Features

- **Installable**: Install as desktop/mobile app
- **Offline Support**: Service worker for offline functionality
- **Native Feel**: Standalone window, no browser UI

## Installation

### As PWA (Recommended)

1. Build the project:
   ```bash
   npm run build
   ```

2. Serve the `dist` folder:
   ```bash
   npx serve dist
   ```

3. Open in browser (Chrome/Edge recommended):
   - Visit `http://localhost:3000`
   - Click the install icon in the address bar
   - Or: Menu → "Install Creator Assistant"

4. The app will install and can be launched like a native app

### As Desktop App (EXE)

To package as Windows EXE, use Electron or Tauri:

#### Option 1: Electron

1. Install Electron:
   ```bash
   npm install --save-dev electron electron-builder
   ```

2. Create `electron.js`:
   ```javascript
   const { app, BrowserWindow } = require('electron');
   const path = require('path');

   function createWindow() {
     const win = new BrowserWindow({
       width: 1200,
       height: 800,
       webPreferences: {
         nodeIntegration: false,
         contextIsolation: true
       },
       frame: false,
       transparent: true
     });

     win.loadFile('dist/index.html');
   }

   app.whenReady().then(createWindow);

   app.on('window-all-closed', () => {
     if (process.platform !== 'darwin') app.quit();
   });
   ```

3. Add to `package.json`:
   ```json
   {
     "main": "electron.js",
     "scripts": {
       "electron": "electron .",
       "build:win": "electron-builder --win"
     },
     "build": {
       "appId": "com.creator.assistant",
       "win": {
         "target": "nsis"
       }
     }
   }
   ```

4. Build:
   ```bash
   npm run build
   npm run build:win
   ```

#### Option 2: Tauri (Lighter weight)

1. Install Tauri CLI:
   ```bash
   cargo install tauri-cli
   ```

2. Initialize Tauri:
   ```bash
   npx tauri init
   ```

3. Build:
   ```bash
   npm run build
   npx tauri build
   ```

### As Android App (APK)

To package as Android APK:

#### Option 1: Tauri (Recommended)

1. Follow Tauri setup above
2. Install Android dependencies:
   ```bash
   # Install Android Studio and SDK
   # Set ANDROID_HOME environment variable
   ```

3. Build APK:
   ```bash
   npx tauri android init
   npx tauri android build
   ```

#### Option 2: Capacitor

1. Install Capacitor:
   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init
   ```

2. Add Android platform:
   ```bash
   npm install @capacitor/android
   npx cap add android
   ```

3. Sync and build:
   ```bash
   npm run build
   npx cap sync
   npx cap open android
   # Build APK in Android Studio
   ```

## Usage

### Prerequisites

1. **Install Ollama**: https://ollama.ai
2. **Pull models**:
   ```bash
   ollama pull llama3:latest
   ollama pull gemma2:9b
   ollama pull qwen3-coder:30b
   ollama pull karanchopda333/whisper:latest
   ```
3. **Start Ollama**:
   ```bash
   ollama serve
   ```

### Running the App

1. Open the app (from desktop shortcut or browser)
2. Select your mode:
   - **Silent**: For streaming/recording (content hidden during screen share)
   - **On**: Full interface with chat and evaluation
   - **Off**: Completely hidden

3. In On mode:
   - Type your question
   - Get AI response with evaluation metrics
   - Select different models from settings
   - Add HF API key for semantic evaluation (optional)

### Screen Sharing Behavior

- **Silent Mode**: When screen sharing detected, shows only a black screen with tiny dot
- **On Mode**: Shows privacy warning and blocks interaction
- **Off Mode**: Already hidden, no change

## Configuration

### Model Selection

In On mode, click Settings to:
- Select which Ollama model to use
- Add Hugging Face API key for better semantic evaluation

### Evaluation Metrics

Every response is automatically evaluated:
- **BLEU**: N-gram precision (0-1, higher is better)
- **ROUGE-1/L**: Overlap with reference (0-1)
- **Semantic Similarity**: Cosine similarity using embeddings
- **Quality Score**: Combined relevance, coherence, completeness

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Privacy & Ethics

This app is designed for content creators who need:
- AI assistance during recordings without showing it to viewers
- Quick mode switching for different scenarios
- Privacy controls for sensitive content

**Important**: Use responsibly and ethically. Do not use to deceive audiences about the nature of your content.

## Troubleshooting

### Ollama not connecting
- Ensure Ollama is running: `ollama serve`
- Check if models are pulled: `ollama list`
- Verify API is accessible: `curl http://localhost:11434/api/tags`

### PWA not installing
- Use Chrome or Edge browser
- Ensure you're on localhost or HTTPS
- Clear browser cache and try again

### Screen sharing not detected
- Some browsers don't expose screen share status
- Manually switch to Silent mode when streaming

## License

MIT License - Use freely for your content creation needs.

## Support

For issues or questions, please open an issue on the project repository.
