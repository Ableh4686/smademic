def calculate_triple_lock(components, marks, attendance, has_final=True):
    """
    Calculates Triple-Lock grading status and projects targets for pending final exams.
    
    components : [{"name": "Test 1", "weight": 10}, {"name": "Final Exam", "weight": 40}, ...]
    marks      : {"Test 1": 75, "Group Project": 80}  # Final Exam might be missing during semester
    attendance : 80 (percentage)
    has_final  : True/False
    """

    result = {
        "attendance"       : attendance,
        "barred"           : attendance < 75,
        "lock1_coursework" : None,
        "lock2_final_exam" : None,
        "lock3_aggregate"  : None,
        "total_marks"      : 0,
        "total_weight"     : 0,
        "passed"           : False,
        "status"           : "",
        "breakdown"        : [],
        
        # Mid-semester prediction targets
        "final_exam_graded": False,
        "target_final_exam": None,
        "can_pass"         : True,
        "prediction_notes" : ""
    }

    # Group components into Coursework vs Final Exam
    coursework_sum_weighted = 0
    coursework_weight_total = 0
    
    final_exam_comp = None
    final_exam_mark = None
    final_exam_present = False

    for component in components:
        name   = component["name"]
        weight = component["weight"]
        
        is_final = "final" in name.lower() or "exam" in name.lower()
        
        if is_final and has_final:
            final_exam_comp = component
            if name in marks:
                final_exam_mark = marks[name]
                final_exam_present = True
        else:
            mark = marks.get(name)
            # If the coursework component has no mark, we treat it as 0 for current calculations,
            # but in a real system it could be pending.
            if mark is not None:
                coursework_sum_weighted += (mark / 100) * weight
                coursework_weight_total += weight
                
                result["breakdown"].append({
                    "component" : name,
                    "weight"    : weight,
                    "mark"      : mark,
                    "weighted"  : round((mark / 100) * weight, 2)
                })

    # Normalized coursework score (0 to 100)
    coursework_score_normalized = (coursework_sum_weighted / coursework_weight_total * 100) if coursework_weight_total > 0 else 0
    cw_passed = coursework_score_normalized >= 40
    result["lock1_coursework"] = cw_passed

    # ── CASE 1: Subject does not have a final exam ──────────────────
    if not has_final or not final_exam_comp:
        result["final_exam_graded"] = True
        result["lock2_final_exam"] = True
        # Aggregate is just coursework normalized
        aggregate = coursework_score_normalized
        result["total_marks"] = round(aggregate, 2)
        result["lock3_aggregate"] = aggregate >= 50
        
        if result["barred"]:
            result["passed"] = False
            result["status"] = "BARRED"
        elif not cw_passed:
            result["passed"] = False
            result["status"] = "FAILED (Coursework below 40%)"
        elif aggregate < 50:
            result["passed"] = False
            result["status"] = "FAILED (Aggregate below 50%)"
        else:
            result["passed"] = True
            result["status"] = "PASSED"
            
        return result

    # ── CASE 2: Final Exam exists ───────────────────────────────────
    final_weight = final_exam_comp["weight"]
    cw_weight    = 100 - final_weight  # Total weight minus final weight

    # Overall coursework aggregate out of 100% of the entire subject weight
    coursework_contrib = (coursework_score_normalized / 100) * cw_weight

    # a) If the final exam HAS been graded
    if final_exam_present and final_exam_mark is not None:
        result["final_exam_graded"] = True
        result["breakdown"].append({
            "component" : final_exam_comp["name"],
            "weight"    : final_weight,
            "mark"      : final_exam_mark,
            "weighted"  : round((final_exam_mark / 100) * final_weight, 2)
        })
        
        final_passed = final_exam_mark >= 40
        result["lock2_final_exam"] = final_passed
        
        aggregate = coursework_contrib + (final_exam_mark / 100) * final_weight
        result["total_marks"] = round(aggregate, 2)
        result["lock3_aggregate"] = aggregate >= 50

        if result["barred"]:
            result["passed"] = False
            result["status"] = "BARRED"
        elif not cw_passed:
            result["passed"] = False
            result["status"] = "FAILED (Coursework below 40%)"
        elif not final_passed:
            result["passed"] = False
            result["status"] = "FAILED (Final Exam below 40%)"
        elif aggregate < 50:
            result["passed"] = False
            result["status"] = "FAILED (Aggregate below 50%)"
        else:
            result["passed"] = True
            result["status"] = "PASSED"

    # b) If final exam is PENDING (Mid-semester predictive state)
    else:
        result["final_exam_graded"] = False
        # Aggregate mark so far
        result["total_marks"] = round(coursework_contrib, 2)
        
        if result["barred"]:
            result["can_pass"] = False
            result["passed"] = False
            result["status"] = "BARRED (Prediction: Fail)"
            result["prediction_notes"] = "Student is barred due to low attendance."
        elif not cw_passed:
            result["can_pass"] = False
            result["passed"] = False
            result["status"] = "FAILED COURSEWORK (Prediction: Fail)"
            result["prediction_notes"] = "Coursework score is below 40%. Student cannot pass."
        else:
            # Calculate target final exam score needed
            # 1. To satisfy Lock 2: must get at least 40% on final exam.
            # 2. To satisfy Lock 3: coursework_contrib + (final_mark/100)*final_weight >= 50
            #    (final_mark/100)*final_weight >= 50 - coursework_contrib
            #    final_mark >= (50 - coursework_contrib) / final_weight * 100
            target_aggregate_req = ((50 - coursework_contrib) / final_weight) * 100 if final_weight > 0 else 0
            required_final_exam = max(40.0, target_aggregate_req)
            required_final_exam = round(required_final_exam, 1)

            if required_final_exam > 100:
                result["can_pass"] = False
                result["passed"] = False
                result["status"] = "FAILED AGGREGATE (Prediction: Fail)"
                result["prediction_notes"] = f"Coursework score too low. Student needs {required_final_exam}% in final exam to pass, which is impossible."
            else:
                result["can_pass"] = True
                result["target_final_exam"] = required_final_exam
                result["status"] = "ONGOING"
                result["prediction_notes"] = f"Ongoing. Student needs at least {required_final_exam}% in final exam to pass."

    return result