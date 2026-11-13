/* Aula — SCORM bridge
 * Minimal, dependency-free connector that talks to a Moodle SCORM
 * runtime (SCORM 2004 / API_1484_11 first, falling back to 1.2 / API).
 *
 * Exposes window.AulaSCORM with:
 *   .available        boolean — was an LMS API found?
 *   .init()           call once on load (LMSInitialize / Initialize)
 *   .setProgress(p)   p in 0..1 — best-effort progress_measure
 *   .complete()       mark completed + passed, commit, return true on success
 *   .exit()           terminate the session
 *
 * If no LMS API is present (e.g. previewing the HTML directly), every
 * method degrades gracefully and complete() returns false — the UI
 * still shows its "concluída" state so authors can preview the flow.
 */
(function () {
  "use strict";

  var api = null;     // the discovered API object
  var version = null; // "2004" | "1.2"
  var started = false;

  // Walk up the window hierarchy (incl. opener) looking for an API.
  function findAPI(win, names) {
    var tries = 0;
    while (win && tries < 12) {
      try {
        for (var i = 0; i < names.length; i++) {
          if (win[names[i]]) return { obj: win[names[i]], name: names[i] };
        }
      } catch (e) {
        // Cross-origin parent (e.g. design preview) — can't read it; stop walking up.
        return null;
      }
      if (win.parent && win.parent !== win) { win = win.parent; tries++; }
      else break;
    }
    return null;
  }

  function discover() {
    if (api) return api;
    var found = findAPI(window, ["API_1484_11"]); // SCORM 2004
    if (found) { api = found.obj; version = "2004"; return api; }
    found = findAPI(window, ["API"]);             // SCORM 1.2
    if (found) { api = found.obj; version = "1.2"; return api; }
    // Try the opener window (Moodle sometimes launches in a popup)
    if (window.opener) {
      try {
        found = findAPI(window.opener, ["API_1484_11"]);
        if (found) { api = found.obj; version = "2004"; return api; }
        found = findAPI(window.opener, ["API"]);
        if (found) { api = found.obj; version = "1.2"; return api; }
      } catch (e) { /* cross-origin opener — ignore */ }
    }
    return null;
  }

  function call(fn2004, fn12, arg1, arg2) {
    var a = discover();
    if (!a) return "";
    try {
      if (version === "2004") return arg2 !== undefined ? a[fn2004](arg1, arg2) : (arg1 !== undefined ? a[fn2004](arg1) : a[fn2004](""));
      return arg2 !== undefined ? a[fn12](arg1, arg2) : (arg1 !== undefined ? a[fn12](arg1) : a[fn12](""));
    } catch (e) { return ""; }
  }

  function setValue(el2004, el12, val) {
    var a = discover();
    if (!a) return false;
    try {
      var result = version === "2004" ? a.SetValue(el2004, val) : a.LMSSetValue(el12, val);
      return result === "true" || result === true;
    } catch (e) { return false; }
  }

  function getValue(el2004, el12) {
    var a = discover();
    if (!a) return "";
    try {
      return version === "2004" ? a.GetValue(el2004) : a.LMSGetValue(el12);
    } catch (e) { return ""; }
  }

  function commit() {
    var a = discover();
    if (!a) return false;
    try {
      var result = version === "2004" ? a.Commit("") : a.LMSCommit("");
      return result === "true" || result === true;
    } catch (e) { return false; }
  }

  var AulaSCORM = {
    get available() { return !!discover(); },
    get version() { return version; },

    init: function () {
      var a = discover();
      if (!a || started) return started;
      try {
        var r = version === "2004" ? a.Initialize("") : a.LMSInitialize("");
        started = (r === "true" || r === true);
        if (started && version === "2004") {
          // Only initialize a new attempt. Never downgrade a completed session
          // when the learner reopens the SCO.
          var status = getValue("cmi.completion_status", null);
          if (!status || status === "unknown" || status === "not attempted") {
            setValue("cmi.completion_status", null, "incomplete");
          }
        }
      } catch (e) { started = false; }
      return started;
    },

    setProgress: function (p) {
      if (!discover()) return false;
      var clamped = Math.max(0, Math.min(1, p || 0));
      if (version === "2004") {
        setValue("cmi.progress_measure", null, String(clamped));
      } else {
        // 1.2 has no native progress; stash in a suspend-friendly slot
        setValue(null, "cmi.core.lesson_location", String(Math.round(clamped * 100)));
      }
      return commit();
    },

    complete: function () {
      if (!discover()) return false;
      if (!started) this.init();
      var ok = false;
      if (version === "2004") {
        ok = setValue("cmi.completion_status", null, "completed");
        setValue("cmi.success_status", null, "passed");
        setValue("cmi.progress_measure", null, "1");
      } else {
        ok = setValue(null, "cmi.core.lesson_status", "completed");
      }
      commit();
      return ok;
    },

    // Report a graded score on a 0–10 scale (Aula convention for avaliativo quizzes).
    //   nota10  — the learner's grade from 0 to 10
    //   passed  — boolean; if omitted, defaults to nota10 >= 6
    // Sets the 0–10 raw score with min 0 / max 10 on both SCORM versions,
    // plus the normalized scaled score (0–1) required by SCORM 2004.
    score: function (nota10, passed) {
      if (!discover()) return false;
      if (!started) this.init();
      var nota = Math.max(0, Math.min(10, Number(nota10) || 0));
      var ok = (typeof passed === "boolean") ? passed : nota >= 6;
      if (version === "2004") {
        setValue("cmi.score.min", null, "0");
        setValue("cmi.score.max", null, "10");
        setValue("cmi.score.raw", null, String(nota));
        setValue("cmi.score.scaled", null, String(nota / 10)); // 0–1, required by 2004
        setValue("cmi.success_status", null, ok ? "passed" : "failed");
        setValue("cmi.completion_status", null, "completed");
      } else {
        // SCORM 1.2 score range is 0–100 by spec; Moodle scales it back to the
        // activity's max grade. We report the 0–10 value with explicit min/max.
        setValue(null, "cmi.core.score.min", "0");
        setValue(null, "cmi.core.score.max", "10");
        setValue(null, "cmi.core.score.raw", String(nota));
        setValue(null, "cmi.core.lesson_status", ok ? "passed" : "failed");
      }
      commit();
      return true;
    },

    exit: function () {
      var a = discover();
      if (!a || !started) return false;
      try {
        if (version === "2004") { a.SetValue("cmi.exit", "normal"); a.Commit(""); a.Terminate(""); }
        else { a.LMSCommit(""); a.LMSFinish(""); }
        started = false;
        return true;
      } catch (e) { return false; }
    },
  };

  // Auto-init on load and terminate on unload — the standard SCORM lifecycle.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { AulaSCORM.init(); });
  } else {
    AulaSCORM.init();
  }
  window.addEventListener("unload", function () { try { AulaSCORM.exit(); } catch (e) {} });

  window.AulaSCORM = AulaSCORM;
})();
