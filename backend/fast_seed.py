"""
SMADEMIC — Direct, Fast DB Seeder using PyMongo
===============================================
Wipes old subjects, users (except admin), and records.
Seeds:
  - 10 subjects with detailed coursework splits (Tests, Assignments, Projects)
  - 4 lecturers
  - 30 students (each enrolled in 4-6 subjects)
  - ~70% of final exams are left ungraded (not in records) to test target prediction.

Requires no active Flask backend to run. Completes in 1-2 seconds.
"""

import os
import random
import bcrypt
import certifi
from pymongo import MongoClient
from dotenv import load_dotenv

# Load database config
load_dotenv()
mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    print("❌ MONGO_URI not found in .env!")
    exit(1)

print("Connecting to MongoDB Atlas...")
client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
db = client["smademic"]
print("✓ Connected.")

# ── 1. WIPE COLLECTIONS ─────────────────────────────────────────────
print("\nWiping database...")
# Keep the admin account if it exists
admin_user = db.users.find_one({"email": "admin@smademic.com"})

db.users.delete_many({"email": {"$ne": "admin@smademic.com"}})
db.subjects.delete_many({})
db.student_records.delete_many({})
print("✓ Wiped users, subjects, and records.")

if not admin_user:
    print("Seeding admin...")
    admin_pw = bcrypt.hashpw(b"admin123", bcrypt.gensalt())
    db.users.insert_one({
        "name": "Admin",
        "email": "admin@smademic.com",
        "password": admin_pw,
        "role": "admin"
    })
    print("✓ Seeded admin@smademic.com (admin123)")

# ── 2. SEED USERS ───────────────────────────────────────────────────
print("\nSeeding Users...")
LECTURERS = [
    {"name": "Dr. Sarah Lim",    "email": "sarah.lim@smademic.com",    "password": b"lect123", "role": "lecturer"},
    {"name": "Mr. James Tan",    "email": "james.tan@smademic.com",     "password": b"lect123", "role": "lecturer"},
    {"name": "Dr. Priya Singh",  "email": "priya.singh@smademic.com",   "password": b"lect123", "role": "lecturer"},
    {"name": "Ms. Rachel Yap",   "email": "rachel.yap@smademic.com",    "password": b"lect123", "role": "lecturer"},
]

STUDENTS = [
    {"name": "Ahmad Fariz",           "email": "ahmad.fariz@smademic.com"},
    {"name": "Nur Aisyah Rashid",      "email": "aisyah.rashid@smademic.com"},
    {"name": "Kevin Wong Jian Li",     "email": "kevin.wong@smademic.com"},
    {"name": "Priya Nair",             "email": "priya.nair@smademic.com"},
    {"name": "Danish Iskandar",        "email": "danish.iskandar@smademic.com"},
    {"name": "Mei Ling Chong",         "email": "meiling.chong@smademic.com"},
    {"name": "Luqman Hakim",           "email": "luqman.hakim@smademic.com"},
    {"name": "Sofia Tan Wei Lin",      "email": "sofia.tan@smademic.com"},
    {"name": "Rajesh Kumar",           "email": "rajesh.kumar@smademic.com"},
    {"name": "Anita Loh",              "email": "anita.loh@smademic.com"},
    {"name": "Haziq Azman",            "email": "haziq.azman@smademic.com"},
    {"name": "Yee Shan Ong",           "email": "yeeshan.ong@smademic.com"},
    {"name": "Farah Diyana",           "email": "farah.diyana@smademic.com"},
    {"name": "Bryan Lim Zheng Wei",    "email": "bryan.lim@smademic.com"},
    {"name": "Nurul Huda Mohd",        "email": "nurul.huda@smademic.com"},
    {"name": "Azri Zulkifli",          "email": "azri.zulkifli@smademic.com"},
    {"name": "Li Wei Zhang",           "email": "liwei.zhang@smademic.com"},
    {"name": "Siti Nurhaliza",         "email": "siti.nurhaliza@smademic.com"},
    {"name": "Marcus Lee Chun Keat",   "email": "marcus.lee@smademic.com"},
    {"name": "Divya Menon",            "email": "divya.menon@smademic.com"},
    {"name": "Hafizuddin Rosli",       "email": "hafizuddin.rosli@smademic.com"},
    {"name": "Chew Mei Yan",           "email": "chew.meiyan@smademic.com"},
    {"name": "Arif Danial Mazlan",     "email": "arif.danial@smademic.com"},
    {"name": "Kavitha Subramaniam",    "email": "kavitha.sub@smademic.com"},
    {"name": "Zainab Othman",          "email": "zainab.othman@smademic.com"},
    {"name": "Jason Ng Boon Keat",     "email": "jason.ng@smademic.com"},
    {"name": "Rania Syahira",          "email": "rania.syahira@smademic.com"},
    {"name": "Tan Kok Wai",            "email": "tan.kokwai@smademic.com"},
    {"name": "Nabilah Zahra",          "email": "nabilah.zahra@smademic.com"},
    {"name": "Vishal Krishnan",        "email": "vishal.krishnan@smademic.com"},
]

user_docs = []
for u in LECTURERS:
    hashed = bcrypt.hashpw(u["password"], bcrypt.gensalt())
    user_docs.append({
        "name": u["name"],
        "email": u["email"],
        "password": hashed,
        "role": u["role"]
    })

student_pw = bcrypt.hashpw(b"stu123", bcrypt.gensalt())
for s in STUDENTS:
    user_docs.append({
        "name": s["name"],
        "email": s["email"],
        "password": student_pw,
        "role": "student"
    })

