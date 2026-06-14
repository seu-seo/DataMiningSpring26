#!/usr/bin/env python3
# =============================================================================
# recommend.py — brand -> creator recommendation engine
#
#   content-based : affinity = (cos(u_b, v_k)+1)/2
#   collaborative : r_hat(b,k) = Σ_{b'∈N} sim(b,b')·r(b',k) / Σ|sim(b,b')|
#                   sim(b,b') = cosine over co-rated creators   (Adomavicius &
#                   Tuzhilin 2005, slide 9). Materialized into brand_similarity.
#   hybrid        : rel = λ·CB + (1-λ)·CF
#   contextual    : utility = rel · trust^β            (U×I×C → R, slide 20/28)
#
# The engine selects the most brief-relevant creators (hybrid affinity) within
# the category, then trust-verifies them; the UI default-sorts by trust so risky
# but relevant creators stay visible (last) — that is the point of the product.
#
# CLI:  python recommend.py --category 뷰티 [--beta 1.0] [--json]
#       python recommend.py --build-similarity
# =============================================================================
import os, sqlite3, json, math, argparse
from random import Random

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vling_academic.db")

NICHE_KO = {"beauty":"뷰티","fashion":"패션","gaming":"게임","food":"푸드","tech":"테크",
            "travel":"여행","fitness":"피트니스","kids":"키즈","lifestyle":"라이프스타일",
            "music":"음악","education":"교육","pets":"펫"}
SUBNICHE = {"뷰티":["비건 스킨케어","스킨케어","클린뷰티","메이크업"],"패션":["데일리룩","미니멀","스트릿"],
            "게임":["게이밍","공략"],"푸드":["쿠킹","먹방","홈쿡"],"테크":["가젯 리뷰","IT"],
            "여행":["여행기록","로드트립"],"피트니스":["홈트","바디"],"키즈":["패밀리","키즈"],
            "라이프스타일":["일상","무드"],"음악":["커버","사운드"],"교육":["스터디","클래스"],"펫":["멍냥","펫"]}
DESC = {"뷰티":["글로우","클린뷰티","데일리","미니멀","코스메","비건뷰티"],"패션":["데일리룩","미니멀","무드","클로젯"],
        "게임":["게이밍","플레이","겜성"],"푸드":["쿠킹","먹방","홈키친","미식"],"테크":["테크","가젯","리뷰랩"],
        "여행":["트래블","여행기록","원더"],"피트니스":["핏","홈트","무브"],"키즈":["패밀리","키즈"],
        "라이프스타일":["데일리","라이프","무드","홈"],"음악":["뮤직","사운드"],"교육":["클래스","스터디"],"펫":["멍냥","댕댕"]}
GIVEN = ["하늘","수진","보경","라온","지아","서연","다은","예린","가람","소율","지호","하린","주아","세영",
         "나윤","도연","은채","시우","유나","채원","민서","수아","현","아인","리아","해원","단비","윤슬"]
ROMAN = ["haneul","sujin","bokyung","raon","jia","seoyeon","daeun","yerin","garam","soyul","jiho","harin",
         "jua","seyeong","nayoon","doyeon","eunchae","siwoo","yuna","chaewon","minseo","sua","hyun","ain",
         "ria","haewon","danbi","yunseul"]
PLATS = ["YouTube","Instagram","TikTok"]
DEMOBASE = {"뷰티":[["여성 25-34세",44],["여성 18-24세",28],["남성 25-34세",12]],
            "푸드":[["여성 30-44세",38],["남성 30-44세",26],["여성 25-34세",20]],
            "패션":[["여성 18-24세",40],["여성 25-34세",30],["남성 18-24세",12]],
            "테크":[["남성 25-34세",46],["남성 18-24세",26],["여성 25-34세",14]],
            "라이프스타일":[["여성 25-34세",40],["여성 30-44세",26],["남성 25-34세",14]]}
AXNAME = {"diligence":"성실함","comm":"커뮤니케이션","delivery":"약속 이행","audience":"팔로워 진정성"}


def clamp(x, a, b): return max(a, min(b, x))
def fmt_followers(n):
    if n >= 1_000_000: return f"{n/1_000_000:.1f}M"
    if n >= 1000: return f"{round(n/1000)}K"
    return str(n)


# ── data access ──────────────────────────────────────────────────────────────
def connect(): 
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row; return c

