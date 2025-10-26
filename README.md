# Business Analyst AI Demo

A full-stack web application that demonstrates AI-powered business analysis capabilities by processing Excel files and generating structured tickets/tasks.

## Features

- **Excel File Upload**: Drag & drop or browse to upload Excel files (.xlsx, .xls)
- **Intelligent Parsing**: Automatically detects columns and maps them to ticket properties
- **Real-time Processing**: Shows progress while processing files
- **Ticket Generation**: Creates structured tickets with proper categorization
- **Modern UI**: Built with React and styled with Tailwind CSS

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **Backend**: Node.js, Express.js
- **File Processing**: Multer, XLSX
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (v20.13.1 or higher recommended)
- npm or yarn

### Installation

1. Navigate to the project directory:
   ```bash
   cd ba-ai-demo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

1. Start the backend server (in one terminal):
   ```bash
   npm run server
   ```
   The server will start on http://localhost:3001

2. Start the frontend development server (in another terminal):
   ```bash
   npm run dev
   ```
   The frontend will start on http://localhost:3000

3. Open your browser and navigate to http://localhost:3000

## Usage

1. **Upload Excel File**: Drag and drop an Excel file onto the upload area or click to browse
2. **Processing**: Watch the progress bar as the file is processed
3. **View Results**: Once processed, view the generated tickets in a grid layout
4. **Success Modal**: See a summary of how many tickets were generated

## Excel File Format

The application intelligently maps Excel columns to ticket properties. Supported column headers include:

- **Title/Name/Subject**: Ticket title
- **Description/Desc/Details**: Ticket description
- **Type/Category**: Ticket type (bug, feature, enhancement, task)
- **Priority/Urgency**: Priority level (high, medium, low)
- **Status**: Current status
- **Assignee/Owner/Assigned To**: Person responsible
- **Labels/Tags**: Comma-separated labels
- **Created/Date**: Creation date

## API Endpoints

- `POST /api/upload` - Upload and process Excel file
- `GET /api/health` - Health check endpoint

## Project Structure

```
ba-ai-demo/
├── server.js          # Express backend server
├── public/
│   └── demo_data.xlsx # Sample Excel file for testing
├── src/
│   ├── App.jsx       # Main React application
│   ├── main.jsx      # React entry point
│   ├── index.css     # Tailwind CSS imports
│   └── components/
│       ├── FileUpload.jsx    # File upload component
│       ├── ProgressBar.jsx   # Progress indicator
│       ├── TicketCard.jsx    # Individual ticket display
│       └── SuccessModal.jsx  # Success notification
├── package.json      # Dependencies and scripts
└── vite.config.js    # Vite configuration
```

## Development

- Frontend runs on port 3000 with hot reload
- Backend runs on port 3001
- Files are uploaded to an `uploads/` directory (created automatically)
- Uploaded files are cleaned up after processing

## Demo Data

A sample Excel file (`demo_data.xlsx`) is included in the `public/` directory for testing purposes. You can use this to see how the application processes and displays ticket data.

## License

ISC
