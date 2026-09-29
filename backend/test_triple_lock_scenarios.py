import json
from grading import calculate_triple_lock

components = [
    {"name": "Coursework", "weight": 60},
    {"name": "Final Exam", "weight": 40}
]

scenarios = [
    {
        "name": "Scenario 1: Fails Lock 1 (Coursework < 40%)",
        "marks": {"Coursework": 30, "Final Exam": 70}, # CW weighted = 18/60 (30%), Final = 28/40
        "attendance": 80
    },
    {
        "name": "Scenario 2: Passes Lock 1, Fails Lock 2 (Final < 40%)",
        "marks": {"Coursework": 80, "Final Exam": 30}, # CW weighted = 48/60 (80%), Final = 12/40 (30%)
        "attendance": 90
    },
    {
        "name": "Scenario 3: Passes Lock 1 & 2, Fails Lock 3 (Aggregate < 50%)",
        "marks": {"Coursework": 41, "Final Exam": 41}, # CW = 41%, Final = 41%. Aggregate = 41%
        "attendance": 100
    },
    {
        "name": "Scenario 4: Passes All 3 Locks",
        "marks": {"Coursework": 60, "Final Exam": 60}, # CW = 60%, Final = 60%. Aggregate = 60%
        "attendance": 80
    }
]

for s in scenarios:
    print(f"--- {s['name']} ---")
    res = calculate_triple_lock(components, s["marks"], s["attendance"], has_final=True)
    print(f"Coursework Passed (Lock 1): {res['lock1_coursework']}")
    print(f"Final Exam Passed (Lock 2): {res['lock2_final_exam']}")
    print(f"Aggregate Passed  (Lock 3): {res['lock3_aggregate']}")
    print(f"Total Marks: {res['total_marks']}%")
    print(f"Final Status: {res['status']}\n")
