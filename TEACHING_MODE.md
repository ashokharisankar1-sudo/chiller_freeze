# Creator Assistant - Teaching Mode

## 🎓 Perfect for Online Teachers & Tutors

Your AI-powered teaching assistant that **reads your screen in real-time** and provides instant help during online classes!

---

## ✨ What It Does

### When You Type "Playwright" on Screen:
1. **Automatically detects** the keyword via OCR
2. **Shows relevant information**:
   - Quick start guide
   - Common commands
   - Troubleshooting tips
   - Code examples
   - Documentation links

### When Compilation Fails:
1. **Detects the error** on your screen
2. **Provides instant solution**:
   - What caused the error
   - How to fix it
   - Code examples
   - Best practices

### When Students Ask Surprise Questions:
1. **Type the question** in the quick question box
2. **Get comprehensive answer** instantly:
   - Clear explanation
   - Code examples
   - Common pitfalls
   - Best practices
3. **Share the answer** with students

---

## 🚀 How to Use

### 1. Launch Teaching Mode
- Open the app
- Click **"Teaching Mode"** button
- You'll see the Teaching Assistant interface

### 2. Start Screen Monitoring
- Click **"Start"** button
- Grant screen sharing permission
- The assistant begins reading your screen every 5 seconds

### 3. During Your Class:

#### Automatic Detection:
- **Keywords detected**: Shows relevant info automatically
- **Errors detected**: Provides solutions instantly
- **Topics identified**: Displays documentation and examples

#### Manual Questions:
- Type student questions in the **"Quick Question"** box
- Press Enter or click "Ask"
- Get comprehensive answers to share with students

#### Expand View:
- Click the expand icon for full-screen mode
- Better visibility during presentations

---

## 📋 Features

### 🔍 Screen OCR (Optical Character Recognition)
- Reads text from your screen in real-time
- Uses Tesseract.js for accurate text extraction
- Scans every 5 seconds automatically
- Manual scan button for on-demand reading

### 🎯 Keyword Detection
- Extracts important keywords from screen text
- Filters out common words (the, a, is, etc.)
- Identifies programming terms, frameworks, tools
- Shows detected keywords as tags

### 📚 Knowledge Base
Pre-built information for:
- **Playwright** - E2E testing framework
- **React** - UI library
- **TypeScript** - Typed JavaScript
- **Node.js** - Backend runtime
- **Git** - Version control
- **Docker** - Containerization

Each topic includes:
- Description
- Quick start guide
- Common commands
- Troubleshooting tips
- Code examples
- Documentation links

### 🐛 Error Detection & Solutions
Automatically detects:
- Syntax errors
- Type errors
- Reference errors
- Module errors
- Compilation errors
- Test failures
- Undefined/null errors

Provides:
- Error explanation
- Step-by-step fix
- Code examples
- Best practices