def load_creators(con):
    rows = con.execute("""
        SELECT cr.creator_id id, cr.content_vector cv, c.name niche_en,
               ch.subscribers subs, ch.dau, ch.mau,
               t.deadline_rate, t.comm_score, t.completion_rate,
               t.consistency, t.engagement_stab, t.trust_score,
               (SELECT COUNT(*) FROM campaigns cm WHERE cm.creator_id=cr.creator_id) deals
        FROM creators cr JOIN categories c ON c.category_id=cr.category_id
        JOIN channels ch ON ch.creator_id=cr.creator_id
        JOIN trust_metrics t ON t.creator_id=cr.creator_id""").fetchall()
    out = {}
    for r in rows:
        i = r["id"]; ko = NICHE_KO[r["niche_en"]]
        out[i] = {
            "id": i, "niche": ko, "niche_en": r["niche_en"],
            "vec": json.loads(r["cv"]), "subs": r["subs"],
            "stick": (r["dau"]/r["mau"]) if r["mau"] else 0, "deals": r["deals"],
            "trust": {"deadline": r["deadline_rate"], "comm": r["comm_score"],
                      "completion": r["completion_rate"], "consistency": r["consistency"],
                      "engagement": r["engagement_stab"], "score": r["trust_score"]},
        }
    return out

def load_brands(con):
    rows = con.execute("""SELECT b.brand_id id, c.name niche_en, b.target_vector tv
                          FROM brands b JOIN categories c ON c.category_id=b.category_id""").fetchall()
    return {r["id"]: {"id": r["id"], "niche": NICHE_KO[r["niche_en"]], "vec": json.loads(r["tv"])} for r in rows}


# ── collaborative filtering: build brand_similarity ──────────────────────────
def build_brand_similarity(con, min_common=2):
    """cosine over co-rated creators; materialize into brand_similarity."""
    ratings = {}  # brand_id -> {creator_id: rating}
    for r in con.execute("SELECT brand_id, creator_id, rating FROM v_rating_matrix"):
        ratings.setdefault(r["brand_id"], {})[r["creator_id"]] = r["rating"]
    bids = list(ratings)
    con.execute("DELETE FROM brand_similarity")
    rows = []
    for ix, b1 in enumerate(bids):
        r1 = ratings[b1]
        for b2 in bids[ix+1:]:
            r2 = ratings[b2]
            common = set(r1) & set(r2)
            if len(common) < min_common: continue
            dot = sum(r1[k]*r2[k] for k in common)
            n1 = math.sqrt(sum(r1[k]**2 for k in common))
            n2 = math.sqrt(sum(r2[k]**2 for k in common))
            if n1 == 0 or n2 == 0: continue
            sim = dot/(n1*n2)
            rows.append((b1, b2, sim, len(common)))
            rows.append((b2, b1, sim, len(common)))
    con.executemany("INSERT INTO brand_similarity(b1,b2,cosine_sim,common_creators) VALUES(?,?,?,?)", rows)
    con.commit()
    return len(rows)//2

def cf_predict(con, brand_id, creator_id, k_neighbors=20):
    """r_hat(b,k) normalized to [0,1]; None if no signal."""
    rows = con.execute("""
        SELECT s.cosine_sim sim, o.satisfaction rating
        FROM brand_similarity s
        JOIN campaigns cm ON cm.brand_id=s.b2 AND cm.creator_id=?
        JOIN outcomes  o  ON o.campaign_id=cm.campaign_id
        WHERE s.b1=? AND s.cosine_sim>0
        ORDER BY s.cosine_sim DESC LIMIT ?""", (creator_id, brand_id, k_neighbors)).fetchall()
    if not rows: return None
    num = sum(r["sim"]*r["rating"] for r in rows)
    den = sum(r["sim"] for r in rows)
    if den == 0: return None
    return clamp((num/den)/5.0, 0, 1)


# ── display synthesis (server-side; mirrors the UI's field shape) ────────────
def display_fields(c):
    i = c["id"]; ko = c["niche"]
    desc = DESC[ko][i % len(DESC[ko])]; given = GIVEN[i % len(GIVEN)]; rom = ROMAN[i % len(ROMAN)]
    months = 14 + c["deals"]*4 + (i % 11)
    return {
        "init": given[0], "name": f"{desc} {given}",
        "handle": f"@{rom}.{c['niche_en'][:4]}",
        "cat": f"{ko} · {SUBNICHE[ko][i % len(SUBNICHE[ko])]}",
        "plat": PLATS[i % 3], "followers": fmt_followers(c["subs"]),
        "years": f"{months//12}년 {months%12}개월", "deals": c["deals"],
    }

