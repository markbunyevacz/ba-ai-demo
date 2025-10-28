// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInputLink = document.getElementById('fileInputLink');
const uploadBtn = document.getElementById('uploadBtn');
const resultsSection = document.getElementById('resultsSection');
const ticketsContainer = document.getElementById('ticketsContainer');

// State
let selectedFile = null;

// Priority colors mapping
const priorityColors = {
    'Critical': 'priority-critical',
    'High': 'priority-high',
    'Medium': 'priority-medium',
    'Low': 'priority-low'
};

// Initialize the application
function init() {
    setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
    // File input click
    fileInputLink.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop events
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleFileDrop);

    // Upload button click
    uploadBtn.addEventListener('click', handleUpload);
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        validateAndSetFile(file);
    }
}

// Handle drag over
function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

// Handle drag leave
function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
}

// Handle file drop
function handleFileDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');

    const files = event.dataTransfer.files;
    if (files.length > 0) {
        validateAndSetFile(files[0]);
    }
}

// Validate and set selected file
function validateAndSetFile(file) {
    // Check file type
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
    ];
    if (!allowedTypes.includes(file.type)) {
        showError('Csak Excel (.xlsx, .xls) vagy Word (.docx) fájlok tölthetők fel!');
        return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showError('A fájl túl nagy! Maximum 10MB engedélyezett.');
        return;
    }

    selectedFile = file;
    updateUploadArea();
    uploadBtn.disabled = false;
}

// Update upload area with selected file info
function updateUploadArea() {
    if (selectedFile) {
        uploadArea.innerHTML = `
            <div class="upload-content">
                <div class="upload-icon">📎</div>
                <p><strong>${selectedFile.name}</strong> kiválasztva</p>
                <p class="file-size">${formatFileSize(selectedFile.size)}</p>
            </div>
        `;
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Handle upload
async function handleUpload() {
    if (!selectedFile) return;

    // Show loading state
    showLoading();

    try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await fetch('/api/upload/document', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Hiba történt a feltöltés során');
        }

        // Show success and display tickets
        showSuccess(`Sikeresen feldolgozva! ${data.tickets.length} ticket generálva.`);
        displayTickets(data.tickets);

    } catch (error) {
        console.error('Upload error:', error);
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Show loading state
function showLoading() {
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Feldolgozás...';

    // Add loading overlay to upload area
    uploadArea.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Dokumentum feldolgozása...</p>
        </div>
    `;
}

// Hide loading state
function hideLoading() {
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Feltöltés és Feldolgozás';
    updateUploadArea();
}

// Show message (error or success)
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = type;
    messageDiv.textContent = message;

    // Remove existing error/success messages
    removeMessages();

    // Insert before upload area
    uploadArea.parentNode.insertBefore(messageDiv, uploadArea);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

// Show error message
function showError(message) {
    showMessage(message, 'error');
}

// Show success message
function showSuccess(message) {
    showMessage(message, 'success');
}

// Remove existing messages
function removeMessages() {
    const messages = document.querySelectorAll('.error, .success');
    messages.forEach(msg => msg.remove());
}

// Display generated tickets
function displayTickets(tickets) {
    ticketsContainer.innerHTML = '';

    tickets.forEach(ticket => {
        const ticketElement = createTicketElement(ticket);
        ticketsContainer.appendChild(ticketElement);
    });

    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Create ticket element
function createTicketElement(ticket) {
    const ticketDiv = document.createElement('div');
    ticketDiv.className = 'ticket-card';

    const priorityClass = priorityColors[ticket.priority] || 'priority-medium';

    ticketDiv.innerHTML = `
        <div class="ticket-header">
            <div class="ticket-id">${ticket.id}</div>
            <div class="priority-badge ${priorityClass}">${ticket.priority}</div>
        </div>

        <div class="ticket-summary">${ticket.summary}</div>

        <div class="ticket-description">${ticket.description}</div>

        <div class="ticket-meta">
            <div class="ticket-meta-item">
                <span>👤</span>
                <span>${ticket.assignee}</span>
            </div>
            <div class="ticket-meta-item">
                <span>📁</span>
                <span>${ticket.epic}</span>
            </div>
            <div class="ticket-meta-item">
                <span>📅</span>
                <span>${new Date(ticket.createdAt).toLocaleDateString('hu-HU')}</span>
            </div>
        </div>

        ${ticket.acceptanceCriteria && ticket.acceptanceCriteria.length > 0 ?
            `<div class="ticket-acceptance">
                <h4>Elfogadási Kritériumok:</h4>
                <ul>
                    ${ticket.acceptanceCriteria.map(criterion =>
                        `<li>${criterion}</li>`
                    ).join('')}
                </ul>
            </div>` :
            ''
        }
    `;

    return ticketDiv;
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
