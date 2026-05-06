const GAS_URL = "https://script.google.com/macros/s/AKfycbw_9K8PimmNpeIf97V4-a4O8s_aWp9Od6nG2EG48E06ybhCikNZrF0XGTFzfWqZDw/exec";

let currentData = null;
let currentMember = "";
let latestPlanValues = [];

document.addEventListener("DOMContentLoaded", () => {
  showLoading(true);

  fetch(`${GAS_URL}?action=init`)
    .then(res => res.json())
    .then(res => {
      showLoading(false);

      if (!res.ok) {
        showToast(res.message || "初始化失敗");
        return;
      }

      renderMemberList(res.members || []);
      document.getElementById("fileInfo").textContent = "目前讀取資料：" + res.fileName;
    })
    .catch(err => {
      showLoading(false);
      showToast("初始化失敗：" + err.message);
    });
});

function renderMemberList(members) {
  const datalist = document.getElementById("memberList");
  datalist.innerHTML = "";

  members.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    datalist.appendChild(option);
  });
}

function queryMember() {
  const memberName = document.getElementById("memberInput").value.trim();

  if (!memberName) {
    showToast("請先選擇會員姓名");
    return;
  }

  currentMember = memberName;
  showLoading(true);

  fetch(`${GAS_URL}?action=query&memberName=${encodeURIComponent(memberName)}`)
    .then(res => res.json())
    .then(res => {
      showLoading(false);

      if (!res.ok) {
        showToast(res.message || "查詢失敗");
        return;
      }

      currentData = res;
      latestPlanValues = res.planValues || [];
      renderResult(res);
    })
    .catch(err => {
      showLoading(false);
      showToast("查詢失敗：" + err.message);
    });
}

function updatePlan() {
  if (!currentMember) {
    showToast("請先查詢會員");
    return;
  }

  const inputs = document.querySelectorAll(".plan-input");
  const values = latestPlanValues.slice();

  inputs.forEach(input => {
    const index = Number(input.dataset.index);
    values[index] = input.value;
  });

  showLoading(true);

  fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "updatePlan",
      memberName: currentMember,
      planValues: values
    })
  })
    .then(res => res.json())
    .then(res => {
      showLoading(false);

      if (!res.ok) {
        showToast(res.message || "重新試算失敗");
        return;
      }

      currentData = res;
      latestPlanValues = res.planValues || [];
      renderResult(res);
      showToast("已重新試算");
    })
    .catch(err => {
      showLoading(false);
      showToast("重新試算失敗：" + err.message);
    });
}

function renderResult(data) {
  document.getElementById("resultArea").classList.remove("hidden");

  document.getElementById("resultName").textContent = data.memberName || "—";
  document.getElementById("scoreNumber").textContent = data.currentScore || "—";
  document.getElementById("lightText").textContent = data.light ? data.light.text : "—";

  const badge = document.getElementById("scoreBadge");
  badge.className = "score-badge " + (data.light ? data.light.className : "");

  document.getElementById("monthText").textContent = data.month || "—";
  document.getElementById("unpostedWeeksText").textContent = data.unpostedWeeks || "—";
  document.getElementById("targetScoreText").textContent = data.targetScore || "—";

  renderPlanInputs(data.planHeaders || [], data.planValues || []);
  renderShortfall(data.planHeaders || [], data.shortfallLabels || [], data.shortfallValues || []);
  renderHalf(data.halfHeaders || [], data.halfValues || []);

  document.getElementById("copyText").value = data.copyText || "";
}

function renderPlanInputs(headers, values) {
  const area = document.getElementById("planInputs");
  area.innerHTML = "";

  headers.forEach((header, index) => {
    const label = String(header || "").trim();
    if (!label) return;

    const row = document.createElement("div");
    row.className = "plan-row";

    const lab = document.createElement("label");
    lab.textContent = label;

    const input = document.createElement("input");
    input.type = "number";
    input.inputMode = "numeric";
    input.className = "plan-input";
    input.dataset.index = index;
    input.value = normalizeNumber(values[index]);

    row.appendChild(lab);
    row.appendChild(input);
    area.appendChild(row);
  });
}

function renderShortfall(headers, labels, rows) {
  const area = document.getElementById("shortfallArea");
  area.innerHTML = "";

  labels.forEach((label, rowIndex) => {
    const card = document.createElement("div");
    card.className = "shortfall-card";

    const title = document.createElement("div");
    title.className = "shortfall-title";
    title.textContent = label || "—";

    const body = document.createElement("div");
    body.className = "shortfall-body";

    const row = rows[rowIndex] || [];

    headers.forEach((header, colIndex) => {
      const h = String(header || "").trim();
      const v = row[colIndex];

      if (!h) return;

      const item = document.createElement("div");
      item.className = "shortfall-item";
      item.innerHTML = `<span>${escapeHtml(h)}</span><strong>${escapeHtml(v || "0")}</strong>`;

      body.appendChild(item);
    });

    card.appendChild(title);
    card.appendChild(body);
    area.appendChild(card);
  });
}

function renderHalf(headers, values) {
  const area = document.getElementById("halfArea");
  area.innerHTML = "";

  headers.forEach((header, index) => {
    const h = String(header || "").trim();
    if (!h) return;

    const item = document.createElement("div");
    item.className = "half-item";
    item.innerHTML = `<span>${escapeHtml(h)}</span><strong>${escapeHtml(values[index] || "—")}</strong>`;

    area.appendChild(item);
  });
}

function copyReminder() {
  const text = document.getElementById("copyText");

  if (!text.value) {
    showToast("目前沒有可複製的提醒文字");
    return;
  }

  navigator.clipboard.writeText(text.value)
    .then(() => showToast("已複製提醒文字"))
    .catch(() => showToast("複製失敗，請手動選取文字"));
}

function showLoading(show) {
  document.getElementById("loading").classList.toggle("hidden", !show);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 2600);
}

function normalizeNumber(value) {
  if (value === null || typeof value === "undefined") return "";
  return String(value).replace(/,/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
