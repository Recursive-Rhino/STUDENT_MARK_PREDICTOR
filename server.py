from flask import Flask, request, jsonify, send_from_directory
import numpy as np
import joblib
import warnings
import os

warnings.filterwarnings("ignore")

app = Flask(__name__, static_folder="static")

# Load model once at startup
model = joblib.load("best_model.pkl")


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        study_hours   = float(data.get("study_hours", 2.0))
        attendance    = float(data.get("attendance", 80.0))
        mental_health = int(data.get("mental_health", 5))
        sleep_hours   = float(data.get("sleep_hours", 7.0))
        part_time_job = int(data.get("part_time_job", 0))   # 1 = Yes, 0 = No

        input_data = np.array([[study_hours, attendance, mental_health, sleep_hours, part_time_job]])
        prediction = model.predict(input_data)[0]
        prediction = max(0.0, min(100.0, float(prediction)))

        return jsonify({"success": True, "score": round(prediction, 2)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    os.makedirs("static", exist_ok=True)
    app.run(debug=True, port=5000)
