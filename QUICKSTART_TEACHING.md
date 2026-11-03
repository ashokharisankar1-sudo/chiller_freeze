# 🎓 Quick Start Guide - Teaching Assistant

## Your Use Case: Online Teaching with Real-Time AI Help

You're teaching online and need:
- ✅ Screen reading to understand what you're showing
- ✅ Auto-detect keywords (like "Playwright") and show relevant info
- ✅ Instant help when compilation fails
- ✅ Quick answers for surprise student questions
- ✅ Comprehensive answers to share with students

---

## 🚀 Setup (5 minutes)

### 1. Install & Start Ollama
```bash
# Install Ollama from https://ollama.ai

# Pull required models
ollama pull llama3:latest
ollama pull gemma2:9b

# Start Ollama service
ollama serve
```

### 2. Start the App
```bash
# In H:\playground_3112026
npm install
npm run dev
```

### 3. Open Browser
- Go to: http://localhost:5173
- Click **"Teaching Mode"**

---

## 📺 How to Use During Class

### Scenario 1: Teaching Playwright

**What you do:**
1. Open your code editor with Playwright code
2. Start Teaching Mode
3. Click "Start" button
4. Grant screen sharing permission

**What happens automatically:**
- Assistant reads your screen every 5 seconds
- Detects "playwright" keyword
- Shows:
  - ✅ Quick start guide
  - ✅ Installation commands
  - ✅ Basic test structure
  - ✅ Common commands (npx playwright test, etc.)
  - ✅ Troubleshooting tips
  - ✅ Documentation links

**You can:**
- Point to the info and explain to students
- Copy commands to terminal
- Share documentation links

---

### Scenario 2: Compilation Error

**What happens:**
1. Student's code fails to compile
2. Error appears on screen
3. Assistant detects the error automatically
4. Shows:
  - ✅ What caused the error
  - ✅ How to fix it
  - ✅ Code example
  - ✅ Explanation for students

**You can:**
- Read the solution aloud
- Copy the fix to help student
- Explain the concept to class

---

### Scenario 3: Surprise Student Question

**Student asks:** "What's the difference between let and const?"

**What you do:**
1. Type in "Quick Question" box: `What's the difference between let and const?`
2. Press Enter

**What you get:**
```
Comprehensive answer including:
- Clear explanation
- Code examples
- When to use each
- Common mistakes
- Best practices
```

**You can:**
- Read the answer to students
- Copy and share in chat
- Use as teaching material

---

## 🎯 Key Features

### 🔍 Screen Reading (OCR)
- Reads your screen automatically
- Detects text, code, errors
- Works with any application
- Updates every 5 seconds

### 🎯 Keyword Detection
- Identifies important terms
- Filters out common words
- Shows relevant info automatically
- Examples: playwright, react, typescript, docker, git

### 📚 Knowledge Base
Pre-built info for:
- Playwright (testing)
- React (UI library)
- TypeScript (types)
- Node.js (backend)
- Git (version control)
- Docker (containers)

Each includes:
- Quick start
- Commands
- Troubleshooting
- Examples
- Documentation

### 🐛 Error Detection
Automatically finds:
- Syntax errors
- Type errors
- Module errors
- Compilation failures
- Test failures

Provides:
- Error explanation
- Fix instructions
- Code examples
- Best practices

### 💬 AI Q&A
- Ask any programming question
- Get comprehensive answers
- Context-aware (knows your screen)
- Perfect for teaching
- Includes examples

---

## 💡 Pro Tips

### For Best OCR Results:
- Use dark mode (better contrast)
- Keep text readable (not too small)
- Avoid blurry screens
- Use monospace fonts for code

### For Keyword Detection:
- Type framework names clearly
- Use proper casing
- Include context in comments
- Be specific (e.g., "Playwright test" not just "test")

### For Error Detection:
- Keep error messages visible
- Don't hide terminal output
- Show full stack traces
- Keep errors on screen for a few seconds

### For Q&A:
- Be specific in questions
- Include context ("In React, what is...")
- Ask follow-up questions
- Use the answers as teaching material

