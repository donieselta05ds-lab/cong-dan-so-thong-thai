/* =========================================================
   NGƯỜI CHƠI + BẢNG XẾP HẠNG
   - Form nhập Họ tên / Số điện thoại / Khu phố trước khi chơi
   - Đếm tổng thời gian trả lời (không hiện trong game)
   - Xếp hạng: điểm cao hơn đứng trên; bằng điểm thì ai trả lời nhanh hơn đứng trên
   Cần: js/config.js (LB_URL, LB_TOP, KP_SO) nạp trước file này.
   ========================================================= */
const LB = (() => {
  const el = id => document.getElementById(id);
  const KEY_PLAYER = "cdstt-player", KEY_LOCAL = "cdstt-local", KEY_PENDING = "cdstt-pending";
  const store = {
    get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d }catch(_){ return d } },
    set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)) }catch(_){} }
  };
  let player = store.get(KEY_PLAYER, null);
  let lastRank = null;

  /* ---------- tiện ích ---------- */
  const cleanName = s => String(s || "").replace(/\s+/g, " ").trim();
  const cleanPhone = s => String(s || "").replace(/\D/g, "");
  const mask = p => "*******" + String(p || "").slice(-3);
  function fmtTime(ms, long){
    const t = Math.max(0, Math.round(ms / 100)) / 10;          // 0,1 giây
    const m = Math.floor(t / 60), s = t - m * 60;
    const sStr = s.toFixed(1).replace(".", ",");
    if (long) return m ? `${m} phút ${sStr} giây` : `${sStr} giây`;
    return m ? `${m}:${s < 10 ? "0" : ""}${sStr}` : `${sStr}s`;
  }
  const cmp = (a, b) => (b.score - a.score) || (a.ms - b.ms) || ((a.at || 0) - (b.at || 0));

  /* ---------- form người chơi ---------- */
  function fillKp(){
    el("fKp").innerHTML = '<option value="">Chọn khu phố</option>' +
      KP_SO.map(n => `<option value="${n}">Khu phố ${n}</option>`).join("");
  }
  function openReg(){
    fillKp();
    if (player){ el("fName").value = player.name; el("fPhone").value = player.phone; el("fKp").value = String(player.kp) }
    el("regErr").textContent = "";
    show("reg");
    setTimeout(() => { if (!el("fName").value) el("fName").focus({ preventScroll:true }) }, 380);
  }
  function validate(){
    const name = cleanName(el("fName").value), phone = cleanPhone(el("fPhone").value), kp = Number(el("fKp").value);
    document.querySelectorAll(".field").forEach(f => f.classList.remove("bad"));
    const bad = (id, msg) => { el(id).closest(".field").classList.add("bad"); el("regErr").textContent = msg; el(id).focus(); return null };
    if (name.length < 2 || name.length > 50 || /[<>=]/.test(name)) return bad("fName", "Vui lòng nhập họ và tên (từ 2 đến 50 ký tự).");
    if (!/^0\d{9}$/.test(phone)) return bad("fPhone", "Số điện thoại gồm 10 chữ số và bắt đầu bằng số 0.");
    if (!KP_SO.includes(kp)) return bad("fKp", "Vui lòng chọn khu phố của bạn.");
    el("regErr").textContent = "";
    return { name, phone, kp };
  }
  function bindReg(onReady){
    el("fPhone").addEventListener("input", e => { const v = cleanPhone(e.target.value).slice(0, 10); if (v !== e.target.value) e.target.value = v });
    el("regForm").addEventListener("submit", e => {
      e.preventDefault();
      const p = validate(); if (!p) return;
      player = p; store.set(KEY_PLAYER, p); onReady();
    });
    el("regBack").onclick = () => show("start");
  }

  /* ---------- gửi & đọc dữ liệu ---------- */
  async function post(rec){
    const r = await fetch(LB_URL, { method:"POST", body:JSON.stringify(rec) });   // text/plain: không cần preflight
    const j = await r.json(); if (!j || !j.ok) throw new Error(j && j.error || "Lỗi máy chủ"); return j;
  }
  async function flushPending(){
    if (!LB_URL) return; const q = store.get(KEY_PENDING, []); if (!q.length) return;
    const left = [];
    for (const rec of q){ try{ await post(rec) }catch(_){ left.push(rec) } }
    store.set(KEY_PENDING, left);
  }
  function localBoard(){
    const list = store.get(KEY_LOCAL, []).slice().sort(cmp);
    return { count:list.length, top:list.slice(0, LB_TOP).map(r => ({ name:r.name, kp:r.kp, phone:mask(r.phone), score:r.score, ms:r.ms })),
             rankOf: ph => { let at = -1, k = 0; list.forEach((r, i) => { if (r.phone === ph && (r.at || 0) >= at){ at = r.at || 0; k = i + 1 } }); return k } };
  }
  async function submit(rec){
    if (!LB_URL){
      const all = store.get(KEY_LOCAL, []); all.push({ ...rec, at:Date.now() }); store.set(KEY_LOCAL, all);
      const b = localBoard(); return { ok:true, rank:b.rankOf(rec.phone), count:b.count, local:true };
    }
    try { return await post(rec) }
    catch(e){ const q = store.get(KEY_PENDING, []); q.push(rec); store.set(KEY_PENDING, q.slice(-10)); throw e }
  }
  async function fetchBoard(){
    if (!LB_URL){ const b = localBoard(); return { count:b.count, top:b.top, local:true } }
    const r = await fetch(LB_URL + (LB_URL.includes("?") ? "&" : "?") + "t=" + Date.now());
    const j = await r.json(); if (!j || !Array.isArray(j.top)) throw new Error("Dữ liệu không hợp lệ"); return j;
  }

  /* ---------- sao huy chương ---------- */
  const MEDAL = ["gold", "silver", "bronze"], MEDAL_NAME = ["Hạng nhất", "Hạng nhì", "Hạng ba"];
  function star(rank){
    return `<span class="medal ${MEDAL[rank - 1]}" role="img" aria-label="${MEDAL_NAME[rank - 1]}">
      <svg viewBox="0 0 48 48" aria-hidden="true"><path class="m-star" d="M24 3.5l6.2 12.6 13.9 2-10 9.8 2.4 13.8L24 35.2 11.5 41.7l2.4-13.8-10-9.8 13.9-2z"/>
      <path class="m-shine" d="M24 9l4.3 8.7 9.6 1.4-6.9 6.8"/></svg><b>${rank}</b><i class="tw t1"></i><i class="tw t2"></i></span>`;
  }

  /* ---------- vẽ bảng xếp hạng ---------- */
  const isMe = r => player && r.name === player.name && Number(r.kp) === Number(player.kp) && String(r.phone).slice(-3) === player.phone.slice(-3);
  function renderBoard(data){
    el("lbCount").innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.3 2.4 3.6 5.2"/></svg><span>${Number(data.count || 0).toLocaleString("vi-VN")}</span> lượt chơi`;
    el("lbNote").textContent = data.local ? "Đang chạy thử: bảng xếp hạng chỉ lưu trên máy này." : "";
    const ol = el("lbList"); ol.innerHTML = "";
    if (!data.top.length){ ol.innerHTML = '<li class="lb-empty">Chưa có người chơi nào. Hãy là người đầu tiên!</li>'; return }
    data.top.forEach((r, i) => {
      const rank = i + 1, li = document.createElement("li");
      li.className = "lb-row" + (rank <= 3 ? " top " + MEDAL[rank - 1] : "") + (isMe(r) ? " me" : "");
      li.style.setProperty("--d", (i * 45) + "ms");
      li.innerHTML = `<div class="lb-rank">${rank <= 3 ? star(rank) : `<span class="num">${rank}</span>`}</div>
        <div class="lb-info"><p class="lb-name"></p><p class="lb-sub">Khu phố ${Number(r.kp)} · ${r.phone}</p></div>
        <div class="lb-score"><b>${Number(r.score)}</b><span>${fmtTime(r.ms)}</span></div>`;
      li.querySelector(".lb-name").textContent = r.name;
      ol.appendChild(li);
    });
  }
  async function openBoard(){
    el("lbList").innerHTML = '<li class="lb-empty">Đang tải bảng xếp hạng…</li>';
    el("lbCount").innerHTML = '<span>…</span> lượt chơi'; el("lbNote").textContent = "";
    el("lbMe").textContent = lastRank ? `Lượt chơi vừa rồi của bạn: hạng ${lastRank}` : "";
    openOv("lbOv");
    try { renderBoard(await fetchBoard()) }
    catch(_){ el("lbList").innerHTML = '<li class="lb-empty">Chưa tải được bảng xếp hạng. Vui lòng kiểm tra mạng và thử lại.</li>' }
  }

  /* ---------- màn hình kết quả ---------- */
  async function onFinish({ score, correct, ms }){
    if (!player) return;
    el("endWho").textContent = `${player.name} · Khu phố ${player.kp} · ${mask(player.phone)}`;
    el("endTime").textContent = fmtTime(ms, true);
    const rk = el("endRank"); rk.className = "end-rank"; rk.textContent = "Đang ghi kết quả lên bảng xếp hạng…";
    try {
      const res = await submit({ name:player.name, phone:player.phone, kp:player.kp, score, correct, ms:Math.round(ms) });
      lastRank = res.rank;
      if (res.rank >= 1 && res.rank <= 3){ rk.classList.add("medal-line"); rk.innerHTML = star(res.rank) + `<span>Lượt chơi này đứng <b>hạng ${res.rank}</b> trên ${res.count} lượt chơi!</span>` }
      else rk.innerHTML = `Lượt chơi này đứng <b>hạng ${res.rank}</b> trên ${res.count} lượt chơi.`;
    } catch(_){
      rk.textContent = "Chưa gửi được kết quả (mất mạng?). Kết quả sẽ tự gửi lại ở lần mở game sau.";
    }
  }

  flushPending();
  return { openReg, bindReg, openBoard, onFinish, fmtTime, hasPlayer:() => !!player };
})();
