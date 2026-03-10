# File Upload Feature Guide

CoolBoi_2007 v3 now supports intelligent file analysis! Upload logs, code files, configuration files, and more for AI-powered analysis.

## 🎯 Features

### Supported File Types

The file upload feature supports the following file types:

#### **Log Files** (.log, .logs, .error, .trace, .stacktrace)
- Analyzes errors and warnings
- Identifies error patterns and causes
- Suggests solutions and troubleshooting steps
- Flags repeated issues

#### **Code Files** (.py, .js, .ts, .jsx, .tsx, .java, .cpp, .c, .go, .rs, .rb, .php, .sql)
- Code structure and logic review
- Bug and issue identification
- Performance and readability improvements
- Security vulnerability detection
- Best practice recommendations

#### **Configuration Files** (.json, .yaml, .yml, .xml, .ini, .conf, .config, .env)
- Setting explanations
- Misconfiguration detection
- Optimal configuration suggestions
- Security configuration review
- Missing configuration identification

#### **Data Files** (.csv)
- Data structure description
- Anomaly and outlier detection
- Basic statistics and patterns
- Data quality issues
- Inconsistency flagging

#### **Text/Documentation** (.md, .txt)
- Content summarization
- Key point identification
- Clarity and organization improvements
- Action items extraction

### File Constraints

- **Maximum file size**: 10 MB
- **Supported encoding**: UTF-8 (with fallback for other encodings)
- **File must not be empty**

## 🚀 How to Use

### Upload a File

1. Click the **📁 Upload** button in the chat input area
2. Select a file from your computer
3. Wait for CoolBoi to analyze the file
4. Review the analysis in the chat

### What Happens

1. **Validation**: File type and size are checked client-side
2. **Upload**: File is sent to the backend server
3. **Detection**: The backend detects the file type
4. **Analysis**: Specialized AI prompt is generated based on file type
5. **Response**: AI provides targeted analysis and recommendations

## 📝 Use Cases

### 🐛 Debugging Error Logs
```
Upload an error log to get:
- Root cause analysis
- Stack trace interpretation
- Suggested fixes
- Prevention strategies
```

### 💻 Code Review
```
Upload a code file to get:
- Bug detection
- Code quality assessment
- Performance optimization tips
- Security review
```

### ⚙️ Configuration Issues
```
Upload a config file to get:
- Configuration explanation
- Current vs recommended settings
- Missing configurations
- Security recommendations
```

### 📊 Data Analysis
```
Upload a CSV file to get:
- Data structure overview
- Anomaly detection
- Statistical insights
- Data quality assessment
```

## 🔧 Technical Details

### Frontend Implementation
- **File validation**: Size and type checking before upload
- **User feedback**: Loading indicator during processing
- **Error handling**: Clear error messages for validation failures
- **Chat integration**: Uploaded files and analyses appear in conversation history

### Backend Implementation
- **File type detection**: Based on file extension
- **Specialized prompts**: Different analysis prompts for different file types
- **Error handling**: Comprehensive validation and error reporting
- **Model**: Uses qwen2.5-coder:7b for analysis

### API Endpoint
```
POST /upload
Content-Type: multipart/form-data

Request:
- file: UploadFile (max 10MB, text-based)

Response:
{
  "response": "Analysis results..."
}
or
{
  "error": "Error description"
}
```

## ⚠️ Limitations

1. **Text files only**: Binary files (images, videos, executables) are not supported
2. **Size limit**: 10MB maximum file size
3. **Content limit**: Very large files may result in truncated analysis
4. **File types**: Only explicitly supported extensions are allowed

## 🔐 Privacy Notes

- Files are processed on your local Ollama instance
- No files are sent to external services
- Chat history (including file analysis) is stored locally

## 📚 Examples

### Example 1: Analyzing an Error Log
```
User uploads: error.log (500 KB)
↓
CoolBoi analyzes and provides:
- "Detected: Database connection timeout in production"
- "Cause: Connection pool exhausted due to connection leak"
- "Solution: Implement connection pooling with proper cleanup"
- "Recommendation: Add connection timeout configuration"
```

### Example 2: Reviewing Python Code
```
User uploads: main.py (2 KB)
↓
CoolBoi analyzes and provides:
- Code structure overview
- Security issue: Missing input validation
- Performance: Suggestion to use list comprehension
- Best practice: Add type hints to functions
```

### Example 3: Configuration Review
```
User uploads: config.json (5 KB)
↓
CoolBoi analyzes and provides:
- Current configuration explanation
- Security issue: Debug mode enabled in production
- Performance: Cache TTL is too low
- Recommendations for optimal settings
```

## 🆘 Troubleshooting

### "File too large" error
- Your file exceeds 10MB
- **Solution**: Split large files into smaller chunks

### "Unsupported file type" error
- File extension is not in the supported list
- **Solution**: Check the file extension, convert if needed

### "File is binary or empty" error
- File appears to be binary or has no readable content
- **Solution**: Ensure you're uploading a valid text file

### "Server error" message
- Backend processing failed
- **Solution**: Try a smaller file or check your connection

## 🎓 Best Practices

1. **Keep files under 5MB** for faster processing
2. **Use clear file names** to help identify content in history
3. **Upload complete files** rather than snippets
4. **Include context** in follow-up questions if needed
5. **Save important analyses** from the chat history

## 🔄 Integration with Chat History

- Uploaded files appear in your chat history
- File analyses are saved with your conversation
- You can reference previous file analyses in follow-up questions
- Each conversation maintains separate file upload history

---

**Last Updated**: March 2026
**CoolBoi_2007 v3** - Your AI Assistant with File Analysis Capabilities
