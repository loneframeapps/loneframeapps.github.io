(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  var cards = [];
  var running = false;

  function maxAngle() {
    return window.matchMedia("(max-width: 719px)").matches ? 4 : 6;
  }

  function attachCard(card) {
    var state = {
      card: card,
      targetX: 0,
      targetY: 0,
      currX: 0,
      currY: 0,
      velX: 0,
      velY: 0,
      active: false,
      pressing: false,
      startX: 0,
      startY: 0,
      canceled: false
    };

    function setSheen(px, py) {
      card.style.setProperty("--sheen-x", px * 100 + "%");
      card.style.setProperty("--sheen-y", py * 100 + "%");
    }

    function aimFromEvent(event, angle) {
      var rect = card.getBoundingClientRect();
      var w = rect.width || 1;
      var h = rect.height || 1;
      var px = (event.clientX - rect.left) / w;
      var py = (event.clientY - rect.top) / h;
      if (px < 0) px = 0;
      else if (px > 1) px = 1;
      if (py < 0) py = 0;
      else if (py > 1) py = 1;
      state.targetY = (px - 0.5) * 2 * angle;
      state.targetX = (0.5 - py) * 2 * angle;
      setSheen(px, py);
    }

    function rest() {
      state.targetX = 0;
      state.targetY = 0;
      state.active = false;
      state.pressing = false;
      state.canceled = false;
      card.classList.remove("is-lit");
      startLoop();
    }

    function onFineMove(event) {
      if (reduce.matches) return;
      aimFromEvent(event, maxAngle());
      state.active = true;
      card.classList.add("is-lit");
      startLoop();
    }

    function onFineEnter(event) {
      if (reduce.matches) return;
      onFineMove(event);
    }

    function onFineLeave() {
      rest();
    }

    function onCoarseDown(event) {
      if (reduce.matches || finePointer.matches) return;
      if (event.pointerType === "mouse") return;
      state.pressing = true;
      state.canceled = false;
      state.startX = event.clientX;
      state.startY = event.clientY;
      aimFromEvent(event, Math.min(4, maxAngle()));
      state.active = true;
      card.classList.add("is-lit");
      startLoop();
    }

    function onCoarseMove(event) {
      if (!state.pressing || state.canceled) return;
      var dx = event.clientX - state.startX;
      var dy = event.clientY - state.startY;
      if (dx * dx + dy * dy > 100) {
        state.canceled = true;
        rest();
      }
    }

    function onCoarseUp() {
      if (!state.pressing) return;
      rest();
    }

    card.addEventListener("pointerenter", onFineEnter);
    card.addEventListener("pointermove", function (event) {
      if (finePointer.matches) onFineMove(event);
      else onCoarseMove(event);
    });
    card.addEventListener("pointerleave", onFineLeave);
    card.addEventListener("pointerdown", onCoarseDown);
    card.addEventListener("pointerup", onCoarseUp);
    card.addEventListener("pointercancel", onCoarseUp);

    cards.push(state);
  }

  function tick() {
    running = false;
    if (reduce.matches) {
      resetAll();
      return;
    }

    var stiffness = 0.16;
    var damping = 0.72;
    var moving = false;

    for (var i = 0; i < cards.length; i++) {
      var s = cards[i];
      s.velX = (s.velX + (s.targetX - s.currX) * stiffness) * damping;
      s.velY = (s.velY + (s.targetY - s.currY) * stiffness) * damping;
      s.currX += s.velX;
      s.currY += s.velY;

      if (
        Math.abs(s.velX) > 0.01 ||
        Math.abs(s.velY) > 0.01 ||
        Math.abs(s.targetX - s.currX) > 0.01 ||
        Math.abs(s.targetY - s.currY) > 0.01
      ) {
        moving = true;
      } else {
        s.currX = s.targetX;
        s.currY = s.targetY;
        s.velX = 0;
        s.velY = 0;
      }

      s.card.style.setProperty("--tilt-x", s.currX.toFixed(3) + "deg");
      s.card.style.setProperty("--tilt-y", s.currY.toFixed(3) + "deg");
    }

    if (moving) startLoop();
  }

  function startLoop() {
    if (running) return;
    running = true;
    window.requestAnimationFrame(tick);
  }

  function resetAll() {
    for (var i = 0; i < cards.length; i++) {
      var s = cards[i];
      s.targetX = 0;
      s.targetY = 0;
      s.currX = 0;
      s.currY = 0;
      s.velX = 0;
      s.velY = 0;
      s.active = false;
      s.pressing = false;
      s.card.classList.remove("is-lit");
      s.card.style.setProperty("--tilt-x", "0deg");
      s.card.style.setProperty("--tilt-y", "0deg");
    }
  }

  function init() {
    var nodes = document.querySelectorAll(".tilt-card");
    for (var i = 0; i < nodes.length; i++) attachCard(nodes[i]);
    if (reduce.addEventListener) {
      reduce.addEventListener("change", function () {
        if (reduce.matches) resetAll();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
