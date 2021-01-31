(() => {
  // source/wp-content/plugins/anti-spam/assets/js/anti-spam.js
  "use strict";
  (function() {
    jQuery(document).ready(function($) {
      var answer = $(".wantispam-control-a").val(), current_year = new Date().getFullYear(), dynamic_control = $("<input>");
      dynamic_control.attr("type", "hidden");
      dynamic_control.attr("name", "wantispam_d");
      dynamic_control.addClass("wantispam-control").addClass("wantispam-control-d");
      dynamic_control.val(current_year);
      $(".wantispam-required-fields").each(function() {
        if (!$(this).hasClass("wantispam-form-processed")) {
          $(".wantispam-group", $(this)).hide();
          $(".wantispam-control-j", $(this)).val("on");
          $(".wantispam-control-q", $(this)).val(answer);
          $(".wantispam-control-e", $(this)).val("");
          $(this).append(dynamic_control.clone());
          $(this).addClass("wantispam-form-processed");
        }
      });
    });
  })();
})();
