import sys
with open('prediction_output.txt', 'w', encoding='utf-8') as f:
    sys.stdout = f
    import test_live_prediction
