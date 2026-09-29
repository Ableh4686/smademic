import sys
with open('train_output.txt', 'w', encoding='utf-8') as f:
    sys.stdout = f
    import train_model
