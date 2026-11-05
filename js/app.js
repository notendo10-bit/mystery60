(function () {
  "use strict";

  var CASES = window.M60_CASES;
  var STORE_KEY = "m60.progress.v2";
  var LABELS = ["A", "B", "C", "D", "E"];
  var app = document.getElementById("app");
  var timer = null;

  /* ---------- 保存 ---------- */
  function load() {
    try {
      var data = JSON.parse(localStorage.getItem(STORE_KEY));
      if (data && data.cases) return data;
    } catch (e) { /* 保存が使えない環境でも遊べるようにする */ }
    return { cases: {} };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (e) { /* 同上 */ }
  }
  var progress = load();

  /* ---------- DOM ヘルパー ---------- */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === "class") node.className = attrs[key];
      else if (key === "text") node.textContent = attrs[key];
      else if (key === "on") Object.keys(attrs.on).forEach(function (ev) { node.addEventListener(ev, attrs.on[ev]); });
      else node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) { if (child) node.appendChild(child); });
    return node;
  }
  function paragraphs(list) {
    return list.map(function (text) { return el("p", { text: text }); });
  }
  function button(text, cls, handler) {
    return el("button", { type: "button", class: cls, text: text, on: { click: handler } });
  }

  function indexOfCase(id) {
    for (var i = 0; i < CASES.length; i++) if (CASES[i].id === id) return i;
    return -1;
  }
  function caseNo(i) { return "CASE " + String(i + 1).padStart(2, "0"); }
  function solvedCount() {
    return CASES.filter(function (c) { return progress.cases[c.id]; }).length;
  }
  function firstUnsolved(fromIndex) {
    for (var i = 0; i < CASES.length; i++) {
      var c = CASES[(fromIndex + i) % CASES.length];
      if (!progress.cases[c.id]) return (fromIndex + i) % CASES.length;
    }
    return -1;
  }
  function stateLabel(record) {
    if (!record) return "";
    if (record.status === "revealed") return "真相を見た";
    var text = record.firstTry ? "一度で解決" : "解決";
    return record.seconds <= 60 ? text + "・60秒以内" : text;
  }

  function show(view, title) {
    stopTimer();
    app.textContent = "";
    app.appendChild(view);
    document.title = title ? title + "｜MYSTERY 60" : "MYSTERY 60｜60秒の謎。解けたら、もう一問。";
    window.scrollTo(0, 0);
    view.focus({ preventScroll: true });
  }

  /* ---------- ホーム ---------- */
  function renderHome() {
    var done = solvedCount();
    var nextIndex = firstUnsolved(0);

    var list = el("ol", { class: "case-list" }, CASES.map(function (c, i) {
      var record = progress.cases[c.id];
      return el("li", {}, [
        el("button", {
          type: "button", class: "case-link",
          on: { click: function () { location.hash = "#/case/" + c.id; } }
        }, [
          el("img", { src: c.image.src.replace(".webp", "-thumb.webp"), alt: "", width: 224, height: 168, loading: "lazy" }),
          el("span", { class: "case-meta" }, [
            el("span", { class: "case-no", text: caseNo(i) }),
            el("span", { class: "case-title", text: c.title }),
            el("span", { class: "case-genre" }, [
              document.createTextNode(c.genre),
              record ? el("span", { class: "case-state", text: "　" + stateLabel(record) }) : null
            ])
          ])
        ])
      ]);
    }));

    var view = el("main", { class: "view fade", tabindex: "-1" }, [
      el("section", { class: "hero" }, [
        el("img", { src: "images/hero.webp", alt: "", width: 1200, height: 800 }),
        el("div", { class: "hero-text" }, [
          el("h1", { text: "MYSTERY 60" }),
          el("p", { text: "60秒の謎。解けたら、もう一問。" })
        ])
      ]),
      el("div", { class: "home-body" }, [
        el("p", { class: "progress-row" }, [
          el("span", { text: done + " / " + CASES.length + " 件" }),
          el("span", { class: "progress-bar" }, [el("i", { style: "width:" + (done / CASES.length * 100) + "%" })])
        ]),
        nextIndex === -1 ? el("div", { class: "complete" }, [
          el("strong", { text: "全ての事件を見届けました。" }),
          el("span", { text: "読み返すと、最初に見えなかったものが見えるかもしれません。" })
        ]) : button(
          done === 0 ? "最初の事件を開く" : "続きから：" + CASES[nextIndex].title,
          "btn primary resume",
          function () { location.hash = "#/case/" + CASES[nextIndex].id; }
        ),
        list,
        el("div", { class: "home-foot" }, [
          el("p", { text: "すべて創作です。実在の人物・団体とは関係ありません。画像はAIで生成し、一部を加工しています。進み具合はこの端末のブラウザにだけ保存されます。" }),
          done ? button("進み具合を消す", "text-button", function () {
            if (window.confirm("進み具合を消して、最初からにしますか？")) {
              progress = { cases: {} };
              save();
              renderHome();
            }
          }) : null
        ])
      ])
    ]);
    show(view);
  }

  /* ---------- 事件 ---------- */
  function normalizeNumber(value) {
    var text = String(value).replace(/[０-９]/g, function (d) {
      return String.fromCharCode(d.charCodeAt(0) - 0xFEE0);
    });
    var kanji = { "七": "7", "九": "9", "五": "5", "六": "6", "八": "8", "十": "10" };
    text = text.replace(/[七九五六八十]/g, function (k) { return kanji[k]; });
    var match = text.match(/\d+/);
    return match ? String(parseInt(match[0], 10)) : "";
  }

  function renderCase(index) {
    var c = CASES[index];
    var wrongCount = 0;
    var startedAt = Date.now();
    var answered = false;

    var clock = el("span", { class: "clock", text: "60" });
    var timeLine = el("span", { class: "time-line", "aria-hidden": "true" });
    var topbar = el("div", { class: "topbar" }, [
      button("← 事件一覧", "", function () { location.hash = "#/"; }),
      el("span", { class: "case-no", text: caseNo(index) + " / " + CASES.length }),
      clock,
      timeLine
    ]);

    function elapsed() { return Math.round((Date.now() - startedAt) / 1000); }

    var image = c.image;
    var figure = el("figure", { class: "figure" }, [
      el("button", {
        type: "button",
        "aria-label": "画像を拡大する",
        on: { click: function () { openViewer(image.src, image.alt); } }
      }, [
        el("img", { src: image.src, alt: image.alt, width: image.w, height: image.h, decoding: "async", class: "scene-img" })
      ]),
      image.zoomHint ? el("figcaption", { text: image.zoomHint }) : null
    ]);

    var answerArea = el("div", { class: "answer-area" });
    var feedbackArea = el("div", { "aria-live": "polite" });
    var verdictArea = el("div");

    function finish(status) {
      if (answered) return;
      answered = true;
      stopTimer();
      var seconds = elapsed();
      clock.textContent = status === "solved" ? seconds + "秒" : "";
      timeLine.style.display = "none";
      var previous = progress.cases[c.id];
      var record = { status: status, firstTry: status === "solved" && wrongCount === 0, seconds: seconds };
      // 一度解いた記録は、後から真相を見ただけでは下げない
      if (!previous || previous.status !== "solved" || (status === "solved" && seconds < previous.seconds)) {
        progress.cases[c.id] = record;
        save();
      }
      feedbackArea.textContent = "";
      Array.prototype.forEach.call(answerArea.querySelectorAll("button, input"), function (control) { control.disabled = true; });
      renderVerdict(status, seconds);
    }

    function renderVerdict(status, seconds) {
      var nextIndex = firstUnsolved((index + 1) % CASES.length);
      var head = status === "solved"
        ? el("h2", { class: "verdict-head", text: wrongCount === 0 ? "正解。" : "正解。たどり着いた。" })
        : el("h2", { class: "verdict-head neutral", text: "真相" });
      var sub = status === "solved"
        ? el("p", { class: "verdict-sub", text: "推理時間 " + seconds + "秒" + (seconds <= 60 ? "。60秒以内に解決。" : "") })
        : null;

      var nextButton = nextIndex === -1
        ? button("事件一覧へ戻る", "btn primary wide", function () { location.hash = "#/"; })
        : button("次の事件へ：" + CASES[nextIndex].title, "btn primary wide", function () {
            location.hash = "#/case/" + CASES[nextIndex].id;
          });

      var block = el("section", { class: "verdict fade" }, [
        head,
        sub,
        el("div", { class: "truth" }, (status === "solved" ? [el("h3", { class: "block-label", text: "真相" })] : []).concat(paragraphs(c.truth))),
        el("div", { class: "after" }, paragraphs(c.after)),
        c.note ? el("details", { class: "note" }, [
          el("summary", { text: "この話に出てきた、本当のこと" }),
          el("p", { text: c.note })
        ]) : null,
        el("div", { class: "next-row" }, [
          nextButton,
          button("事件一覧へ", "btn wide", function () { location.hash = "#/"; })
        ])
      ]);
      verdictArea.appendChild(block);
      block.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function renderWrong(message) {
      wrongCount++;
      feedbackArea.textContent = "";
      var box = el("div", { class: "feedback fade", id: "feedback" }, [
        el("p", { class: "head", text: "違う。" }),
        el("p", { text: message }),
        el("div", { class: "row" }, [
          button("もう一度考える", "btn", function () {
            feedbackArea.textContent = "";
            var again = answerArea.querySelector(".choice:not(:disabled), input");
            if (again) again.focus();
          }),
          button("真相を見る", "btn", function () { finish("revealed"); })
        ])
      ]);
      feedbackArea.appendChild(box);
      box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    if (c.choices) {
      answerArea.appendChild(el("ol", { class: "choices" }, c.choices.map(function (choice, n) {
        var btn = el("button", {
          type: "button", class: "choice", on: {
            click: function () {
              if (answered) return;
              if (choice.correct) {
                btn.classList.add("is-right");
                Array.prototype.forEach.call(answerArea.querySelectorAll(".choice"), function (b) { b.disabled = true; });
                finish("solved");
              } else {
                btn.classList.add("is-wrong");
                btn.disabled = true;
                renderWrong(choice.rebut);
              }
            }
          }
        }, [el("b", { text: LABELS[n] }), el("span", { text: choice.text })]);
        return el("li", {}, [btn]);
      })));
    } else {
      var input = el("input", {
        type: "text", inputmode: "numeric", autocomplete: "off",
        placeholder: c.input.placeholder, "aria-label": "時刻（数字）", id: "answer-input"
      });
      var form = el("form", {
        class: "answer-form", on: {
          submit: function (event) {
            event.preventDefault();
            if (answered) return;
            var value = normalizeNumber(input.value);
            if (!value) { input.focus(); return; }
            if (value === String(c.input.answer)) {
              input.disabled = true;
              form.querySelector("button").disabled = true;
              finish("solved");
            } else {
              renderWrong(c.input.hints[value] || c.input.hints["default"]);
            }
          }
        }
      }, [
        el("label", {}, [input, el("span", { text: c.input.unit })]),
        el("button", { type: "submit", class: "btn primary", text: "推理を確かめる" })
      ]);
      answerArea.appendChild(form);
    }

    var view = el("main", { class: "view fade", tabindex: "-1" }, [
      topbar,
      el("header", { class: "case-head" }, [
        el("p", { class: "kicker", text: c.genre }),
        el("h1", { text: c.title })
      ]),
      el("div", { class: "scene" + (image.h > image.w ? " tall" : "") }, [figure]),
      el("div", { class: "reading" }, [
        el("div", { class: "story" }, paragraphs(c.story)),
        el("h2", { class: "block-label", text: "手がかり" }),
        el("ul", { class: "clues" }, c.clues.map(function (clue, n) {
          return el("li", {}, [el("span", { text: String(n + 1) }), el("div", { text: clue })]);
        })),
        el("h2", { class: "question", text: c.question }),
        answerArea,
        feedbackArea,
        verdictArea
      ])
    ]);
    show(view, c.title);

    // 時間切れでも負けにはしない。60秒の目安を静かに見せるだけ。
    timer = setInterval(function () {
      var left = 60 - elapsed();
      if (left > 0) {
        clock.textContent = String(left);
        timeLine.style.transform = "scaleX(" + left / 60 + ")";
      } else {
        clock.textContent = "60秒経過";
        timeLine.style.display = "none";
        stopTimer();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  /* ---------- 画像の拡大 ---------- */
  var viewer = document.getElementById("viewer");
  var viewerImg = document.getElementById("viewer-img");
  function openViewer(src, alt) {
    viewerImg.src = src;
    viewerImg.alt = alt;
    if (viewer.showModal) viewer.showModal();
    else viewer.setAttribute("open", "");
  }
  function closeViewer() {
    if (viewer.close) viewer.close();
    else viewer.removeAttribute("open");
  }
  document.getElementById("viewer-close").addEventListener("click", closeViewer);
  viewer.addEventListener("click", function (event) {
    if (event.target === viewer || event.target.id === "viewer-scroll") closeViewer();
  });

  /* ---------- ルーティング ---------- */
  function route() {
    if (viewer.open) closeViewer();
    var match = location.hash.match(/^#\/case\/([\w-]+)/);
    var index = match ? indexOfCase(match[1]) : -1;
    if (index >= 0) renderCase(index);
    else renderHome();
  }
  window.addEventListener("hashchange", route);
  route();
})();