def cadence(consistency, seed):
    r = Random(seed); gp = clamp((1-consistency)*0.6, 0.03, 0.7); out = []
    for _ in range(16):
        out.append(0 if r.random() < gp else (2 if r.random() < .5 else (1 if r.random() < .5 else 3)))
    return out

def max_zero_run(a):
    m = cur = 0
    for x in a: cur = cur+1 if x == 0 else 0; m = max(m, cur)
    return m

def synth(c, cb, cf, hybrid, beta):
    t = c["trust"]; i = c["id"]; rr = Random(i*97+13)
    scores = {
        "diligence": round((0.55*t["consistency"] + 0.45*t["deadline"])*100),
        "comm": round(t["comm"]*100),
        "delivery": round((0.65*t["completion"] + 0.35*t["deadline"])*100),
        "audience": round(clamp(0.40 + 0.55*t["engagement"], 0, 1)*100),
    }
    overall = round(t["score"]*100)
    aff_pct = round(hybrid*100)
    disp = display_fields(c)

    cad = cadence(t["consistency"], i*31+5); avg = sum(cad)/16
    gap = max_zero_run(cad)*7 + 2 + round(rr.random()*3)
    cons_lab = (f"상위 {round((1-t['consistency'])*45)+4}%" if t["consistency"] >= 0.5
                else f"하위 {round((0.5-t['consistency'])*60)+10}%")
    resp = round((1-t["comm"])*40)+2
    resp_s = f"{resp/24:.1f}일" if resp > 24 else f"{resp}시간"
    real_f = round((0.45 + 0.5*t["engagement"])*100)
    fit = "높음" if hybrid > 0.6 else ("보통" if hybrid > 0.5 else "낮음")
    demo = [[d[0], int(clamp(d[1] + round((rr.random()-.5)*6), 5, 60))]
            for d in DEMOBASE.get(c["niche"], DEMOBASE["뷰티"])]
    note = f"국내 {round(60 + t['engagement']*30)}% · 모바일 {88 + (i % 8)}%"

    top = max(scores, key=scores.get)
    top_phrase = {"diligence":"꾸준한 업로드와 일정 준수가 강점","comm":"응답이 빠르고 협업 커뮤니케이션이 매끄러움",
                  "delivery":"마감·계약 이행이 안정적","audience":"실사용자 비중이 높고 타깃 적합도가 양호"}[top]
    why = f"{top_phrase}. {c['niche']} 적합도 {aff_pct}%로 브리프와 부합합니다."
    if cf is not None:
        why += " 유사 브랜드 협업 데이터로 보정됨."

    mn = min(scores, key=scores.get)
    reason = {"diligence":"업로드 간격 편차가 큼","comm":"평균 응답이 느리고 회신 지연 이력",
              "delivery":"과거 협업 중 마감 지연 기록","audience":"봇 의심 비율 높음"}[mn]
    warn, risk = None, False
    if overall < 50:
        risk = True; warn = f"{AXNAME[mn]} 위험 — {reason} · 검증 거래 {c['deals']}건"
    elif scores[mn] < 58:
        warn = f"{AXNAME[mn]} 주의 — {reason}"

    return {
        "id": f"c{i}", **disp, "overall": overall, "scores": scores,
        "why": why, "warn": warn, "risk": risk,
        "method": {"cb": round(cb, 3), "cf": (round(cf, 3) if cf is not None else None),
                   "hybrid": round(hybrid, 3), "trust": round(t["score"], 3),
                   "utility": round(hybrid * (t["score"]**beta), 3)},
        "ev": {
            "diligence": {"desc": ("업로드가 일정하고 최근까지 꾸준합니다." if scores["diligence"] >= 80
                          else "대체로 꾸준하나 시기별 편차가 있습니다." if scores["diligence"] >= 60
                          else "장기 공백이 반복되어 활동 예측이 어렵습니다."),
                "cards": [["평균 주기", f"주 {avg:.1f}회"], ["최대 공백", f"{gap}일"], ["일관성", cons_lab]],
                "cadence": cad},
            "comm": {"desc": ("응답이 빠르고 협업 명료성이 높습니다." if scores["comm"] >= 80
                     else "응답 속도와 톤이 양호한 편입니다." if scores["comm"] >= 60
                     else "응답이 느리고 협업 중 회신이 끊긴 사례가 있습니다."),
                "cards": [["첫 응답", resp_s], ["명료성", f"{t['comm']*5:.1f} / 5"],
                          ["지연 사례", f"{round((1-t['comm'])*4)}건"]]},
            "delivery": {"desc": ("마감과 계약 조건 이행이 매우 안정적입니다." if scores["delivery"] >= 80
                         else "대체로 이행하나 일부 일정 재조율 이력이 있습니다." if scores["delivery"] >= 60
                         else "완료는 했으나 일정 변경 요청이 잦았습니다."),
                "cards": [["마감 준수율", f"{round(t['deadline']*100)}%"], ["조건 이행", f"{c['deals']} / {c['deals']}건"],
                          ["중도 이탈", f"{1 if t['completion']<0.6 else 0}건"]]},
            "audience": {"desc": ("실사용자 비중이 높고 핵심 시청자가 타깃과 일치합니다." if scores["audience"] >= 70
                         else "실사용자 비중은 양호하나 일부 비활성 팔로워가 있습니다." if scores["audience"] >= 50
                         else "봇·휴면 의심 비중이 높아 도달 대비 전환이 불확실합니다."),
                "cards": [["실 팔로워", f"{real_f}%"], ["봇 의심", f"{100-real_f}%"], ["타깃 적합", fit]],
                "demo": demo, "note": note},
        },
    }