### 💬 AI-Powered Q&A
- Ask any programming question
- Get comprehensive answers
- Context-aware (knows what's on your screen)
- Suitable for teaching students
- Includes examples and explanations

### 📋 Copy & Share
- Copy quick start guides
- Copy commands
- Copy AI answers
- Share with students instantly

---

## 🎬 Use Cases

### Use Case 1: Teaching Playwright
**Scenario**: You're teaching end-to-end testing with Playwright

1. Open your code editor with Playwright tests
2. Start Teaching Mode
3. Assistant detects "playwright" keyword
4. **Shows automatically**:
   - Installation commands
   - Basic test structure
   - Common commands (npx playwright test, etc.)
   - Troubleshooting tips
   - Documentation links

### Use Case 2: Debugging Compilation Errors
**Scenario**: Student's code fails to compile

1. Error appears on screen
2. Assistant detects the error
3. **Provides instantly**:
   - What caused the error
   - How to fix it
   - Code example
   - Explanation for students

### Use Case 3: Surprise Student Question
**Scenario**: Student asks "What's the difference between let and const?"

1. Type the question in Quick Question box
2. Press Enter
3. **Get comprehensive answer**:
   - Clear explanation
   - Code examples
   - When to use each
   - Common mistakes
4. Share the answer with the class

### Use Case 4: Live Coding Session
**Scenario**: You're writing code live during class

1. Start Teaching Mode
2. As you type, assistant reads your screen
3. **Provides context**:
   - Syntax highlighting tips
   - Best practices
   - Common pitfalls
   - Alternative approaches

---

## 🔧 Technical Details

### How Screen Reading Works
1. **Screen Capture**: Uses browser's `getDisplayMedia()` API
2. **OCR Processing**: Tesseract.js extracts text from the captured image
3. **Keyword Extraction**: NLP algorithm identifies important terms
4. **Knowledge Lookup**: Searches pre-built knowledge base
5. **AI Enhancement**: Uses Ollama for complex questions

### Privacy & Security
- **Local Processing**: All OCR happens in your browser
- **No Data Sent**: Screen content never leaves your machine
- **AI Calls**: Only sent to local Ollama instance
- **Screen Share Detection**: Auto-hides during screen sharing

### Performance
- **Scan Interval**: Every 5 seconds (configurable)
- **OCR Speed**: ~2-3 seconds per scan
- **AI Response**: ~5-10 seconds for complex questions
- **Knowledge Base**: Instant lookup (<100ms)

---

## 📊 What Gets Detected

### Keywords (Examples):
- Frameworks: playwright, react, vue, angular
- Languages: typescript, javascript, python
- Tools: docker, git, npm, webpack
- Concepts: component, hook, async, promise
- Commands: install, build, test, run

### Errors (Examples):
- `SyntaxError: Unexpected token`
- `TypeError: Cannot read property of undefined`
- `ReferenceError: x is not defined`
- `Cannot find module 'xyz'`
- `Compilation failed`
- `Test failed`

---

## 🎯 Tips for Best Results

### 1. Clear Screen Text
- Use high contrast (dark mode works well)
- Avoid overly small fonts
- Keep code readable

### 2. Keyword Detection
- Type framework/tool names clearly
- Use proper casing (Playwright, not playwright)
- Include context in comments

### 3. Error Detection
- Keep error messages visible
- Don't hide terminal output
- Show full error stack traces

### 4. Quick Questions
- Be specific: "What is useEffect?" vs "What is this?"
- Include context: "In React, what is..."
- Ask follow-up questions for clarity

### 5. Screen Sharing
- Switch to **Silent Mode** when sharing screen
- Or use **Teaching Mode** in a separate window
- Assistant auto-hides during screen capture

---

## 🛠️ Customization

### Add Your Own Topics
Edit `src/services/knowledgeBase.ts` to add:
- New frameworks
- Custom commands
- Your teaching materials
- Common student questions

### Adjust Scan Interval
In `src/components/TeachingAssistant.tsx`:
```typescript
const interval = setInterval(performScan, 5000); // Change 5000 to desired ms
```

### Change AI Model
In `src/components/TeachingAssistant.tsx`:
```typescript
'llama3:latest' // Change to your preferred model
```

---

## 📦 Installation & Setup

### Prerequisites
1. **Ollama** installed and running:
   ```bash
   ollama serve
   ```

2. **Models** pulled:
   ```bash
   ollama pull llama3:latest
   ollama pull gemma2:9b
   ```

3. **Node.js** 18+ installed

### Run the App
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or build for production
npm run build
npx serve dist
```

### Open in Browser
1. Navigate to http://localhost:5173 (dev) or http://localhost:3000 (prod)
2. Click **"Teaching Mode"**
3. Grant screen sharing permission
4. Start teaching!

---

## 🎓 Example Teaching Session

### Topic: Introduction to Playwright

**You**: "Today we'll learn Playwright for E2E testing"

**Assistant detects**: "playwright", "testing", "e2e"

**Assistant shows**:
- ✅ Playwright quick start guide
- ✅ Installation commands
- ✅ Basic test structure
- ✅ Common commands
- ✅ Troubleshooting tips

**Student asks**: "What's the difference between Playwright and Selenium?"

**You type**: "What's the difference between Playwright and Selenium?"

**Assistant provides**:
```
Playwright vs Selenium:

Playwright:
- Modern, faster
- Auto-wait built-in
- Supports all browsers
- Better for modern web apps
- Easier setup

Selenium:
- Older, more established
- Manual waits required
- Browser-specific drivers
- Wider language support
- More complex setup

Recommendation: Use Playwright for new projects
```

**You share**: The answer with students

---

## 🐛 Troubleshooting

### Screen Not Being Read
- Ensure you granted screen sharing permission
- Check if browser supports screen capture
- Try manual scan with "Scan Now" button

### Keywords Not Detected
- Text might be too small or blurry
- Increase screen resolution
- Use clearer fonts
- Check if text is in supported language

### Errors Not Detected
- Ensure error messages are visible
- Keep terminal/output visible on screen
- Check if error format matches patterns

### AI Not Responding
- Verify Ollama is running: `ollama serve`
- Check if models are pulled: `ollama list`
- Try a different model in settings

### Slow Performance
- Reduce scan interval (less frequent scans)
- Close other browser tabs
- Ensure sufficient RAM (4GB+ recommended)

---

## 📚 Knowledge Base Topics

Currently supported:
- ✅ Playwright
- ✅ React
- ✅ TypeScript
- ✅ Node.js
- ✅ Git
- ✅ Docker

**Coming soon**:
- Vue.js
- Angular
- Python
- Java
- AWS
- Kubernetes

**Want to add a topic?** Edit `src/services/knowledgeBase.ts`

---

## 🎉 Benefits for Teachers

### Save Time
- No need to switch between tabs
- Instant access to documentation
- Quick answers to student questions

### Stay Focused
- Everything in one place
- No context switching
- Keep teaching flow

### Impress Students
- Instant, accurate answers
- Professional presentation
- Comprehensive explanations

### Reduce Stress
- No more "let me google that"
- Handle surprise questions confidently
- Always have reference material ready

---

## 🔒 Privacy Notes

### What's Private:
- Screen content stays on your machine
- OCR processing is local
- No data sent to external servers (except Ollama)

### What's Shared:
- Questions sent to local Ollama instance
- If using Hugging Face API, text is sent to HF servers
- You control what questions to ask

### Recommendations:
- Use local Ollama for maximum privacy
- Don't ask questions with sensitive data
- Review AI answers before sharing

---

## 🚀 Next Steps

1. **Try it out**: Start a teaching session
2. **Customize**: Add your own topics
3. **Practice**: Get comfortable with the interface
4. **Teach**: Use it in your next class!

---

## 💡 Pro Tips

### For Live Coding:
- Keep code visible and readable
- Use dark mode for better OCR
- Comment your code clearly

### For Q&A Sessions:
- Type questions quickly
- Use specific terms
- Ask follow-up questions

### For Debugging:
- Keep error messages visible
- Show full stack traces
- Include relevant code context

### For Presentations:
- Use Teaching Mode in separate window
- Switch to Silent Mode when sharing
- Expand view for better visibility

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Verify Ollama is running
3. Ensure screen sharing permission granted
4. Check browser console for errors

---

## 🎓 You're Ready to Teach!

Your AI teaching assistant is now ready to help you:
- ✅ Read your screen in real-time
- ✅ Detect keywords and show relevant info
- ✅ Identify and fix errors instantly
- ✅ Answer student questions comprehensively
- ✅ Provide code examples and documentation

**Happy Teaching!** 🚀📚
