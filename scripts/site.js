(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  if (header) {
    var stuck = function () {
      header.classList.toggle("is-stuck", window.scrollY > 4);
    };
    stuck();
    window.addEventListener("scroll", stuck, { passive: true });
  }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  var videos = document.querySelectorAll("video.demo-clip");
  var setMotion = function () {
    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      if (reduce.matches) {
        v.pause();
        v.removeAttribute("autoplay");
      } else {
        v.setAttribute("autoplay", "");
        var play = v.play();
        if (play && play.catch) play.catch(function () {});
      }
    }
  };
  setMotion();
  if (reduce.addEventListener) reduce.addEventListener("change", setMotion);

  var flip = document.getElementById("flip");
  if (!flip) return;

  var words = flip.querySelectorAll("[data-word]");
  if (!words.length) return;

  if (reduce.matches) {
    for (var i = 0; i < words.length; i++) words[i].classList.remove("is-on");
    words[0].classList.add("is-on");
    return;
  }

  var index = 0;
  window.setInterval(function () {
    words[index].classList.remove("is-on");
    index = (index + 1) % words.length;
    words[index].classList.add("is-on");
  }, 2400);
})();
