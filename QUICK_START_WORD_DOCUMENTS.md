# Word Document Parsing - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Start the Application
```bash
cd C:\Users\Admin\.cursor\ba-ai-demo
npm start
```
Opens at:
- Frontend: http://localhost:5173
- Server: http://localhost:3001

### Step 2: Upload Your Document

1. **Open the app** in your browser (http://localhost:5173)
2. **Select a file**: Click the upload area or drag-and-drop
3. **Supported formats**: `.xlsx` (Excel) or `.docx` (Word)
4. **Click "Feldolgozás"** to process

### Step 3: View & Send Tickets

1. **Review generated tickets** with confidence scores
2. **Authenticate with Jira** (optional)
3. **Send to Jira** by clicking "Jira-ba Küldés"

---

## 📝 Prepare Your Word Document

### Recommended Structure

```
# Main Title (becomes ticket summary)

Content describing the requirement or feature...

Must authenticate users with email
Given a user visits the login page
When they enter valid credentials
Then they should be logged in

---

# Second Requirement

Additional requirements...

# Features:
- Feature A
- Feature B
- Feature C
```

### Best Practices

✅ **DO**:
- Use clear headings for section titles
- Include acceptance criteria with BDD keywords (Given, When, Then)
- Use bullet points for requirements
- Keep sections separated by blank lines

❌ **DON'T**:
- Use complex formatting (will be stripped)
- Include images (won't be extracted)
- Mix multiple unrelated topics in one document
- Create very long documents without breaks

---

## 🎯 Features Automatically Extracted

### ✅ Text Content
- All paragraphs and sections
- Bullet lists and numbered lists
- Table contents

### ✅ Acceptance Criteria
Automatically recognized from patterns:
- "Given X, When Y, Then Z" (BDD format)
- "Must/Should/Shall + action"
- "Criteria:" or "Requirement:" labels

### ✅ Metadata
- Ticket priority (defaults to Medium)
- Assignee (defaults to Unassigned)
- Epic (defaults to No Epic)
- Confidence scores for validation

---

## 📊 API Endpoint

### Upload Document
```
POST http://localhost:3001/api/upload/document
```

**Using cURL**:
```bash
curl -X POST http://localhost:3001/api/upload/document \
  -F "file=@your-document.docx"
```

**Response**:
```json
{
  "tickets": [
    {
      "id": "MVM-1001",
      "summary": "Document Title",
      "description": "Full content...",
      "priority": "Medium",
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "_grounding": {
        "validated": true,
        "confidence": 0.85
      }
    }
  ],
  "fileType": "word"
}
```

---

## 🧪 Test with Sample Document

### Sample 1: Simple Feature (save as `test.docx`)
```
User Authentication Feature

Users must be able to log in to the system using email and password.

Given a user is on the login page
When they enter valid credentials
Then they should be logged in
And they should see the dashboard
```

### Sample 2: Multiple Requirements (save as `requirements.docx`)
```
Database Setup

The system must support PostgreSQL database connections.

Must establish connections to PostgreSQL
Should implement connection pooling
Must support SSL connections

---

API Development

RESTful API endpoints must be created.

Must support CRUD operations
Should return JSON responses
Must validate all inputs
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| File not recognized | Check extension is `.docx` |
| Text not extracted | Try a simpler document format |
| Criteria not detected | Use BDD keywords (Given, When, Then) |
| Processing slow | Split large documents |
| Out of memory | Reduce document size |

---

## 📈 Performance Tips

- **Optimal file size**: 1-10 MB
- **Processing time**: ~50-100ms per document
- **Maximum recommended**: 100 MB
- **Large documents**: Split into multiple files

---

## 🔐 Security

✅ **File validation**: Only `.xlsx` and `.docx` allowed
✅ **No file storage**: Processed in memory only
✅ **No code execution**: Plain text extraction only
✅ **Data privacy**: Session-based, no persistence

---

## 📚 Related Documentation

- **Full Guide**: `WORD_DOCUMENT_PARSING_GUIDE.md`
- **Testing**: `WORD_DOCUMENT_TESTING.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY_WORD_PARSING.md`

---

## 💡 Tips & Tricks

### Tip 1: Batch Processing
Upload multiple documents one after another. Each generates its own set of tickets.

### Tip 2: BDD Format
Use Gherkin syntax for better criteria extraction:
```
Given [initial context]
When [action]
Then [expected result]
```

### Tip 3: Custom Metadata
Modify ticket properties after generation:
1. Change priority before sending to Jira
2. Reassign to team members
3. Add additional epic information

### Tip 4: Monitoring
Check `/api/monitoring/metrics` to see:
- Total uploads processed
- Average processing time
- Success rate
- Common errors

---

## ❓ FAQ

**Q: Can I upload both Excel and Word files?**
A: Yes! Use the same upload interface for both.

**Q: Will my existing Excel uploads still work?**
A: Yes! 100% backward compatible.

**Q: How many tickets can be generated from one document?**
A: Depends on content structure. Typically 1-10 per document.

**Q: Can I edit tickets after generation?**
A: Yes, before sending to Jira you can modify any field.

**Q: What happens to my file after upload?**
A: Processed in memory and immediately deleted. No storage on disk.

---

## 🚨 Limitations to Know

⚠️ Very large files (>100MB) may cause memory issues
⚠️ Complex formatting is not preserved
⚠️ Embedded images are not extracted
⚠️ Document sections are treated as one body of text
⚠️ Headers and footers are not extracted

---

## 📞 Support

**Having issues?** Check the following:

1. **Console errors**: Open DevTools → Console
2. **Network requests**: DevTools → Network tab
3. **Server logs**: Check terminal where server is running
4. **Documentation**: Read `WORD_DOCUMENT_PARSING_GUIDE.md`

---

## 🎓 Example Workflows

### Workflow 1: Requirements to Jira
```
1. Write requirements in Word document
2. Upload via interface
3. Review generated tickets
4. Authenticate with Jira
5. Send to Jira with one click
```

### Workflow 2: Batch Processing
```
1. Create multiple requirement documents
2. Upload first document → Generate tickets → Review
3. Upload second document → Generate tickets → Review
4. Batch send all to Jira
```

### Workflow 3: Stakeholder Analysis
```
1. Upload document with business requirements
2. System automatically performs stakeholder analysis
3. Review power/interest matrix
4. Generate engagement recommendations
5. Incorporate stakeholder feedback
```

---

## ✨ Next Steps

1. ✅ Start the server: `npm start`
2. ✅ Open browser: http://localhost:5173
3. ✅ Create a test Word document
4. ✅ Upload and generate tickets
5. ✅ Review results and confidence scores
6. ✅ Send to Jira (optional)

---

**Version**: 1.0.0  
**Last Updated**: October 26, 2025  
**Status**: Production Ready ✅





