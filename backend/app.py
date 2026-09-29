from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from pymongo import MongoClient
from dotenv import load_dotenv
import bcrypt
import certifi
import os

load_dotenv()

app = Flask(__name__)
CORS(app)
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")

jwt = JWTManager(app)

client = MongoClient(os.getenv("MONGO_URI"), tlsCAFile=certifi.where())
db = client["smademic"]

from academics import academics
app.register_blueprint(academics)

from risk import risk
app.register_blueprint(risk)

from chatbot import chatbot_bp
app.register_blueprint(chatbot_bp)

# ── PING ──────────────────────────────────────────────
@app.route("/api/ping", methods=["GET"])
def ping():
    db.command("ping")
    return jsonify({"message": "Flask is running", "db": "MongoDB connected"})

# ── REGISTER ──────────────────────────────────────────
@app.route("/api/auth/register", methods=["POST"])
def register():
    data     = request.get_json()
    name     = (data.get("name") or "").strip()
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role     = data.get("role")

    if not name:
        return jsonify({"error": "Please enter a name"}), 400
    if not email or "@" not in email:
        return jsonify({"error": "Please enter a valid email address"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if role not in ["admin", "lecturer", "student"]:
        return jsonify({"error": "Role must be admin, lecturer, or student"}), 400

    if role not in ["student", "lecturer"]:
        return jsonify({"error": "Invalid role"}), 400
    if db.users.find_one({"email": email}):
        return jsonify({"error": f"An account with {email} already exists"}), 400

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    db.users.insert_one({
        "name": name,
        "email": email,
        "password": hashed,
        "role": role
    })

    return jsonify({"message": "Account created successfully"}), 201

# ── LOGIN ─────────────────────────────────────────────
@app.route("/api/auth/login", methods=["POST"])
def login():
    data     = request.get_json()
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = db.users.find_one({"email": email})
    if not user:
        return jsonify({"error": "No account found with that email"}), 401

    if not bcrypt.checkpw(password.encode("utf-8"), user["password"]):
        return jsonify({"error": "Incorrect password"}), 401

    token = create_access_token(
        identity=email,
        additional_claims={"role": user["role"], "name": user["name"]}
    )
    return jsonify({
        "token" : token,
        "role"  : user["role"],
        "name"  : user["name"],
        "email" : email
    }), 200

# ── ME ────────────────────────────────────────────────
@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def me():
    identity = get_jwt_identity()
    claims   = get_jwt()
    return jsonify({"email": identity, "role": claims["role"], "name": claims["name"]}), 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)