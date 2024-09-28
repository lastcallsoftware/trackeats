from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route("/ingredients", methods = ["GET"])
def hello_world():
    if (request.method == "GET"):
        data = {"name":"milk", "serving_size":"1 cup"}
    return jsonify(data)
