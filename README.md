# AI Maliati Dost (AI Financial Assistant)

A simple web-based AI assistant for Pakistani users to detect scams and get financial advice in simple Urdu.

## Features
- **Scam Detection:** Analyze suspicious SMS or messages for common Pakistani frauds (BISP, lottery, bank alerts).
- **Financial Advice:** Get simple budgeting and savings tips.
- **Urdu Language Support:** Simple and easy-to-understand Urdu responses.
- **Clean UI:** Minimalist chat interface.

## Prerequisites
- Node.js installed on your machine.
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/).

## Setup Instructions

1. **Clone or Download the project.**
2. **Install Dependencies:**
   Open your terminal in the project folder and run:
   ```bash
   npm install
   ```
3. **Configure API Key:**
   - Create a file named `.env` in the root directory (or rename `.env.example` to `.env`).
   - Add your Gemini API Key:
     ```env
     GEMINI_API_KEY=YOUR_ACTUAL_API_KEY_HERE
     PORT=3000
     ```
4. **Run the Application:**
   ```bash
   npm start
   ```
5. **Access the App:**
   Open your browser and go to: `http://localhost:3000`

## How to use
- **To check a scam:** Type something like: "Mujhe ye message aya hai: 'BISP ki taraf se 25000 nikalwayein' - kya ye sahi hai?"
- **To get advice:** Type something like: "Meri mahana tankhua 40,000 hai, bachat kaise karun?"

## Technologies Used
- **Backend:** Node.js, Express.js
- **AI:** Google Gemini API (`gemini-1.5-flash`)
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
