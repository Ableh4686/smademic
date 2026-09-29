from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
import google.generativeai as genai
import os

chatbot_bp = Blueprint("chatbot", __name__)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

@chatbot_bp.route("/api/chatbot", methods=["POST"])
@jwt_required()
def chat():
    try:
        from app import db
        from grading import calculate_triple_lock

        student_email = get_jwt_identity()
        data          = request.get_json()
        question      = data.get("question", "")

        if not question:
            return jsonify({"error": "Question is required"}), 400

        records  = list(db.student_records.find({"student_id": student_email}))
        subjects = list(db.subjects.find())

        subject_map = {str(s["_id"]): s for s in subjects}

        summary = []
        for record in records:
            subject_id = record.get("subject_id")
            subject    = subject_map.get(subject_id)
            if not subject:
                continue

            grade = calculate_triple_lock(
                components = subject["components"],
                marks      = record.get("marks", {}),
                attendance = record.get("attendance", 0),
                has_final  = subject.get("has_final", True)
            )

            summary.append({
                "subject"     : subject["name"],
                "code"        : subject["code"],
                "marks"       : record.get("marks", {}),
                "attendance"  : record.get("attendance", 0),
                "total_marks" : grade["total_marks"],
                "status"      : grade["status"],
                "passed"      : grade["passed"],
                "barred"      : grade["barred"],
                "lock1"       : grade["lock1_coursework"],
                "lock2"       : grade["lock2_final_exam"],
                "lock3"       : grade["lock3_aggregate"]
            })

        prompt = f"""
You are SMADEMIC, an academic support chatbot for university students.
You have access to the student's academic data below.
Answer the student's question in a friendly, helpful, and concise way.
Only answer questions related to their academic performance, grades, attendance, and study advice.
If asked something unrelated, politely redirect them to academic topics.

Student Academic Data:
{summary}

Student Question: {question}

Give a clear, friendly response in 2-4 sentences.
"""

        response = model.generate_content(prompt)
        return jsonify({"response": response.text}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Chatbot error: {str(e)}"}), 500