# ── main pipeline ────────────────────────────────────────────────────────────
def recommend(category=None, brand_id=None, beta=1.0, lam=0.5,
              k_neighbors=20, trust_floor=0.0, top_n=6):
    con = connect()
    if con.execute("SELECT COUNT(*) FROM brand_similarity").fetchone()[0] == 0:
        build_brand_similarity(con)
    brands = load_brands(con); creators = load_creators(con)

    if brand_id is None:
        niche = category or "뷰티"
        cand_brands = [b for b in brands.values() if b["niche"] == niche]
        brand = cand_brands[0] if cand_brands else next(iter(brands.values()))
    else:
        brand = brands[brand_id]; niche = brand["niche"]

    pool = [c for c in creators.values() if c["niche"] == niche]
    scored = []
    cf_used = 0
    for c in pool:
        if c["trust"]["score"] < trust_floor: continue
        cb = (sum(a*b for a, b in zip(brand["vec"], c["vec"])) + 1) / 2
        cf = cf_predict(con, brand["id"], c["id"], k_neighbors)
        if cf is not None: cf_used += 1
        hybrid = lam*cb + (1-lam)*(cf if cf is not None else cb)
        scored.append((c, cb, cf, hybrid))

    scored.sort(key=lambda x: x[3], reverse=True)          # brief-relevance (hybrid)
    top = scored[:top_n]
    out = [synth(c, cb, cf, hyb, beta) for (c, cb, cf, hyb) in top]

    seen = set()                                           # ensure unique names in the set
    for o in out:
        if o["name"] in seen:
            base = int(o["id"][1:]); first = o["name"].split(" ")[0]
            for off in range(1, len(GIVEN)):
                g = GIVEN[(base+off) % len(GIVEN)]; alt = f"{first} {g}"
                if alt not in seen: o["name"] = alt; o["init"] = g[0]; break
        seen.add(o["name"])
    con.close()
    return {"ctx": {"category": niche, "brand_id": brand["id"], "pool": len(pool),
                    "cf_used": cf_used}, "creators": out}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--category", default="뷰티")
    ap.add_argument("--brand", type=int, default=None)
    ap.add_argument("--beta", type=float, default=1.0)
    ap.add_argument("--lam", type=float, default=0.5)
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--build-similarity", action="store_true")
    a = ap.parse_args()

    if a.build_similarity:
        con = connect(); n = build_brand_similarity(con); con.close()
        print(f"brand_similarity built: {n} undirected pairs"); raise SystemExit

    res = recommend(category=a.category, brand_id=a.brand, beta=a.beta, lam=a.lam)
    if a.json:
        print(json.dumps(res, ensure_ascii=False, indent=2)); raise SystemExit
    print(f"category={res['ctx']['category']}  pool={res['ctx']['pool']}  cf_used={res['ctx']['cf_used']}")
    print(f"{'name':<18}{'cb':>6}{'cf':>6}{'hyb':>6}{'trust':>7}{'util':>7}  grade")
    for c in res["creators"]:
        m = c["method"]; cf = f"{m['cf']:.2f}" if m["cf"] is not None else "  -"
        g = "A" if c["overall"] >= 80 else ("B" if c["overall"] >= 60 else "C")
        print(f"{c['name']:<18}{m['cb']:>6.2f}{cf:>6}{m['hybrid']:>6.2f}"
              f"{m['trust']:>7.2f}{m['utility']:>7.2f}   {g}({c['overall']})")
