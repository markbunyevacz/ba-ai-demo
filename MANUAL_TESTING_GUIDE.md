# 🧪 Manual Testing Guide - XLSX Upload Fix

## 📋 Overview

This guide provides step-by-step instructions for manually testing the "Unexpected end of JSON input" error fix in a web browser.

**Prerequisites:**
- Backend running: `npm run server` (port 5000)
- Frontend running: `npm run dev` (port 3000 or as configured)
- Test files available in `docs/` directory

---

## 🚀 Quick Setup

### Terminal 1: Start Backend
```bash
npm run server
# Output: "🚀 Excel to Jira Ticket Converter server running on port 5000"
```

### Terminal 2: Start Frontend
```bash
npm run dev
# Output will show the frontend URL (usually http://localhost:5000)
```

### Browser
Open your browser to the frontend URL and open Developer Tools (F12)

---

## 🧫 Test Scenario 1: Successful XLSX Upload

### Steps:
1. **Open the application**
   - Go to http://localhost:5000 in your browser
   - You should see the file upload interface

2. **Select a test file**
   - Click the upload area
   - Navigate to `docs/demo_simple.xlsx`
   - Select it

3. **Verify file is shown**
   - ✅ Green checkmark appears
   - ✅ Filename displayed: "demo_simple.xlsx"
   - ✅ File type shown: "Excel fájl"
   - ✅ "Feldolgozás" (Process) button appears

4. **Click Process button**
   - Button should respond to click
   - ProgressBar should animate for 3 seconds
   - Console should show no errors

5. **Verify results**
   - ✅ 3 tickets generated (as per test file)
   - ✅ Tickets displayed in table/list
   - ✅ Each ticket has: ID, Summary, Priority, Assignee
   - ✅ Success modal appears

### Expected Output:
```
MVM-1369: Felhasználói profil megtekintése
MVM-1370: Energiafogyasztás riport generálása...
MVM-1371: [Next ticket]
```

### Console Check (F12 > Console):
```
✅ No errors
✅ No warnings
✅ Network request to /api/upload/document shows 200 status
```

---

## 🧫 Test Scenario 2: Test Multiple Valid Files

### Files to Test:
1. **demo_simple.xlsx** - 3 tickets
2. **demo_normal.xlsx** - 5 tickets
3. **demo_complex.xlsx** - 10 tickets
4. **demo_data.xlsx** - 5 tickets

### Steps for Each File:
1. Upload the file
2. Click Process
3. Verify the expected number of tickets
4. Check console for errors
5. Verify response time is reasonable (< 5 seconds)

### Success Criteria:
- ✅ All files process without errors
- ✅ Correct number of tickets generated
- ✅ No "Unexpected end of JSON input" errors
- ✅ No server crashes

---

## 🧫 Test Scenario 3: Error Handling - Invalid File Type

### Steps:
1. **Create a test text file**
   - Create `test.txt` with any content
   - Save it to `docs/` directory

2. **Attempt to upload**
   - Click upload area
   - Select `test.txt`
   - ⚠️ You might not be able to select it (good!)

3. **Check browser validation** (if the file selector allows .txt)
   - Select it anyway
   - Click Process

4. **Verify error handling**
   - ✅ Error message appears
   - ✅ Error message is in Hungarian
   - ✅ Message says file type is invalid
   - ✅ Message suggests valid file types (.xlsx, .docx)

### Expected Error Message:
```
"Kérjük, válasszon Excel (.xlsx) vagy Word (.docx) fájlt"
```

### Console Check:
```
✅ Error is logged
✅ Network request shows 400 status
✅ Response is valid JSON
✅ No unhandled exceptions
```

---

## 🧫 Test Scenario 4: Stress Test - Rapid Uploads

### Steps:
1. Upload and process a file
2. While processing, immediately upload another file
3. Repeat 3-4 times

### Expected Behavior:
- ✅ Each request queues properly
- ✅ No race condition errors
- ✅ No "Unexpected end of JSON input" errors
- ✅ Each completes independently

### Console Check:
- ✅ Multiple network requests show
- ✅ All have 200 status (success)
- ✅ No errors or warnings

---

## 🧫 Test Scenario 5: Network Error Simulation

### Steps:
1. **Start processing a file**
   - Click Process button

2. **Stop the backend** (optional, for advanced testing)
   - In backend terminal, press Ctrl+C
   - Wait 5 seconds

3. **Watch the UI**
   - ProgressBar might freeze
   - Error should appear
   - ⏱️ Wait max 30 seconds

### Expected Behavior:
- ✅ Error message appears
- ✅ Error indicates server connection issue
- ✅ Error message is actionable
- ✅ No "Unexpected end of JSON input"

### Expected Error Message:
```
"A szerver nem érhető el. Kérjük, ellenőrizze, hogy a backend fut-e..."
```

### Recovery:
1. Restart backend: `npm run server`
2. Try upload again - should work

---

## 🧫 Test Scenario 6: Verify Error Messages

### Check each error message type:

