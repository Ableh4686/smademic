"""
SMADEMIC — Detailed Seed Script (Multi-component & Mid-semester Project targets)
=============================================================================
Seeds details of:
  - 10 subjects containing complex coursework splits (e.g. assignments, tests, projects)
  - 4 lecturers
  - 30 students (each enrolled in 4-6 subjects)
  - Simulated mid-semester records: Final exams are omitted in 70% of subjects to show target calculations!

Run: python seed_data.py
(Backend must be running on http://localhost:5000)
"""

import requests
import random

BASE    = "http://localhost:5000"
HEADERS = {}

def login_admin():
    res = requests.post(f"{BASE}/api/auth/login",
                        json={"email": "admin@smademic.com", "password": "admin123"})
    res.raise_for_status()
    token = res.json()["token"]
    HEADERS["Authorization"] = f"Bearer {token}"
    print("✓ Admin logged in")
    return token

LECTURERS = [
    {"name": "Dr. Sarah Lim",    "email": "sarah.lim@smademic.com",    "password": "lect123", "role": "lecturer"},
    {"name": "Mr. James Tan",    "email": "james.tan@smademic.com",     "password": "lect123", "role": "lecturer"},
    {"name": "Dr. Priya Singh",  "email": "priya.singh@smademic.com",   "password": "lect123", "role": "lecturer"},
    {"name": "Ms. Rachel Yap",   "email": "rachel.yap@smademic.com",    "password": "lect123", "role": "lecturer"},
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

random.seed(42)

def gen_profile():
    """Returns random score range based on profile archetype (out of 100)."""
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

def build_records(subject_map):
    records = []
    subject_codes = list(subject_map.keys())
    
    for stu in STUDENTS:
        # Enrolled in 4-6 subjects
        n_subjects = random.randint(4, 6)
        enrolled   = random.sample(subject_codes, n_subjects)
        
        for code in enrolled:
            subj = subject_map[code]
            att, cw, fin = gen_profile()
            
            # Simulate whether the student has completed the Final Exam yet (approx 30% completed, 70% pending)
            final_graded = random.random() < 0.30
            
            marks = {}
            for comp in subj["components"]:
                is_final = "final" in comp["name"].lower() or "exam" in comp["name"].lower()
                if is_final:
                    if final_graded:
                        marks[comp["name"]] = fin
                    # If not final_graded, we leave the "Final Exam" key completely out of marks
                else:
                    # Give coursework component the randomized coursework score (plus/minus small random variance for realness)
                    variance = random.randint(-5, 5)
                    marks[comp["name"]] = max(0, min(100, cw + variance))
            
            records.append({
                "student_id": stu["email"],
                "subject_id": subj["_id"],
                "marks":      marks,
                "attendance": att
            })
            
    return records

def register_all():
    print("\n── Registering users ──────────────────────────")
    for u in LECTURERS + [{"name": s["name"], "email": s["email"], "password": "stu123", "role": "student"} for s in STUDENTS]:
        res = requests.post(f"{BASE}/api/auth/register", json=u)
        if res.status_code == 201:
            print(f"  ✓ {u['email']} ({u['role']})")
        else:
            print(f"  · {u['email']} — already exists (skipped)")

def seed_subjects():
    print("\n── Seeding subjects ───────────────────────────")
    for s in SUBJECTS:
        res = requests.post(f"{BASE}/api/subjects", json=s, headers=HEADERS)
        if res.status_code == 201:
            print(f"  ✓ {s['name']} ({s['code']})")
        else:
            print(f"  · {s['name']} — already exists (skipped)")

    # Fetch all subjects back with their _id
    res = requests.get(f"{BASE}/api/subjects", headers=HEADERS)
    subject_map = {}
    for s in res.json():
        subject_map[s["code"]] = s
    return subject_map

def seed_records(subject_map):
    print("\n── Seeding student records ────────────────────")
    records = build_records(subject_map)
    ok = 0
    for r in records:
        res = requests.post(f"{BASE}/api/records", json=r, headers=HEADERS)
        if res.status_code in (200, 201):
            ok += 1
        else:
            print(f"  ! Failed: {r['student_id']} -> {r['subject_id'][-6:]} | {res.text[:80]}")
    print(f"  ✓ {ok}/{len(records)} records seeded")

if __name__ == "__main__":
    print("=" * 56)
    print("  SMADEMIC — Detailed Mid-Exam Seeder")
    print("=" * 56)
    login_admin()
    register_all()
    subject_map = seed_subjects()
    seed_records(subject_map)
    total_students = len(STUDENTS)
    total_subjects = len(SUBJECTS)
    print(f"\n✅ Ready! {total_students} students × 4-6 subjects ({total_subjects} subjects total)")
    print("   ~70% of final exams are left UNGRADED to trigger target projections.")