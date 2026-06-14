#!/usr/bin/env python3
# server.py — Flask backend for the Vouch demo.
#   GET /                 -> serves vouch-app.html
#   GET /api/recommend    -> ranked creators (CB + CF + hybrid + contextual trust)
#   GET /api/stats        -> dataset summary
#   GET /api/health
# Run:  python server.py   then open  http://localhost:8000
import os, sqlite3
from flask import Flask, request, jsonify, Response
import recommend

HERE = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__)


@app.after_request
def cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    return resp


@app.get("/")
def index():
    path = os.path.join(HERE, "vouch-app.html")
    return Response(open(path, encoding="utf-8").read(), mimetype="text/html")


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/recommend")
def api_recommend():
    return jsonify(recommend.recommend(
        category=request.args.get("category", "뷰티"),
        brand_id=request.args.get("brand", type=int),
        beta=request.args.get("beta", default=1.0, type=float),
        lam=request.args.get("lam", default=0.5, type=float),
        trust_floor=request.args.get("trust_floor", default=0.0, type=float),
        top_n=request.args.get("top_n", default=6, type=int),
    ))


@app.get("/api/stats")
def api_stats():
    con = sqlite3.connect(recommend.DB)
    g = lambda q: con.execute(q).fetchone()[0]
    out = {
        "creators_scored": g("SELECT COUNT(*) FROM trust_metrics"),
        "creators_total": g("SELECT COUNT(*) FROM creators"),
        "campaigns": g("SELECT COUNT(*) FROM campaigns"),
        "avg_deadline": round(g("SELECT AVG(deadline_rate) FROM trust_metrics"), 3),
        "brand_pairs": g("SELECT COUNT(*) FROM brand_similarity") // 2,
    }
    con.close()
    return out


if __name__ == "__main__":
    # ensure brand_similarity is materialized before first request
    con = sqlite3.connect(recommend.DB)
    con.row_factory = sqlite3.Row
    if con.execute("SELECT COUNT(*) FROM brand_similarity").fetchone()[0] == 0:
        recommend.build_brand_similarity(con)
    con.close()
    print("Vouch backend → http://localhost:8000")
    app.run(host="127.0.0.1", port=8000, debug=False)