#### Missing Required Column
1. Create XLSX without "User Story" column
2. Upload it
3. **Expected message:**
   ```
   "Missing required column"
   "Could not find 'User Story' column..."
   ```

#### Empty File
1. Create empty XLSX (no data rows)
2. Upload it
3. **Expected message:**
   ```
   "Excel file is empty or has no data rows"
   ```

#### Server Error
1. Stop backend, restart, quickly upload
2. **Expected message:**
   ```
   "A szerver nem érhető el..."
   ```

### Verification:
- ✅ Each error message is clear
- ✅ Messages are in Hungarian
- ✅ Messages are actionable
- ✅ No technical jargon that confuses users

---

## 🔍 Browser Developer Tools Checks

### Network Tab (F12 > Network)
1. Upload a file
2. Look for `/api/upload/document` request
3. Click on it and verify:

**Request:**
```
Method: POST
Status: 200 (for success) or 400 (for errors)
Content-Type: application/json (request)
```

**Response:**
```
Content-Type: application/json (response)
Response preview shows: { "tickets": [...], "source": "document", ... }
Response is valid JSON (not HTML, not empty)
```

### Console Tab (F12 > Console)
1. Upload a file
2. Check console for:
   ```
   ✅ No red errors
   ✅ No yellow warnings (may have some)
   ✅ If errors exist, they should be caught
   ✅ No "Unexpected end of JSON input"
   ```

### Performance Tab (F12 > Performance)
1. Record during upload
2. Check for:
   ```
   ✅ No long-running scripts
   ✅ Memory doesn't grow indefinitely
   ✅ Response time < 5 seconds
   ```

---

## ✅ Checklist for Manual Testing

### Before Testing
- [ ] Backend is running on port 5000
- [ ] Frontend is running on port 3000+ 
- [ ] Browser console is open (F12)
- [ ] Network tab is open
- [ ] Test files exist in `docs/`

### Functionality Tests
- [ ] Test Scenario 1: Successful upload ✅
- [ ] Test Scenario 2: Multiple valid files ✅
- [ ] Test Scenario 3: Invalid file type ✅
- [ ] Test Scenario 4: Rapid uploads ✅
- [ ] Test Scenario 5: Network errors ✅
- [ ] Test Scenario 6: Error messages ✅

### Error Handling
- [ ] No server crashes
- [ ] All errors return JSON
- [ ] Error messages are clear
- [ ] No "Unexpected end of JSON input"

### Performance
- [ ] Upload < 5 seconds
- [ ] Response time acceptable
- [ ] Memory usage stable
- [ ] No memory leaks

### Security
- [ ] Invalid file types rejected
- [ ] No sensitive data in errors
- [ ] File size limits enforced
- [ ] No XSS vulnerabilities

### Browser Compatibility
- [ ] Chrome ✅
- [ ] Firefox ✅
- [ ] Safari ✅
- [ ] Edge ✅

---

## 🐛 Troubleshooting

### Issue: "Cannot GET /"
**Solution:** Make sure frontend is running
```bash
npm run dev
```

### Issue: Connection refused on port 5000
**Solution:** Make sure backend is running
```bash
npm run server
```

### Issue: CORS errors in console
**Solution:** Backend has CORS enabled, should not occur
- Check backend logs
- Verify correct ports

### Issue: Files not uploading
**Solution:** Check file format
- Must be `.xlsx` or `.docx`
- File must be valid (not corrupted)
- File must have correct columns

### Issue: "Unexpected end of JSON input" still appears
**Solution:** 
1. Check backend is running: `curl http://localhost:5000/api/health`
2. Check browser console for detailed error
3. Run automated tests: `node test-xlsx-upload.js`
4. Review server logs

---

## 📊 Testing Report Template

Use this template to document your testing:

```
# Manual Testing Report

Date: ___________
Tester: ___________

## Test Results
- Test Scenario 1: _____ ✅ / ❌
- Test Scenario 2: _____ ✅ / ❌
- Test Scenario 3: _____ ✅ / ❌
- Test Scenario 4: _____ ✅ / ❌
- Test Scenario 5: _____ ✅ / ❌
- Test Scenario 6: _____ ✅ / ❌

## Issues Found
- [ ] Issue 1: _______
- [ ] Issue 2: _______
- [ ] Issue 3: _______

## Browser Tested
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## Performance
- Upload time: ______ seconds
- Memory: ______ MB
- Issues: ______

## Overall Assessment
✅ Ready for production / ❌ Needs fixes

Signature: _________________ Date: __________
```

---

## 📞 Support

If you encounter issues:
1. Check this guide for solutions
2. Run automated tests: `node test-xlsx-upload.js`
3. Check browser console (F12)
4. Check backend logs
5. Review documentation files

---

## 🎯 Success Criteria

✅ **All of the following must be true:**
1. No "Unexpected end of JSON input" errors
2. Valid files upload successfully
3. Invalid files rejected gracefully
4. Error messages are clear
5. No server crashes
6. Performance is acceptable
7. All responses are JSON
8. Backend continues running

**If all criteria are met, the fix is working correctly!**

---

**Happy Testing! 🚀**