---

## 🎬 Example Teaching Session

### Topic: "Introduction to Playwright"

**Step 1: Start Teaching Mode**
- Click "Teaching Mode"
- Click "Start"
- Grant screen permission

**Step 2: Show Playwright Code**
- Open your Playwright test file
- Assistant detects "playwright" keyword
- Shows relevant info automatically

**Step 3: Explain to Students**
- Point to Quick Start section
- Show common commands
- Explain troubleshooting tips

**Step 4: Student Question**
- Student: "How do I wait for an element?"
- You type: "How to wait for element in Playwright?"
- Assistant provides comprehensive answer with examples

**Step 5: Share Answer**
- Read answer to class
- Copy code examples
- Show documentation links

**Step 6: Live Coding**
- Start writing a test
- Assistant reads your screen
- Provides context and tips
- Detects any errors instantly

---

## 📊 What Gets Detected

### Keywords (Examples):
```
✅ playwright, react, typescript
✅ docker, git, npm, webpack
✅ component, hook, async, promise
✅ install, build, test, run
```

### Errors (Examples):
```
✅ SyntaxError: Unexpected token
✅ TypeError: Cannot read property
✅ ReferenceError: x is not defined
✅ Cannot find module 'xyz'
✅ Compilation failed
✅ Test failed
```

---

## 🔧 Customization

### Add Your Own Topics
Edit `src/services/knowledgeBase.ts`:

```typescript
this.knowledgeBase.set('your-topic', {
  topic: 'Your Topic',
  keywords: ['keyword1', 'keyword2'],
  description: 'Description here',
  quickStart: `Code example`,
  commonCommands: ['command 1', 'command 2'],
  troubleshooting: ['tip 1', 'tip 2'],
  resources: ['https://...'],
  examples: ['example 1']
});
```

### Adjust Scan Speed
In `src/components/TeachingAssistant.tsx`:
```typescript
const interval = setInterval(performScan, 5000); // Change to 3000 for faster
```

---

## 🐛 Troubleshooting

### Screen Not Being Read
- Check browser permission
- Try manual "Scan Now" button
- Ensure screen is not blank

### Keywords Not Detected
- Make text larger/clearer
- Use high contrast
- Check if text is in English

### Errors Not Detected
- Keep error visible on screen
- Show full error message
- Wait a few seconds for scan

### AI Not Responding
- Verify Ollama is running: `ollama serve`
- Check models: `ollama list`
- Try different model in code

---

## 📱 During Screen Sharing

### Option 1: Use Silent Mode
- Switch to "Silent Mode" when sharing
- Assistant runs in background
- No UI visible to students

### Option 2: Separate Window
- Use Teaching Mode in separate window
- Share only your code editor
- Keep assistant on your screen only

### Option 3: Auto-Hide
- Assistant detects screen sharing
- Automatically hides content
- Shows minimal indicator only

---

## 🎓 Benefits

### Save Time
- No tab switching
- Instant documentation
- Quick answers

### Stay Focused
- Everything in one place
- No context switching
- Maintain teaching flow

### Impress Students
- Instant accurate answers
- Professional presentation
- Comprehensive explanations

### Reduce Stress
- Handle surprise questions
- Always have references
- Debug errors instantly

---

## 🚀 You're Ready!

Your teaching assistant is now set up to:
- ✅ Read your screen in real-time
- ✅ Detect keywords automatically
- ✅ Show relevant information
- ✅ Fix errors instantly
- ✅ Answer student questions
- ✅ Provide comprehensive explanations

**Start your next class with confidence!** 🎉

---

## 📞 Quick Commands

```bash
# Start Ollama
ollama serve

# Start app
npm run dev

# Build for production
npm run build

# Serve production build
npx serve dist
```

---

## 📚 Documentation

- **TEACHING_MODE.md** - Detailed teaching mode guide
- **README.md** - General app documentation
- **PACKAGING.md** - How to build EXE/APK
- **BUILD_SUMMARY.md** - Complete build guide

---

**Happy Teaching!** 🎓🚀
