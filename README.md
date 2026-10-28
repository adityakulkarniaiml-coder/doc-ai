📄 DocuScan Pro — AI-Powered Document Scanner

DocuScan Pro is a web-based document scanning application that transforms ordinary images into clean, professional digital documents. It combines image processing, Optical Character Recognition (OCR), PDF generation, and Google Gemini AI to make document digitization easier and smarter.

✨ Features

📤 Multiple Image Upload: Upload multiple document images in one session.
✂️ Image Cropping: Crop images to focus on the required document area.
🔄 Image Rotation: Rotate documents to the correct orientation.
🎨 Image Enhancement: Convert images to black and white or retain color.
🧹 Noise Removal: Reduce image noise for improved document readability.
📉 Image Compression: Adjust image size and quality.
📑 PDF Generation: Combine processed images into a downloadable multi-page PDF.
🔍 OCR Text Extraction: Extract text from scanned documents using Tesseract OCR.
🤖 AI Document Summarization: Generate concise document summaries using Google Gemini.
📱 Responsive Interface: Access the application through a modern web interface designed for desktop and mobile screens.
🛠️ Tech Stack
Frontend

React
JavaScript
Vite
CSS
Axios
React Image Crop
Backend

Python
FastAPI
OpenCV
NumPy
Pillow (PIL)
Tesseract OCR
Google Gen AI SDK (google-genai)
⚙️ How It Works
Upload one or more document images.
Crop, rotate, enhance, or compress the images as needed.
Apply image processing using OpenCV.
Extract text from the processed images using Tesseract OCR.
Generate a multi-page PDF containing the processed documents.
Optionally use Google Gemini AI to summarize the extracted text.
Download the PDF and view the AI-generated summary.
🚀 Project Goals
Simplify document digitization.
Improve the readability of photographed documents.
Automate text extraction and document summarization.
Provide an accessible, user-friendly alternative to traditional document scanning workflows.
🔧 Installation and Setup
Prerequisites
Node.js and npm
Python
Tesseract OCR
A Google Gemini API key
1. Clone the repository
git clone https://github.com/YOUR-USERNAME/doc-ai.git
cd doc-ai
2. Set up the backend
Install the Python dependencies listed in requirements.txt, then create a .env file in the backend directory:

GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-3.5-flash
Never commit your real API key to GitHub.

Install dependencies and start FastAPI:

python -m pip install -r requirements.txt
uvicorn main:app --reload
Ensure Tesseract OCR is installed and configured for your environment.

3. Set up the frontend
cd frontend
npm install
Create frontend/.env for local development:

VITE_API_BASE_URL=http://127.0.0.1:8000
Start the React development server:

npm run dev
Open the local URL displayed in your terminal.

🔐 Security Notes
Store API keys in environment variables.
Add .env files to .gitignore.
Never publish API keys, passwords, or other secrets in source code.
Configure CORS and upload limits appropriately before production deployment.
🔮 Future Improvements
Support PDF uploads as input.
Add multilingual OCR.
Improve document edge detection and automatic cropping.
Add user accounts and document history.
Support batch processing and cloud storage.
Improve deployment and mobile usability.
👨‍💻 Author
Developed as a project exploring web development, computer vision, OCR, and generative AI.

📜 License
Choose an appropriate open-source license before distributing the project.
