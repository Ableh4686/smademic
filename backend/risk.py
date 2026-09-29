from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
import joblib
import numpy as np

risk = Blueprint("risk", __name__)

model    = joblib.load("risk_model.pkl")
features = joblib.load("model_features.pkl")

@risk.route("/api/risk/predict", methods=["POST"])
@jwt_required()
def predict():
    data = request.get_json()

    # Extract features from request
    try:
        input_data = [data.get(f, 0) for f in features]
        input_array = np.array(input_data).reshape(1, -1)

        prediction     = model.predict(input_array)[0]
        probability    = model.predict_proba(input_array)[0]

        return jsonify({
            "prediction"   : "At-Risk" if prediction == 1 else "Safe",
            "confidence"   : round(float(max(probability)) * 100, 2),
            "risk_score"   : round(float(probability[1]) * 100, 2)
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@risk.route("/api/risk/predict-student", methods=["POST"])
@jwt_required()
def predict_student():
    """
    Simplified prediction using SMADEMIC student data
    Maps our fields to the UCI model features
    """
    from app import db

    data       = request.get_json()
    student_id = data.get("student_id")
    subject_id = data.get("subject_id")

    # Get student record
    record = db.student_records.find_one({
        "student_id": student_id,
        "subject_id": subject_id
    })

    if not record:
        return jsonify({"error": "Student record not found"}), 404

    marks      = record.get("marks", {})
    attendance = record.get("attendance", 0)

    # Map SMADEMIC data to UCI features
    coursework_mark = marks.get("Coursework", 0)
    final_mark      = marks.get("Final Exam", 0)
    avg_grade       = (coursework_mark + final_mark) / 2

    # Build feature vector matching UCI dataset columns
    input_data = {
        "Curricular units 1st sem (grade)"    : avg_grade,
        "Curricular units 2nd sem (grade)"    : avg_grade,
        "Curricular units 1st sem (approved)" : 5 if avg_grade >= 50 else 2,
        "Curricular units 2nd sem (approved)" : 5 if avg_grade >= 50 else 2,
        "Curricular units 1st sem (enrolled)" : 6,
        "Curricular units 2nd sem (enrolled)" : 6,
        "Age at enrollment"                   : 20,
        "Admission grade"                     : avg_grade,
        "Previous qualification (grade)"      : avg_grade,
        "Unemployment rate"                   : 10.8,
        "GDP"                                 : 1.74
    }

    input_array = np.array([input_data[f] for f in features]).reshape(1, -1)

    prediction  = model.predict(input_array)[0]
    probability = model.predict_proba(input_array)[0]

    return jsonify({
        "student_id"  : student_id,
        "prediction"  : "At-Risk" if prediction == 1 else "Safe",
        "confidence"  : round(float(max(probability)) * 100, 2),
        "risk_score"  : round(float(probability[1]) * 100, 2),
        "attendance"  : attendance,
        "avg_grade"   : avg_grade
    }), 200