🎨 Artistic Image Converter
A simple web app that transforms your regular photos into artistic images — like pencil sketches, cartoons, and more — right in your browser.

📸 What It Does
Upload an image (JPG or PNG)
The app sends it to a Flask backend
Image is processed using OpenCV
You get back an artistic version to view or download

⚙️ Tech Stack
Frontend: React.js (JavaScript)
Backend: Flask (Python)
Image Processing: OpenCV
Tools Used: VS Code, Node.js, npm

🗂️ Project Structure
artistic-image-converter/
├── backend/    # Flask backend
├── frontend/   # React frontend
└── README.md

🚀 Getting Started
1. Backend Setup (Python)
cd backend
python -m venv venv
venv\Scripts\activate   # On Windows
pip install -r requirements.txt
python app.py

2. Frontend Setup (React)
cd frontend
npm install
npm start
Then open your browser at http://localhost:3000

🧪 Features
Upload any image
Choose from multiple styles (pencil sketch, cartoon, etc.)
View and download the converted image
100% browser-based — no installation required

🙌 Made With
Built using React and Flask, blending creativity with code.