db.users.insert_many(user_docs)
print(f"✓ Seeded {len(user_docs)} user accounts.")

# ── 3. SEED SUBJECTS ────────────────────────────────────────────────
print("\nSeeding Subjects...")
SUBJECTS = [
    {
        "name": "Database Systems", "code": "CSC301", "has_final": True,
        "components": [
            {"name": "Test 1", "weight": 10},
            {"name": "Assignment", "weight": 20},
            {"name": "Group Project", "weight": 30},
            {"name": "Final Exam", "weight": 40}
        ]
    },
    {
        "name": "Software Engineering", "code": "CSC302", "has_final": True,
        "components": [
            {"name": "Individual Essay", "weight": 20},
            {"name": "Web Project", "weight": 30},
            {"name": "Final Exam", "weight": 50}
        ]
    },
    {
        "name": "Machine Learning", "code": "CSC401", "has_final": True,
        "components": [
            {"name": "Coding Lab", "weight": 15},
            {"name": "Kaggle Report", "weight": 15},
            {"name": "Mid-term Test", "weight": 30},
            {"name": "Final Exam", "weight": 40}
        ]
    },
    {
        "name": "Data Structures & Algorithms", "code": "CSC201", "has_final": True,
        "components": [
            {"name": "Mini Quiz", "weight": 10},
            {"name": "Practical Lab", "weight": 40},
            {"name": "Final Exam", "weight": 50}
        ]
    },
    {
        "name": "Web App Development", "code": "CSC303", "has_final": True,
        "components": [
            {"name": "Lab Exercise", "weight": 20},
            {"name": "Client Site Project", "weight": 40},
            {"name": "Final Exam", "weight": 40}
        ]
    },
    {
        "name": "Operating Systems", "code": "CSC304", "has_final": True,
        "components": [
            {"name": "Thread Lab", "weight": 25},
            {"name": "Kernel Assignment", "weight": 25},
            {"name": "Final Exam", "weight": 50}
        ]
    },
    {
        "name": "Computer Networks", "code": "CSC305", "has_final": True,
        "components": [
            {"name": "Packet Tracer Prac", "weight": 30},
            {"name": "Wireshark Quiz", "weight": 30},
            {"name": "Final Exam", "weight": 40}
        ]
    },
    {
        "name": "Artificial Intelligence", "code": "CSC402", "has_final": True,
        "components": [
            {"name": "Prolog Assignment", "weight": 20},
            {"name": "Search Project", "weight": 40},
            {"name": "Final Exam", "weight": 40}
        ]
    },
    {
        "name": "Stats for Data Science", "code": "MAT301", "has_final": True,
        "components": [
            {"name": "R Coding Task", "weight": 20},
            {"name": "Midterm Exam", "weight": 20},
            {"name": "Final Exam", "weight": 60}
        ]
    },
    {
        "name": "Project Management", "code": "MGT201", "has_final": False,
        "components": [
            {"name": "Scrum Lab", "weight": 35},
            {"name": "Group Presentation", "weight": 35},
            {"name": "Agile Portfolio", "weight": 30}
        ]
    },
]

subject_ids = db.subjects.insert_many(SUBJECTS).inserted_ids
subjects_list = list(db.subjects.find())
subject_map = {s["code"]: s for s in subjects_list}
print(f"✓ Seeded {len(SUBJECTS)} subjects.")

# ── 4. SEED RECORDS ─────────────────────────────────────────────────
print("\nSeeding student records...")
random.seed(42)

def gen_profile():
    archetype = random.choices(
        ["strong", "average", "weak_coursework", "weak_final", "borderline", "barred"],
        weights=[30, 40, 10, 10, 5, 5]
    )[0]
    
    if archetype == "strong":
        return random.randint(85, 96), random.randint(75, 90), random.randint(72, 94)
    elif archetype == "average":
        return random.randint(76, 88), random.randint(55, 75), random.randint(50, 72)
    elif archetype == "weak_coursework":
        return random.randint(75, 90), random.randint(30, 39), random.randint(60, 80)
    elif archetype == "weak_final":
        return random.randint(76, 90), random.randint(62, 85), random.randint(20, 39)
    elif archetype == "borderline":
        return random.randint(75, 82), random.randint(40, 52), random.randint(40, 50)
    else:  # barred
        return random.randint(50, 72), random.randint(50, 70), random.randint(50, 70)

records = []
for s_info in STUDENTS:
    # Enrolled in 4-6 subjects
    n_subjects = random.randint(4, 6)
    enrolled = random.sample(list(subject_map.keys()), n_subjects)
    
    for code in enrolled:
        subj = subject_map[code]
        att, cw, fin = gen_profile()
        
        # 70% of courses are left mid-semester (Final exam ungraded)
        final_graded = random.random() < 0.30
        
        marks = {}
        for comp in subj["components"]:
            is_final = "final" in comp["name"].lower() or "exam" in comp["name"].lower()
            if is_final:
                if final_graded:
                    marks[comp["name"]] = fin
            else:
                variance = random.randint(-5, 5)
                marks[comp["name"]] = max(0, min(100, cw + variance))
                
        records.append({
            "student_id": s_info["email"],
            "subject_id": str(subj["_id"]),
            "marks": marks,
            "attendance": att
        })

db.student_records.insert_many(records)
print(f"✓ Seeded {len(records)} student enrollment records.")
print("\n✅ Direct seeding completed successfully!")
