from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId

academics = Blueprint("academics", __name__)

def fix_id(doc):
    doc["_id"] = str(doc["_id"])
    return doc

# ── ADD SUBJECT ───────────────────────────────────────
@academics.route("/api/subjects", methods=["POST"])
@jwt_required()
def add_subject():
    claims = get_jwt()
    if claims["role"] not in ["admin", "lecturer"]:
        return jsonify({"error": "Unauthorized"}), 403

    data       = request.get_json()
    name       = data.get("name")
    code       = data.get("code")
    components = data.get("components", [])
    has_final  = data.get("has_final", True)

    if not all([name, code]):
        return jsonify({"error": "Name and code required"}), 400

    from app import db
    db.subjects.insert_one({
        "name": name,
        "code": code,
        "components": components,
        "has_final": has_final,
        "created_by": get_jwt_identity()
    })

    return jsonify({"message": "Subject added successfully"}), 201

# ── GET ALL SUBJECTS ──────────────────────────────────
@academics.route("/api/subjects", methods=["GET"])
@jwt_required()
def get_subjects():
    from app import db
    subjects = list(db.subjects.find())
    return jsonify([fix_id(s) for s in subjects]), 200

# ── EDIT SUBJECT ───────────────────────────────────────
@academics.route("/api/subjects/<subject_id>", methods=["PUT"])
@jwt_required()
def edit_subject(subject_id):
    claims = get_jwt()
    if claims["role"] != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    from app import db
    db.subjects.update_one(
        {"_id": ObjectId(subject_id)},
        {"$set": {
            "name":       data.get("name"),
            "code":       data.get("code"),
            "components": data.get("components", []),
            "has_final":  data.get("has_final", True),
        }}
    )
    return jsonify({"message": "Subject updated"}), 200

# ── DELETE SUBJECT ─────────────────────────────────────
@academics.route("/api/subjects/<subject_id>", methods=["DELETE"])
@jwt_required()
def delete_subject(subject_id):
    claims = get_jwt()
    if claims["role"] != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    from app import db
    result = db.subjects.delete_one({"_id": ObjectId(subject_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Subject not found"}), 404
    # Also remove all student records for this subject
    db.student_records.delete_many({"subject_id": subject_id})
    return jsonify({"message": "Subject deleted"}), 200

# ── ADD OR UPDATE STUDENT RECORD (upsert) ─────────────
@academics.route("/api/records", methods=["POST"])
@jwt_required()
def add_record():
    claims = get_jwt()
    if claims["role"] not in ["admin", "lecturer"]:
        return jsonify({"error": "Unauthorized"}), 403

    data       = request.get_json()
    student_id = data.get("student_id")
    subject_id = data.get("subject_id")
    marks      = data.get("marks", {})
    attendance = data.get("attendance", 0)

    if not all([student_id, subject_id]):
        return jsonify({"error": "student_id and subject_id required"}), 400

    from app import db

    existing = db.student_records.find_one({
        "student_id": student_id,
        "subject_id": subject_id
    })

    if existing:
        db.student_records.update_one(
            { "_id": existing["_id"] },
            { "$set": { "marks": marks, "attendance": attendance } }
        )
        return jsonify({"message": "Record updated successfully"}), 200
    else:
        db.student_records.insert_one({
            "student_id": student_id,
            "subject_id": subject_id,
            "marks": marks,
            "attendance": attendance
        })
        return jsonify({"message": "Record added successfully"}), 201

# ── GET RECORDS BY STUDENT ────────────────────────────
@academics.route("/api/records/<student_id>", methods=["GET"])
@jwt_required()
def get_records(student_id):
    from app import db
    records = list(db.student_records.find({"student_id": student_id}))
    return jsonify([fix_id(r) for r in records]), 200

# ── GET RECORDS BY SUBJECT (admin/lecturer) ───────────
@academics.route("/api/records/subject/<subject_id>", methods=["GET"])
@jwt_required()
def get_records_by_subject(subject_id):
    claims = get_jwt()
    if claims["role"] not in ["admin", "lecturer"]:
        return jsonify({"error": "Unauthorized"}), 403

    from app import db
    records = list(db.student_records.find({"subject_id": subject_id}))
    return jsonify([fix_id(r) for r in records]), 200

# ── GET ALL RECORDS (admin + lecturer) ────────────────
@academics.route("/api/records", methods=["GET"])
@jwt_required()
def get_all_records():
    claims = get_jwt()
    if claims["role"] not in ["admin", "lecturer"]:
        return jsonify({"error": "Unauthorized"}), 403

    from app import db
    records = list(db.student_records.find())
    return jsonify([fix_id(r) for r in records]), 200

# ── GET ALL USERS (admin + lecturer) ──────────────────
@academics.route("/api/users", methods=["GET"])
@jwt_required()
def get_users():
    claims = get_jwt()
    if claims["role"] not in ["admin", "lecturer"]:
        return jsonify({"error": "Unauthorized"}), 403

    from app import db
    users = list(db.users.find({}, {"password": 0}))
    return jsonify([fix_id(u) for u in users]), 200

# ── DELETE USER (admin only) ──────────────────────────
@academics.route("/api/users/<email>", methods=["DELETE"])
@jwt_required()
def delete_user(email):
    claims = get_jwt()
    if claims["role"] != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    if email == get_jwt_identity():
        return jsonify({"error": "You cannot delete your own account"}), 400

    from app import db
    result = db.users.delete_one({"email": email})
    if result.deleted_count == 0:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"message": "User deleted"}), 200

# ── TRIPLE LOCK GRADING ───────────────────────────────
@academics.route("/api/grade", methods=["POST"])
@jwt_required()
def grade():
    from app import db
    from grading import calculate_triple_lock

    data       = request.get_json()
    student_id = data.get("student_id")
    subject_id = data.get("subject_id")

    subject = db.subjects.find_one({"_id": ObjectId(subject_id)})
    if not subject:
        return jsonify({"error": "Subject not found"}), 404

    record = db.student_records.find_one({
        "student_id": student_id,
        "subject_id": subject_id
    })
    if not record:
        return jsonify({"error": "Student record not found"}), 404

    result = calculate_triple_lock(
        components = subject["components"],
        marks      = record["marks"],
        attendance = record["attendance"],
        has_final  = subject.get("has_final", True)
    )

    return jsonify(result), 200