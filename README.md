# Smademic
Academic performance, tracked and explained.

## Project Structure
- `frontend/`: React application using Vite
- `backend/`: Python Flask REST API and Machine Learning model

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Setup environment variables: Create a `.env` file referencing `.env.example` (ensure `VITE_API_BASE_URL` is set).
4. Run the development server: `npm run dev`

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```
3. Install dependencies: `pip install -r requirements.txt`
4. Run the Flask server:
   ```bash
   python app.py
   ```

## License
MIT License
