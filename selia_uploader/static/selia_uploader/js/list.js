function intializeIsOwnFilter() {
  var filterForm = document.getElementById('filter_form');
  var sort_submit = document.getElementsByClassName('sort_submit');
  var mine_submit = document.getElementById('id_is_own');

  if (!(filterForm)) return;

  if (sort_submit.length > 0) {
    sort_submit[0].onchange = function() {
      filterForm.submit();
    };
  }

  if (mine_submit){
    mine_submit.addEventListener('change',function(event){
      if (this.checked){
        document.getElementById('id_is_own_field').value = "on";
      } else {
        document.getElementById('id_is_own_field').value = "";
      }
      filterForm.submit();
    });
  }
}

function initializeDatePickers() {
  var datepicker = document.getElementById('ui-datepicker-div');

  if (datepicker) {
    function hide_if_pressed_and_shown(ddown, event) {
      if (datepicker.style.display != 'none') {
        event.preventDefault();
        datepicker.style.display = 'none';

        if ($(ddown).hasClass('show')) {
          $(ddown).removeClass('show');
          $(ddown.querySelector('.dropdown-menu')).removeClass('show');
        }
      }
    }

    function hide_if_not_datepicker(ddown, event) {
      if (datepicker.style.display == 'block') {
        event.preventDefault();
      }
    }

    var drop_downs = document.getElementsByClassName('dropdown');
    for (var i = 0; i < drop_downs.length; i++) {
      if (drop_downs[i].querySelector('.datepicker')) {
        $(drop_downs[i]).on('hide.bs.dropdown', function(e) {
          hide_if_not_datepicker(this, e);
        });
        $(drop_downs[i].querySelector('.dropdown-toggle')).on('click', function(
          e,
        ) {
          hide_if_pressed_and_shown(drop_downs[i], e);
        });
      } else {
        $(drop_downs[i].querySelector('.dropdown-toggle')).on('click', function(
          e,
        ) {
          if (datepicker.style.display != 'none') {
            datepicker.style.display = 'none';
          }
        });
      }
    }
  }
}

$(document).on('click', '.ui-datepicker*', function(e) {
  e.stopPropagation();
});

$(document).on('click', '.dropdown-menu select*', function(e) {
  e.stopPropagation();
});

document.addEventListener('DOMContentLoaded', () => {
  intializeIsOwnFilter();
  initializeDatePickers();
});
