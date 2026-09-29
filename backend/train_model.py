import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, classification_report
import joblib

# Load dataset
df = pd.read_csv("data.csv", sep=";")

print("Columns:", df.columns.tolist())
print("Target values:", df["Target"].unique())
print("Shape:", df.shape)

# Keep only Graduate and Dropout (remove Enrolled)
df = df[df["Target"].isin(["Graduate", "Dropout"])]

# Encode target: Graduate = 0 (Safe), Dropout = 1 (At-Risk)
le = LabelEncoder()
df["Target"] = le.fit_transform(df["Target"])  # Dropout=0, Graduate=1
# Flip so At-Risk = 1
df["Target"] = df["Target"].apply(lambda x: 0 if x == 1 else 1)

# Select features
features = [
    "Curricular units 1st sem (grade)",
    "Curricular units 2nd sem (grade)",
    "Curricular units 1st sem (approved)",
    "Curricular units 2nd sem (approved)",
    "Curricular units 1st sem (enrolled)",
    "Curricular units 2nd sem (enrolled)",
    "Age at enrollment",
    "Admission grade",
    "Previous qualification (grade)",
    "Unemployment rate",
    "GDP"
]

X = df[features]
y = df["Target"]

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train Random Forest
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print("\n=== Model Performance ===")
print(f"Accuracy  : {accuracy_score(y_test, y_pred):.4f}")
print(f"Precision : {precision_score(y_test, y_pred):.4f}")
print(f"Recall    : {recall_score(y_test, y_pred):.4f}")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=["Safe", "At-Risk"]))

# Save model and feature list
joblib.dump(model, "risk_model.pkl")
joblib.dump(features, "model_features.pkl")
print("\nModel saved as risk_model.pkl")