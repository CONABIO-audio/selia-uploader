class FileUploader {
	constructor(parent,form,item_types,tz_info,started_on,ended_on,title){
		this.started_on = started_on;
		this.site_timezone = tz_info["site_timezone"];
		this.tz_list = tz_info["tz_list"]
		this.ended_on = ended_on;
		this.parent = parent;
		this.item_types = item_types;
		this.mime_types = [];
		for (var i=0;i<this.item_types.length;i++){
			for (var j=0;j<this.item_types[i].mime_types.length;j++){
				this.mime_types.push(this.item_types[i].mime_types[j].mime_type)
			}
		}
		this.form = form;
		this.title = title;
		this.wavesurfer = null;
		this.initialize();
	}

	initialize() {
		this.files = [];
		this.last_id = 0;
		this.file_page_number = 1;
		this.duplicate_page_number = 1;
		this.error_page_number = 1;
		this.upload_page_number = 1;
		this.total_file_pages = 0;
		this.total_duplicate_pages = 0;
		this.total_error_pages = 0;
		this.total_upload_pages = 0;
		this.per_page = 10;

		this.files_sort_by = {"field":"Archivo","order":"desc","function":this.compare_file_names_desc};
		this.errors_sort_by = {"field":"Archivo","order":"desc","function":this.compare_file_names_desc};
		this.duplicates_sort_by = {"field":"Archivo","order":"desc","function":this.compare_file_names_desc};
		this.uploads_sort_by = {"field":"Archivo","order":"desc","function":this.compare_file_names_desc};
		this.build_view();

		var widget = this;

		document.addEventListener('dragover',function(e){
			if (!e.target.id){
				e.stopPropagation();
				e.preventDefault();
			} else if (e.target.id != "file_list_col"){
				e.stopPropagation();
				e.preventDefault();
			}
		});
		document.addEventListener('drop',function(e){
			if (!e.target.id){
				e.stopPropagation();
				e.preventDefault();
			} else if (e.target.id != "file_list_col"){
				e.stopPropagation();
				e.preventDefault();
			}
		});
	}
	build_view() {
		this.build_top_toolbar();
		this.build_progress_bar();
		this.build_wavesurfer();
		this.build_body();
	}
	build_wavesurfer() {
		this.waveform_container = document.createElement('div');
		this.waveform_container.className = "modal fade";
		this.waveform_container.role = "dialog";


		var waveform_dialog = document.createElement('div');
		waveform_dialog.className = "modal-dialog modal-xl modal-dialog-centered ";

		var waveform_content = document.createElement('div');
		waveform_content.className = "modal-content";
		waveform_content.style["overflow-x"] = "auto";
		waveform_content.style["background-color"] = "black";

		var waveform_header = document.createElement('div');
		waveform_header.className = "modal-header";

		var closebtn = document.createElement('button');
		closebtn.type = "button";
		closebtn.className = "close text-light";
		closebtn.setAttribute('data-dismiss','modal');
		closebtn.innerHTML = "&times;";


		this.waveform_title = document.createElement('h4');
		this.waveform_title.style.width = "600px";
		this.waveform_title.className = "modal-title ellipsise text-light";


		waveform_header.appendChild(this.waveform_title);
		waveform_header.appendChild(closebtn);


		var waveform_body = document.createElement('div');
		waveform_body.className = "modal-body";
		waveform_body.style["margin-left"] = "auto";
		waveform_body.style["margin-right"] = "auto";

		var waveform = document.createElement('div');
		waveform.className = "rounded";
		waveform.style["background-color"] = "black";
		waveform.id = "waveform";

		var waveform_spec = document.createElement('div');
		waveform_spec.id = "wave-spectrogram"

		this.waveform_time = document.createElement('h5');
		this.waveform_time.className = "text-light text-center"
		this.waveform_time.style["padding-top"] = "20px";
		this.waveform_time.id = "remainingTime";

		waveform_body.appendChild(waveform_spec);
		waveform_body.appendChild(waveform);

		var waveform_footer = document.createElement('div');
		waveform_footer.className = "modal-footer";
		waveform_footer.style["margin-left"] = "auto";
		waveform_footer.style["margin-right"] = "auto";

		this.playpause = document.createElement('button');
		this.playpause.className = "rounded";
		this.playpause.innerHTML = "<i class='fas fa-pause'></i>";

		var rewind = document.createElement('button');
		rewind.className = "rounded";
		rewind.innerHTML = "<i class='fas fa-backward'></i>";

		waveform_footer.appendChild(rewind);
		waveform_footer.appendChild(this.playpause);

		waveform_content.appendChild(waveform_header);
		waveform_content.appendChild(waveform_body);
		waveform_content.appendChild(this.waveform_time);
		waveform_content.appendChild(waveform_footer);
		waveform_dialog.appendChild(waveform_content);

		var widget = this;
		$(this.waveform_container).on('hidden.bs.modal', function () {
    		widget.wavesurfer.pause();
    		widget.playpause.innerHTML = "<i class='fas fa-play'></i>";
		});


		$(this.waveform_container).on('shown.bs.modal', function () {
    		$('html').css("cursor", "auto");
		});

		rewind.onclick = function(event){
			widget.wavesurfer.seekTo(0);
		}
		this.playpause.onclick = function(event){
			if (widget.wavesurfer.isPlaying()){
				widget.wavesurfer.pause();
			} else {
				widget.wavesurfer.play();
			}
		}

		this.waveform_container.appendChild(waveform_dialog);
	}
	build_progress_bar() {

		this.progress_container = document.createElement('div');
		this.progress_container.className = "row p-2 w-100";
		this.progress_container.style.display = "none";

		var progress_outer = document.createElement('div');
		progress_outer.className = "progress w-100";

		this.progress_bar = document.createElement('div');
		this.progress_bar.className = "progress-bar progress-bar-success progress-bar-striped";
		this.progress_bar.role = "progressbar";
		this.progress_bar.style.width = "5%";
		this.progress_bar.setAttribute('aria-valuenow','5');
		this.progress_bar.setAttribute('aria-valuemin','0');
		this.progress_bar.setAttribute('aria-valuemax','100');

		this.progress_bar_label = document.createElement('span');
		this.progress_bar_label.innerHTML = '5%';

		this.progress_bar.appendChild(this.progress_bar_label);
		progress_outer.appendChild(this.progress_bar);

		this.progress_container.appendChild(progress_outer);
	}
	build_top_toolbar() {
		if (this.top_toolbar){
			$(this.top_toolbar).remove();
		}
		var widget = this;

		this.top_toolbar = document.createElement('div');
		this.top_toolbar.className = 'row w-100';

		var toolbar_container = document.createElement('div');
		toolbar_container.className = "container-fluid p-2 w-100 bg-dark rounded";

		var row = document.createElement('div');
		row.className = "row";
		row.align = "center";
		row.style.padding = "10px";


		var file_picker_col = document.createElement('div');
		file_picker_col.className = "col";

		var file_btn = document.createElement('label');
		file_btn.htmlFor = "file_picker";
		file_btn.className ="upload_tool text-light";

		var add_label = document.createTextNode("Agregar ");
		var add_icon = document.createElement('i');
		add_icon.className = "fas fa-plus";
		file_btn.appendChild(add_label);
		file_btn.appendChild(add_icon);

		this.file_picker = document.createElement('input');
		this.file_picker.id = "file_picker";
		this.file_picker.type = "file";
		this.file_picker.style.display = "none";
		this.file_picker.setAttribute("multiple","");

		file_picker_col.appendChild(file_btn);
		file_picker_col.appendChild(this.file_picker);


		var upload_col = document.createElement('div');
		upload_col.className = "col";

		var upload_dropdown = document.createElement('div');
		upload_dropdown.className = "dropdown";

		var upload_anchor = document.createElement('a');
		upload_anchor.setAttribute('data-toggle','dropdown');
		upload_anchor.setAttribute('role','button');
		upload_anchor.setAttribute('aria-expanded',false);
		upload_anchor.setAttribute('aria-controls','collapseUpload')

		var upload_btn_label = document.createElement('label');
		upload_btn_label.className ="upload_tool text-light";
		var upload_label = document.createTextNode('Subir ');
		var upload_icon = document.createElement('i');

		upload_icon.className = "fas fa-upload";
		upload_btn_label.appendChild(upload_label);
		upload_btn_label.appendChild(upload_icon);

		upload_anchor.appendChild(upload_btn_label);
		upload_dropdown.appendChild(upload_anchor);

		var upload_dropdown_menu = document.createElement('div');
		upload_dropdown_menu.className = "dropdown-menu text-light";
		upload_dropdown_menu.style["background-color"] = "#454d54";
		upload_dropdown_menu.style.width = "auto";
		upload_dropdown_menu.setAttribute('aria-labelledby','dropdownMenuButton');

		var upload_dropdown_menu_inner = document.createElement('div');
		upload_dropdown_menu_inner.className = "container-fluid";

		var upload_all_btn_row = document.createElement('div');
		upload_all_btn_row.className = "row multi_option justify-content-center";

		this.upload_all_btn = document.createElement("a");
		this.upload_all_btn.innerHTML = "<h6>Listos</h6";
		upload_all_btn_row.appendChild(this.upload_all_btn);

		var upload_selected_btn_row = document.createElement('div');
		upload_selected_btn_row.className = "row multi_option justify-content-center";

		this.upload_selected_btn = document.createElement("a");
		this.upload_selected_btn.innerHTML = "<h6>Selección</h6>";
		upload_selected_btn_row.appendChild(this.upload_selected_btn);

		upload_dropdown_menu_inner.appendChild(upload_selected_btn_row);
		upload_dropdown_menu_inner.appendChild(upload_all_btn_row);

		upload_dropdown_menu.appendChild(upload_dropdown_menu_inner);
		upload_dropdown.appendChild(upload_dropdown_menu);

		upload_col.appendChild(upload_dropdown);



		var remove_col = document.createElement('div');
		remove_col.className = "col";

		var remove_dropdown = document.createElement('div');
		remove_dropdown.className = "dropdown";

		var remove_anchor = document.createElement('a');
		remove_anchor.setAttribute('data-toggle','dropdown');
		remove_anchor.setAttribute('role','button');
		remove_anchor.setAttribute('aria-expanded',false);
		remove_anchor.setAttribute('aria-controls','collapseUpload')

		var remove_btn_label = document.createElement('label');
		remove_btn_label.className ="upload_tool text-light";
		var remove_label = document.createTextNode('Cancelar ');
		var remove_icon = document.createElement('i');

		remove_icon.className = "fas fa-trash";
		remove_btn_label.appendChild(remove_label);
		remove_btn_label.appendChild(remove_icon);



		remove_anchor.appendChild(remove_btn_label);
		remove_dropdown.appendChild(remove_anchor);

		var remove_dropdown_menu = document.createElement('div');
		remove_dropdown_menu.className = "dropdown-menu text-light";
		remove_dropdown_menu.style["background-color"] = "#454d54";
		remove_dropdown_menu.style.width = "auto";
		remove_dropdown_menu.setAttribute('aria-labelledby','dropdownMenuButton');

		var remove_dropdown_menu_inner = document.createElement('div');
		remove_dropdown_menu_inner.className = "container-fluid";

		var remove_all_btn_row = document.createElement('div');
		remove_all_btn_row.className = "row multi_option justify-content-center";

		this.remove_all_btn = document.createElement("a");
		this.remove_all_btn.innerHTML = "<h6>Todo</h6>";

		remove_all_btn_row.appendChild(this.remove_all_btn);

		var remove_selected_btn_row = document.createElement('div');
		remove_selected_btn_row.className = "row multi_option justify-content-center";

		this.remove_selected_btn = document.createElement("a");
		this.remove_selected_btn.innerHTML = "<h6>Selección</h6>";
		remove_selected_btn_row.appendChild(this.remove_selected_btn);

		remove_dropdown_menu_inner.appendChild(remove_selected_btn_row);
		remove_dropdown_menu_inner.appendChild(remove_all_btn_row);

		remove_dropdown_menu.appendChild(remove_dropdown_menu_inner);
		remove_dropdown.appendChild(remove_dropdown_menu);

		remove_col.appendChild(remove_dropdown);

		var date_toggle_col = document.createElement('div');
		date_toggle_col.className = "col";

		var date_toggle_dropdown = document.createElement('div');
		date_toggle_dropdown.className = "mb-0";

		var date_toggle_anchor = document.createElement('a');
		date_toggle_anchor.className = "dropdown-toggle";
		date_toggle_anchor.setAttribute('data-toggle','collapse');
		date_toggle_anchor.setAttribute('href','#date_tools');

		var date_toggle_btn_label = document.createElement('label');
		date_toggle_btn_label.className ="upload_tool text-light";
		var date_toggle_label = document.createTextNode('Herramientas de edición ');
		//var date_toggle_icon = document.createElement('i');

		//date_toggle_icon.className = "fas fa-trash";
		date_toggle_btn_label.appendChild(date_toggle_label);
		//date_toggle_btn_label.appendChild(date_toggle_icon);

		date_toggle_anchor.appendChild(date_toggle_btn_label);
		date_toggle_dropdown.appendChild(date_toggle_anchor);

		date_toggle_col.appendChild(date_toggle_dropdown);

		var item_type_col = document.createElement('div');
		item_type_col.align = "left";
		item_type_col.className = "col-3";
		var item_type_label = document.createElement('label');
		item_type_label.className = "upload_tool text-light";
		item_type_label.appendChild(document.createTextNode('Tipo: '));
		item_type_label.htmlFor = "itemDate";

		this.item_type_input = document.createElement('select');
		this.item_type_input.className = "rounded";
		this.item_type_input.style.width = "205px";

		var options = ''
		for (var i=0;i<this.item_types.length;i++){
			options += '<option value="'+this.item_types[i].item_type+'">'+this.item_types[i].item_type+"<option/>";
		}

		this.item_type_input.innerHTML = options;

		var item_type_apply_dropdown = document.createElement('div');
		item_type_apply_dropdown.className = "dropdown";

		var item_type_apply_anchor = document.createElement('a');
		item_type_apply_anchor.setAttribute('data-toggle','dropdown');
		item_type_apply_anchor.setAttribute('role','button');
		item_type_apply_anchor.setAttribute('aria-expanded',false);
		item_type_apply_anchor.setAttribute('aria-controls','collapseUpload')

		var item_type_apply_btn_label = document.createElement('label');
		item_type_apply_btn_label.className ="upload_tool text-light";
		var item_type_apply_icon = document.createElement('i');
		item_type_apply_icon.className = "fas fa-arrow-alt-circle-right";

		item_type_apply_btn_label.appendChild(item_type_apply_icon);


		item_type_apply_anchor.appendChild(item_type_apply_btn_label);
		item_type_apply_dropdown.appendChild(item_type_apply_anchor);

		var item_type_apply_dropdown_menu = document.createElement('div');
		item_type_apply_dropdown_menu.className = "dropdown-menu text-light";
		item_type_apply_dropdown_menu.style["background-color"] = "#454d54";
		item_type_apply_dropdown_menu.style.width = "auto";
		item_type_apply_dropdown_menu.setAttribute('aria-labelledby','dropdownMenuButton');

		var item_type_apply_dropdown_menu_inner = document.createElement('div');
		item_type_apply_dropdown_menu_inner.className = "container-fluid";

		var item_type_apply_all_btn_row = document.createElement('div');
		item_type_apply_all_btn_row.className = "row multi_option justify-content-center";

		this.item_type_apply_all_btn = document.createElement("a");
		this.item_type_apply_all_btn.innerHTML = "<h6>Todo</h6>";

		item_type_apply_all_btn_row.appendChild(this.item_type_apply_all_btn);

		var item_type_apply_selected_btn_row = document.createElement('div');
		item_type_apply_selected_btn_row.className = "row multi_option justify-content-center";

		this.item_type_apply_selected_btn = document.createElement("a");
		this.item_type_apply_selected_btn.innerHTML = "<h6>Selección</h6>";
		item_type_apply_selected_btn_row.appendChild(this.item_type_apply_selected_btn);

		item_type_apply_dropdown_menu_inner.appendChild(item_type_apply_selected_btn_row);
		item_type_apply_dropdown_menu_inner.appendChild(item_type_apply_all_btn_row);

		item_type_apply_dropdown_menu.appendChild(item_type_apply_dropdown_menu_inner);
		item_type_apply_dropdown.appendChild(item_type_apply_dropdown_menu);

		var item_type_row = document.createElement('div');
		item_type_row.className = "row d-flex";

		item_type_row.appendChild(item_type_label);
		item_type_row.appendChild(this.item_type_input);
		item_type_row.appendChild(item_type_apply_dropdown)

		item_type_col.appendChild(item_type_row);

		//if (this.item_types.length == 1){
		//	item_type_col.style.display = "none";
		//}


		row.appendChild(file_picker_col);
		row.appendChild(upload_col);
		row.appendChild(remove_col);
		row.appendChild(date_toggle_col);


    	var row2 = document.createElement("div");
		row2.className = "row collapse justify-content-between";
		row2.id = "date_tools";
		row2.style["padding-left"] = "60px";
		row2.style["padding-bottom"] = "20px";

		var date_pattern_col = document.createElement('div');

		date_pattern_col.className = "col";
		var date_pattern_label = document.createElement('label');
		date_pattern_label.className = "upload_tool text-light";
		date_pattern_label.appendChild(document.createTextNode('Patrón: '));
		date_pattern_label.htmlFor = "itemDatePattern";


		this.date_pattern_input = document.createElement('input');
		this.date_pattern_input.style.width = "310px";
		this.date_pattern_input.className = "incorrect_pattern text-center rounded";
		this.date_pattern_input.id = "itemDatePattern";
		this.date_pattern_input.setAttribute('list','date_patterns');
		this.date_pattern_input.placeholder = "Patrón de fecha en nombre del archivo";


		var date_patterns = document.createElement('datalist');
		date_patterns.id = "date_patterns";

		var patterns = ["<YYYY>-<MM>-<DD> <HH>:<mm>:<ss>","<YYYY>-<MM>-<DD>","<YYYY>_<MM>_<DD>_<HH>_<mm>_<ss>","<YYYY>_<MM>_<DD>","<YYYY>/<MM>/<DD>_<HH>:<mm>:<ss>","<YYYY>/<MM>/<DD>","<HH>:<mm>:<ss>","<HH>:<mm>","<YYYY><MM><DD><HH><mm><ss>","<YYYY><MM><DD>"]
		var options = ''
		for (var i=0;i<patterns.length;i++){
			options += '<option value="'+patterns[i]+'" />';
		}

		date_patterns.innerHTML = options;

		var date_pattern_apply_dropdown = document.createElement('div');
		date_pattern_apply_dropdown.className = "dropdown";

		var date_pattern_apply_anchor = document.createElement('a');
		date_pattern_apply_anchor.setAttribute('data-toggle','dropdown');
		date_pattern_apply_anchor.setAttribute('role','button');
		date_pattern_apply_anchor.setAttribute('aria-expanded',false);
		date_pattern_apply_anchor.setAttribute('aria-controls','collapseUpload')

		var date_pattern_apply_btn_label = document.createElement('label');
		date_pattern_apply_btn_label.className ="upload_tool text-light";
		var date_pattern_apply_icon = document.createElement('i');
		date_pattern_apply_icon.className = "fas fa-arrow-alt-circle-right";

		date_pattern_apply_btn_label.appendChild(date_pattern_apply_icon);


		date_pattern_apply_anchor.appendChild(date_pattern_apply_btn_label);
		date_pattern_apply_dropdown.appendChild(date_pattern_apply_anchor);

		var date_pattern_apply_dropdown_menu = document.createElement('div');
		date_pattern_apply_dropdown_menu.className = "dropdown-menu text-light";
		date_pattern_apply_dropdown_menu.style["background-color"] = "#454d54";
		date_pattern_apply_dropdown_menu.style.width = "auto";
		date_pattern_apply_dropdown_menu.setAttribute('aria-labelledby','dropdownMenuButton');

		var date_pattern_apply_dropdown_menu_inner = document.createElement('div');
		date_pattern_apply_dropdown_menu_inner.className = "container-fluid";

		var date_pattern_apply_all_btn_row = document.createElement('div');
		date_pattern_apply_all_btn_row.className = "row multi_option justify-content-center";

		this.date_pattern_apply_all_btn = document.createElement("a");
		this.date_pattern_apply_all_btn.innerHTML = "<h6>Todo</h6>";

		date_pattern_apply_all_btn_row.appendChild(this.date_pattern_apply_all_btn);

		var date_pattern_apply_selected_btn_row = document.createElement('div');
		date_pattern_apply_selected_btn_row.className = "row multi_option justify-content-center";

		this.date_pattern_apply_selected_btn = document.createElement("a");
		this.date_pattern_apply_selected_btn.innerHTML = "<h6>Selección</h6>";
		date_pattern_apply_selected_btn_row.appendChild(this.date_pattern_apply_selected_btn);

		date_pattern_apply_dropdown_menu_inner.appendChild(date_pattern_apply_selected_btn_row);
		date_pattern_apply_dropdown_menu_inner.appendChild(date_pattern_apply_all_btn_row);

		date_pattern_apply_dropdown_menu.appendChild(date_pattern_apply_dropdown_menu_inner);
		date_pattern_apply_dropdown.appendChild(date_pattern_apply_dropdown_menu);

		var date_pattern_row = document.createElement('div');
		date_pattern_row.className = "row d-flex";

		date_pattern_row.appendChild(date_pattern_label);
		date_pattern_row.appendChild(this.date_pattern_input);
		date_pattern_row.appendChild(date_patterns);
		date_pattern_row.appendChild(date_pattern_apply_dropdown)

		date_pattern_col.appendChild(date_pattern_row);

		//Date

		var date_col = document.createElement('div');
		date_col.className = "col";
		var date_label = document.createElement('label');
		date_label.className = "upload_tool text-light";
		date_label.appendChild(document.createTextNode('Fecha: '));
		date_label.htmlFor = "itemDate";

		this.date_input = document.createElement('input');
		this.date_input.className = "incorrect_pattern text-center rounded";
		this.date_input.style.width = "110px";
		this.date_input.type = "text";

		$(this.date_input).datetimepicker({
			format:'Y-m-d',
			timepicker: false,
			closeOnDateSelect: true,
			validateOnBlur: false,
			onChangeDateTime: function(dp,$input){
		        var date_input = widget.validate_datetime($input.val());
		        if (date_input){
		          $($input).removeClass('incorrect_pattern');
		        } else {
		          $($input).addClass('incorrect_pattern');
		        }
		    }
		});

		this.set_datepicker_limits(this.date_input,this.site_timezone,1);
        this.date_input.placeholder = "YYYY-MM-DD";

		var date_apply_dropdown = document.createElement('div');
		date_apply_dropdown.className = "dropdown";

		var date_apply_anchor = document.createElement('a');
		date_apply_anchor.setAttribute('data-toggle','dropdown');
		date_apply_anchor.setAttribute('role','button');
		date_apply_anchor.setAttribute('aria-expanded',false);
		date_apply_anchor.setAttribute('aria-controls','collapseUpload')

		var date_apply_btn_label = document.createElement('label');
		date_apply_btn_label.className ="upload_tool text-light";
		var date_apply_icon = document.createElement('i');
		date_apply_icon.className = "fas fa-arrow-alt-circle-right";

		date_apply_btn_label.appendChild(date_apply_icon);


		date_apply_anchor.appendChild(date_apply_btn_label);
		date_apply_dropdown.appendChild(date_apply_anchor);

		var date_apply_dropdown_menu = document.createElement('div');
		date_apply_dropdown_menu.className = "dropdown-menu text-light";
		date_apply_dropdown_menu.style["background-color"] = "#454d54";
		date_apply_dropdown_menu.style.width = "auto";
		date_apply_dropdown_menu.setAttribute('aria-labelledby','dropdownMenuButton');

		var date_apply_dropdown_menu_inner = document.createElement('div');
		date_apply_dropdown_menu_inner.className = "container-fluid";

		var date_apply_all_btn_row = document.createElement('div');
		date_apply_all_btn_row.className = "row multi_option justify-content-center";

		this.date_apply_all_btn = document.createElement("a");
		this.date_apply_all_btn.innerHTML = "<h6>Todo</h6>";

		date_apply_all_btn_row.appendChild(this.date_apply_all_btn);

		var date_apply_selected_btn_row = document.createElement('div');
		date_apply_selected_btn_row.className = "row multi_option justify-content-center";

		this.date_apply_selected_btn = document.createElement("a");
		this.date_apply_selected_btn.innerHTML = "<h6>Selección</h6>";
		date_apply_selected_btn_row.appendChild(this.date_apply_selected_btn);

		date_apply_dropdown_menu_inner.appendChild(date_apply_selected_btn_row);
		date_apply_dropdown_menu_inner.appendChild(date_apply_all_btn_row);

		date_apply_dropdown_menu.appendChild(date_apply_dropdown_menu_inner);
		date_apply_dropdown.appendChild(date_apply_dropdown_menu);

		var date_row = document.createElement('div');
		date_row.className = "row d-flex";

		date_row.appendChild(date_label);
		date_row.appendChild(this.date_input);
		date_row.appendChild(date_apply_dropdown)

		date_col.appendChild(date_row);

		var time_col = document.createElement('div');
		time_col.className = "col";
		var time_label = document.createElement('label');
		time_label.className = "upload_tool text-light";
		time_label.appendChild(document.createTextNode('Tiempo: '));
		time_label.htmlFor = "itemDate";

		this.time_input = document.createElement('input');
		this.time_input.className = "incorrect_pattern text-center rounded";
		this.time_input.style.width = "85px";
		this.time_input.type = "text";

		$(this.time_input).datetimepicker({
			format:'H:i:s',
			datepicker: false,
			closeOnDateSelect: true,
			validateOnBlur: false,
			onChangeDateTime: function(dp,$input){
		        var time_input = widget.validate_datetime($input.val(),'time');
		        if (time_input){
		          $($input).removeClass('incorrect_pattern');
		        } else {
		          $($input).addClass('incorrect_pattern');
		        }
		    }
		});

        this.time_input.placeholder = "HH:mm:ss";


		var time_apply_dropdown = document.createElement('div');
		time_apply_dropdown.className = "dropdown";

		var time_apply_anchor = document.createElement('a');
		time_apply_anchor.setAttribute('data-toggle','dropdown');
		time_apply_anchor.setAttribute('role','button');
		time_apply_anchor.setAttribute('aria-expanded',false);
		time_apply_anchor.setAttribute('aria-controls','collapseUpload')

		var time_apply_btn_label = document.createElement('label');
		time_apply_btn_label.className ="upload_tool text-light";
		var time_apply_icon = document.createElement('i');
		time_apply_icon.className = "fas fa-arrow-alt-circle-right";

		time_apply_btn_label.appendChild(time_apply_icon);


		time_apply_anchor.appendChild(time_apply_btn_label);
		time_apply_dropdown.appendChild(time_apply_anchor);

		var time_apply_dropdown_menu = document.createElement('div');
		time_apply_dropdown_menu.className = "dropdown-menu text-light";
		time_apply_dropdown_menu.style["background-color"] = "#454d54";
		time_apply_dropdown_menu.style.width = "auto";
		time_apply_dropdown_menu.setAttribute('aria-labelledby','dropdownMenuButton');

		var time_apply_dropdown_menu_inner = document.createElement('div');
		time_apply_dropdown_menu_inner.className = "container-fluid";

		var time_apply_all_btn_row = document.createElement('div');
		time_apply_all_btn_row.className = "row multi_option justify-content-center";

		this.time_apply_all_btn = document.createElement("a");
		this.time_apply_all_btn.innerHTML = "<h6>Todo</h6>";

		time_apply_all_btn_row.appendChild(this.time_apply_all_btn);

		var time_apply_selected_btn_row = document.createElement('div');
		time_apply_selected_btn_row.className = "row multi_option justify-content-center";

		this.time_apply_selected_btn = document.createElement("a");
		this.time_apply_selected_btn.innerHTML = "<h6>Selección</h6>";
		time_apply_selected_btn_row.appendChild(this.time_apply_selected_btn);

		time_apply_dropdown_menu_inner.appendChild(time_apply_selected_btn_row);
		time_apply_dropdown_menu_inner.appendChild(time_apply_all_btn_row);

		time_apply_dropdown_menu.appendChild(time_apply_dropdown_menu_inner);
		time_apply_dropdown.appendChild(time_apply_dropdown_menu);

		var time_row = document.createElement('div');
		time_row.className = "row d-flex";

		time_row.appendChild(time_label);
		time_row.appendChild(this.time_input);
		time_row.appendChild(time_apply_dropdown)

		time_col.appendChild(time_row);

		var tz_col = document.createElement('div');
		tz_col.className = "col";
		var tz_label = document.createElement('label');
		tz_label.className = "upload_tool text-light";
		tz_label.appendChild(document.createTextNode('Zona horaria: '));
		tz_label.htmlFor = "itemDate";

		this.tz_input = document.createElement('input');
		this.tz_input.className = "text-center rounded";
		this.tz_input.style.width = "160px";
		this.tz_input.type = "text";

		if (this.site_timezone){
			this.tz_input.value = this.site_timezone;
		} else {
			$(this.tz_input).addClass("incorrect_pattern");
		}

		$(this.tz_input).autocomplete({
			select: function(event,ui){
				if (widget.tz_list.includes(ui.item.label)){
		          $(this).removeClass('incorrect_pattern');
		        } else {
		          $(this).addClass('incorrect_pattern');
		        }
			},
			source: function(request,response){
				var results = $.ui.autocomplete.filter(widget.tz_list,request.term);
				response(results.slice(0,10));
			}
		});

		var tz_apply_dropdown = document.createElement('div');
		tz_apply_dropdown.className = "dropdown";

		var tz_apply_anchor = document.createElement('a');
		tz_apply_anchor.setAttribute('data-toggle','dropdown');
		tz_apply_anchor.setAttribute('role','button');
		tz_apply_anchor.setAttribute('aria-expanded',false);
		tz_apply_anchor.setAttribute('aria-controls','collapseUpload')

		var tz_apply_btn_label = document.createElement('label');
		tz_apply_btn_label.className ="upload_tool text-light";
		var tz_apply_icon = document.createElement('i');
		tz_apply_icon.className = "fas fa-arrow-alt-circle-right";

		tz_apply_btn_label.appendChild(tz_apply_icon);


		tz_apply_anchor.appendChild(tz_apply_btn_label);
		tz_apply_dropdown.appendChild(tz_apply_anchor);

		var tz_apply_dropdown_menu = document.createElement('div');
		tz_apply_dropdown_menu.className = "dropdown-menu text-light";
		tz_apply_dropdown_menu.style["background-color"] = "#454d54";
		tz_apply_dropdown_menu.style.width = "auto";
		tz_apply_dropdown_menu.setAttribute('aria-labelledby','dropdownMenuButton');

		var tz_apply_dropdown_menu_inner = document.createElement('div');
		tz_apply_dropdown_menu_inner.className = "container-fluid";

		var tz_apply_all_btn_row = document.createElement('div');
		tz_apply_all_btn_row.className = "row multi_option justify-content-center";

		this.tz_apply_all_btn = document.createElement("a");
		this.tz_apply_all_btn.innerHTML = "<h6>Todo</h6>";

		tz_apply_all_btn_row.appendChild(this.tz_apply_all_btn);

		var tz_apply_selected_btn_row = document.createElement('div');
		tz_apply_selected_btn_row.className = "row multi_option justify-content-center";

		this.tz_apply_selected_btn = document.createElement("a");
		this.tz_apply_selected_btn.innerHTML = "<h6>Selección</h6>";
		tz_apply_selected_btn_row.appendChild(this.tz_apply_selected_btn);

		tz_apply_dropdown_menu_inner.appendChild(tz_apply_selected_btn_row);
		tz_apply_dropdown_menu_inner.appendChild(tz_apply_all_btn_row);

		tz_apply_dropdown_menu.appendChild(tz_apply_dropdown_menu_inner);
		tz_apply_dropdown.appendChild(tz_apply_dropdown_menu);

		var tz_row = document.createElement('div');
		tz_row.className = "row d-flex";

		tz_row.appendChild(tz_label);
		tz_row.appendChild(this.tz_input);
		tz_row.appendChild(tz_apply_dropdown)

		tz_col.appendChild(tz_row);




		var metadata_date_col = document.createElement('div');
		metadata_date_col.className = "col";
		metadata_date_col.align = "center";

		var metadata_date_dropdown = document.createElement('div');
		metadata_date_dropdown.className = "dropdown";

		var metadata_date_anchor = document.createElement('a');
		metadata_date_anchor.setAttribute('data-toggle','dropdown');
		metadata_date_anchor.setAttribute('role','button');
		metadata_date_anchor.setAttribute('aria-expanded',false);
		metadata_date_anchor.setAttribute('aria-controls','collapseUpload')

		var metadata_date_btn_label = document.createElement('label');
		metadata_date_btn_label.className ="upload_tool text-light";
		var metadata_date_label = document.createTextNode('Restaurar ');
		var metadata_date_icon = document.createElement('i');

		metadata_date_icon.className = "fas fa-cog";
		metadata_date_btn_label.appendChild(metadata_date_label);
		metadata_date_btn_label.appendChild(metadata_date_icon);


		metadata_date_anchor.appendChild(metadata_date_btn_label);
		metadata_date_dropdown.appendChild(metadata_date_anchor);

		var metadata_date_dropdown_menu = document.createElement('div');
		metadata_date_dropdown_menu.className = "dropdown-menu text-light";
		metadata_date_dropdown_menu.style["background-color"] = "#454d54";
		metadata_date_dropdown_menu.style.width = "auto";
		metadata_date_dropdown_menu.setAttribute('aria-labelledby','dropdownMenuButton');

		var metadata_date_dropdown_menu_inner = document.createElement('div');
		metadata_date_dropdown_menu_inner.className = "container-fluid";

		var metadata_date_all_btn_row = document.createElement('div');
		metadata_date_all_btn_row.className = "row multi_option justify-content-center";

		this.metadata_date_all_btn = document.createElement("a");
		this.metadata_date_all_btn.innerHTML = "<h6>Todo</h6>";

		metadata_date_all_btn_row.appendChild(this.metadata_date_all_btn);

		var metadata_date_selected_btn_row = document.createElement('div');
		metadata_date_selected_btn_row.className = "row multi_option justify-content-center";

		this.metadata_date_selected_btn = document.createElement("a");
		this.metadata_date_selected_btn.innerHTML = "<h6>Selección</h6>";
		metadata_date_selected_btn_row.appendChild(this.metadata_date_selected_btn);

		metadata_date_dropdown_menu_inner.appendChild(metadata_date_selected_btn_row);
		metadata_date_dropdown_menu_inner.appendChild(metadata_date_all_btn_row);

		metadata_date_dropdown_menu.appendChild(metadata_date_dropdown_menu_inner);
		metadata_date_dropdown.appendChild(metadata_date_dropdown_menu);

		metadata_date_col.appendChild(metadata_date_dropdown);


		row2.appendChild(date_col);
		row2.appendChild(time_col);
		row2.appendChild(tz_col);
		row2.appendChild(metadata_date_col);

		var row3 = document.createElement('div');
		row3.className = "row collapse justify-content-between";
		row3.id = "date_tools";
		row3.style["padding-left"] = "60px";

		var empty_col = document.createElement('div');
		empty_col.className = "col-3";

		row3.appendChild(date_pattern_col);
		row3.appendChild(item_type_col);
		row3.appendChild(empty_col);

		toolbar_container.appendChild(row);
		toolbar_container.appendChild(row2);
		toolbar_container.appendChild(row3);

		this.top_toolbar.appendChild(toolbar_container);


	    this.date_input.addEventListener('input',function(e){
	        var date_input = widget.validate_datetime(this.value);
	        if (date_input){
	          $(this).removeClass('incorrect_pattern');
	        } else {
	          $(this).addClass('incorrect_pattern');
	        }
	      });

	    this.time_input.addEventListener('input',function(e){
	        var time_input = widget.validate_datetime(this.value,'time');
	        if (time_input){
	          $(this).removeClass('incorrect_pattern');
	        } else {
	          $(this).addClass('incorrect_pattern');
	        }
	      });
	    this.tz_input.addEventListener('input',function(e){
	        if (widget.tz_list.includes(this.value)){
	          $(this).removeClass('incorrect_pattern');
	        } else {
	          $(this).addClass('incorrect_pattern');
	        }
	     });

		this.file_picker.addEventListener('change',function(e){
			function finalize_callback() {
				widget.render_by_name(['files','errors'])
			}

			widget.add_file_multiple(this.files,finalize_callback);
		});

		this.date_pattern_input.addEventListener('input',function(e){
			var parser_map = widget.validate_parser_map(this.value);
			if (parser_map){
				$(this).removeClass('incorrect_pattern');
			} else {
				$(this).addClass('incorrect_pattern');
			}
		});

	    metadata_date_all_btn_row.addEventListener('click',function(e){
	    	var fixable = widget.files.filter(widget.is_fixable);

	    	for (var i=0;i<fixable.length;i++){
	    		fixable[i].item_type = widget.get_item_type(fixable[i]);
	    		var new_date = "";
	    		var new_time = "";
	    		if (fixable[i].media_info){
	    			var datetime_original = fixable[i].media_info.DateTimeOriginalParsed;
	    			if (typeof(datetime_original) !== 'undefined'){
	    				var datetime_arr = datetime_original.split(" ");
	    				new_date = datetime_arr[0];
	    				new_time = datetime_arr[1];
	    			}
	    		}
	    		widget.set_file_datetime(fixable[i],new_date,new_time);
	    	}

	    	widget.render_by_name(['files']);

		});

	    metadata_date_selected_btn_row.addEventListener('click',function(e){
	    	var id_arr = widget.get_checked_ids();

	    	for (var i=0;i<id_arr.length;i++){
	    		var file = widget.get_file_by_id(id_arr[i]);

	    		if (file){
					var typeinput = document.getElementById("item_type_input_file_"+file.file_id);
					file.item_type = widget.get_item_type(file);

					var new_val = "";
					if (file.item_type){
						new_val = file.item_type;
					}
					var selectOptions = typeinput.options;
				    for (var opt, j = 0; opt = selectOptions[j]; j++) {
				        if (opt.value == new_val) {
				            typeinput.selectedIndex = j;
				            break;
				        }
				    }
					var dinput = document.getElementById("date_input_file_"+file.file_id);
					var tinput = document.getElementById("time_input_file_"+file.file_id);
		    		var new_date = "";
		    		var new_time = "";

		    		if (file.media_info){
		    			var datetime_original = file.media_info.DateTimeOriginalParsed;
		    			if (typeof(datetime_original) !== 'undefined'){
		    				var datetime_arr = datetime_original.split(" ");
		    				new_date = datetime_arr[0];
		    				new_time = datetime_arr[1];
		    			}
		    		}

		    		widget.set_file_datetime(file,new_date,new_time);
		    		dinput.value = new_date;
		    		tinput.value = new_time;
		    		widget.toggle_status(file.file_id);
	    		}

	    	}


		});

	    upload_all_btn_row.addEventListener('click',function(e){
	    	widget.upload_multiple(widget.is_uploadable);
		});

	    upload_selected_btn_row.addEventListener('click',function(e){
	        var id_arr = widget.get_checked_ids();

	    	widget.upload_multiple(function(f){return widget.is_uploadable(f) && id_arr.includes(f.file_id); });
		});

		remove_selected_btn_row.addEventListener('click',function(e){
			widget.remove_multiple(widget.get_checked_ids());
			widget.render_by_name(['files']);
		});

		remove_all_btn_row.addEventListener('click',function(e){
			widget.remove_all();

			widget.render_by_name(['files']);
		});

		date_pattern_apply_selected_btn_row.addEventListener('click',function(e){
			var parser_map = widget.validate_parser_map(widget.date_pattern_input.value);
			if (parser_map){
				var check_boxes = widget.file_list.querySelectorAll('input[type=checkbox]:checked');

				for (var i=0;i<check_boxes.length;i++){
					if (check_boxes[i].file_id != "all"){
						var file = widget.get_file_by_id(check_boxes[i].file_id);
						if (file){
							var dinput = document.getElementById("date_input_file_"+check_boxes[i].file_id);
							var tinput = document.getElementById("time_input_file_"+check_boxes[i].file_id);
							var datetime_obj = widget.parse_datetime(file.name,parser_map);

	    					widget.set_file_datetime(file,datetime_obj.date,datetime_obj.time);

							if (file.captured_on_date){
								dinput.value = file.captured_on_date;
							}

							if (file.captured_on_time){
								tinput.value = file.captured_on_time;
							}

							widget.toggle_status(check_boxes[i].file_id);
						}
					}
				}
			}
		});

		date_pattern_apply_all_btn_row.addEventListener('click',function(e){
			var parser_map = widget.validate_parser_map(widget.date_pattern_input.value);
			if (parser_map){
				var files = widget.files.filter(widget.is_fixable);
				for (var i=0;i<files.length;i++){
					var datetime_obj = widget.parse_datetime(files[i].name,parser_map);
					widget.set_file_datetime(files[i],datetime_obj.date,datetime_obj.time);

				}

				widget.render_by_name(['files']);

			}
		});

		item_type_apply_all_btn_row.addEventListener('click',function(e){
			var item_type = widget.item_type_input.value;
			var selected_index = widget.item_type_input.selectedIndex;
			var new_val = null;
			if (item_type != ""){
				new_val = item_type;
			}

			var files = widget.files.filter(widget.is_fixable);
			for (var i=0;i<files.length;i++){
				files[i].item_type = new_val;
			}

			var check_boxes = widget.file_list.querySelectorAll('input[type=checkbox]');
			for (var i=0;i<check_boxes.length;i++){
				if (check_boxes[i].file_id != "all"){
					var file = widget.get_file_by_id(check_boxes[i].file_id);
					if (file){
						var dinput = document.getElementById("item_type_input_file_"+check_boxes[i].file_id);
						dinput.selectedIndex = selected_index;
						widget.toggle_status(check_boxes[i].file_id);
					}
				}
			}

		});

		item_type_apply_selected_btn_row.addEventListener('click',function(e){
			var item_type = widget.item_type_input.value;
			var selected_index = widget.item_type_input.selectedIndex;
			var new_val = null;
			if (item_type != ""){
				new_val = item_type;
			}

			var check_boxes = widget.file_list.querySelectorAll('input[type=checkbox]:checked');
			for (var i=0;i<check_boxes.length;i++){
				if (check_boxes[i].file_id != "all"){
					var file = widget.get_file_by_id(check_boxes[i].file_id);
					if (file){
						file.item_type = new_val;
						var dinput = document.getElementById("item_type_input_file_"+check_boxes[i].file_id);
						dinput.selectedIndex = selected_index;
						widget.toggle_status(check_boxes[i].file_id);
					}
				}
			}

		});

		time_apply_all_btn_row.addEventListener('click',function(e){
			var valid_time = widget.validate_datetime(widget.time_input.value,'time');
			if (valid_time){
				var files = widget.files.filter(widget.is_fixable);
				for (var i=0;i<files.length;i++){
					widget.set_file_time(files[i],valid_time)
				}
				var check_boxes = widget.file_list.querySelectorAll('input[type=checkbox]');
				for (var i=0;i<check_boxes.length;i++){
					if (check_boxes[i].file_id != "all"){
						var file = widget.get_file_by_id(check_boxes[i].file_id);
						if (file){
							var dinput = document.getElementById("time_input_file_"+check_boxes[i].file_id);
							dinput.value = valid_time;
							widget.toggle_status(check_boxes[i].file_id);
						}
					}
				}
			}
		});


		time_apply_selected_btn_row.addEventListener('click',function(e){
			var valid_time = widget.validate_datetime(widget.time_input.value,'time');
			if (valid_time){
				var check_boxes = widget.file_list.querySelectorAll('input[type=checkbox]:checked');
				for (var i=0;i<check_boxes.length;i++){
					if (check_boxes[i].file_id != "all"){
						var file = widget.get_file_by_id(check_boxes[i].file_id);
						if (file){
							widget.set_file_time(file,valid_time);
							var dinput = document.getElementById("time_input_file_"+check_boxes[i].file_id);
							dinput.value = valid_time;
							widget.toggle_status(check_boxes[i].file_id);
						}
					}
				}
			}
		});

		tz_apply_all_btn_row.addEventListener('click',function(e){
			if (widget.tz_list.includes(widget.tz_input.value)){
				var files = widget.files.filter(widget.is_fixable);
				for (var i=0;i<files.length;i++){
					widget.set_file_timezone(files[i],widget.tz_input.value);
				}
				var check_boxes = widget.file_list.querySelectorAll('input[type=checkbox]');
				for (var i=0;i<check_boxes.length;i++){
					if (check_boxes[i].file_id != "all"){
						var file = widget.get_file_by_id(check_boxes[i].file_id);
						if (file){
							var dinput = document.getElementById("tz_input_file_"+check_boxes[i].file_id);
							var date_input = document.getElementById("date_input_file_"+check_boxes[i].file_id);
							widget.set_datepicker_limits(date_input,file.captured_on_timezone);
							dinput.value = widget.tz_input.value;
							widget.toggle_status(check_boxes[i].file_id);
						}
					}
				}
			}
		});

		tz_apply_selected_btn_row.addEventListener('click',function(e){
			if (widget.tz_list.includes(widget.tz_input.value)){
				var check_boxes = widget.file_list.querySelectorAll('input[type=checkbox]:checked');
				for (var i=0;i<check_boxes.length;i++){
					if (check_boxes[i].file_id != "all"){
						var file = widget.get_file_by_id(check_boxes[i].file_id);
						if (file){
							widget.set_file_timezone(file,widget.tz_input.value)
							var dinput = document.getElementById("tz_input_file_"+check_boxes[i].file_id);
							var date_input = document.getElementById("date_input_file_"+check_boxes[i].file_id);
							widget.set_datepicker_limits(date_input,file.captured_on_timezone);
							dinput.value = widget.tz_input.value;
							widget.toggle_status(check_boxes[i].file_id);
						}
					}
				}
			}
		});

		date_apply_all_btn_row.addEventListener('click',function(e){
			var valid_date = widget.validate_datetime(widget.date_input.value);
			if (valid_date){
				var files = widget.files.filter(widget.is_fixable);
				for (var i=0;i<files.length;i++){
					widget.set_file_date(files[i],valid_date);
				}
				var check_boxes = widget.file_list.querySelectorAll('input[type=checkbox]');
				for (var i=0;i<check_boxes.length;i++){
					if (check_boxes[i].file_id != "all"){
						var file = widget.get_file_by_id(check_boxes[i].file_id);
						if (file){
							var dinput = document.getElementById("date_input_file_"+check_boxes[i].file_id);
							dinput.value = valid_date;
							widget.toggle_status(check_boxes[i].file_id);
						}
					}
				}
			}
		});

		date_apply_selected_btn_row.addEventListener('click',function(e){
			var valid_date = widget.validate_datetime(widget.date_input.value);
			if (valid_date){
				var check_boxes = widget.file_list.querySelectorAll('input[type=checkbox]:checked');
				for (var i=0;i<check_boxes.length;i++){
					if (check_boxes[i].file_id != "all"){
						var file = widget.get_file_by_id(check_boxes[i].file_id);
						if (file){
							widget.set_file_date(file,valid_date);
							var dinput = document.getElementById("date_input_file_"+check_boxes[i].file_id);
							dinput.value = valid_date;
							widget.toggle_status(check_boxes[i].file_id);
						}
					}
				}
			}
		});


		this.parent.appendChild(this.top_toolbar);
	}
	build_body() {
		if (this.body){
			$(this.body).remove();
		}
		this.body = document.createElement('div');
		this.body.className = "row justify-content-between w-100";

		this.body.style["padding-top"] = "10px";
		this.body.style["padding-bottom"] = "10px";

		this.body.style["padding-left"] = "20px";
		this.body.style["padding-right"] = "20px";

		this.build_files_section();
		this.build_results_section();
		this.parent.appendChild(this.body);
	}
	build_files_section() {
		if (this.files_section){
			$(this.files_section).remove();
		}
		var section_col = document.createElement('div');
		section_col.id = "file_list_col";
		section_col.className = "col-8 justify-content-center w-100";

		var widget = this;

		section_col.addEventListener('dragover',function(e){
			e.stopPropagation();
			e.preventDefault();
			$(this).addClass( 'dragover' );
			e.dataTransfer.dropEffect = 'copy';
		});

		section_col.addEventListener('dragleave',function(e){
			e.stopPropagation();
			e.preventDefault();
			$(this).removeClass( 'dragover' );
			e.dataTransfer.dropEffect = 'copy';
		});

		section_col.addEventListener('drop',function(e){
		    e.stopPropagation();
		    e.preventDefault();
		    $(this).removeClass( 'dragover' );
			function finalize_callback() {
				widget.render_by_name(['files','errors'])
			}
			widget.add_file_multiple(e.dataTransfer.files,finalize_callback);
		});

		this.files_section = document.createElement('div');
		this.files_section.className = "container-fluid justify-content-center p-2";

		this.file_list_container = document.createElement('div');
		this.file_list_container.className = "row justify-content-center container-fluid";
		this.file_list_container.style.display = "none";

		this.build_file_list();

		section_col.appendChild(this.progress_container);
		section_col.appendChild(this.waveform_container);
		section_col.appendChild(this.files_section);
		this.body.appendChild(section_col);
	}
	build_results_section() {
		if (this.results_section){
			$(this.results_section).remove();
		}

		this.results_section = document.createElement('div');
		this.results_section.className = "col justify-content-center w-100";

		var header = document.createElement('div');
		header.className = "row";
		this.results_header_tabs = document.createElement('ul');
		this.results_header_tabs.className = "nav w-100 nav-tabs upload_tabs";

		var error_tab = document.createElement('li');
		error_tab.className = "nav-item";
		this.error_link = document.createElement('a');
		this.error_link.className = "nav-link";
		this.error_link.href = "#";
		this.error_link.innerHTML = "Errores (0)";
		error_tab.appendChild(this.error_link);


		var duplicate_tab = document.createElement('li');
		duplicate_tab.className = "nav-item";
		this.duplicate_link = document.createElement('a');
		this.duplicate_link.className = "nav-link";
		this.duplicate_link.href = "#";
		this.duplicate_link.innerHTML = "Duplicados (0)";
		duplicate_tab.appendChild(this.duplicate_link);


		var upload_tab = document.createElement('li');
		upload_tab.className = "nav-item";
		this.upload_link = document.createElement('a');
		this.upload_link.className = "nav-link active";
		this.upload_link.href = "#";
		this.upload_link.innerHTML = "Subidos (0)";
		upload_tab.appendChild(this.upload_link);

		this.results_header_tabs.appendChild(upload_tab);
		this.results_header_tabs.appendChild(duplicate_tab);
		this.results_header_tabs.appendChild(error_tab);


		header.appendChild(this.results_header_tabs);

		this.error_container = document.createElement('div');
		this.error_container.style.display = "none";
		this.error_list_container = document.createElement('div');
		this.error_list_container.className = "row justify-content-center container-fluid w-100";
		this.error_list_container.style.display = "none";

		this.duplicate_container = document.createElement('div');
		this.duplicate_container.style.display = "none";
		this.duplicate_list_container = document.createElement('div');
		this.duplicate_list_container.className = "row justify-content-center container-fluid w-100";
		this.duplicate_list_container.style.display = "none";

		this.upload_container = document.createElement('div');
		this.upload_list_container = document.createElement('div');
		this.upload_list_container.className = "row justify-content-center container-fluid w-100";
		this.upload_list_container.style.display = "none";

		this.build_error_list();
		this.build_duplicate_list();
		this.build_upload_list();

		this.current_results_tab = this.upload_container;

		var widget = this;

		this.error_link.addEventListener('click',function(e){
			if (widget.current_results_tab != widget.error_container){
				$( widget.results_header_tabs ).find( '.active' ).removeClass( 'active' );
				widget.current_results_tab.style.display = "none";
				widget.current_results_tab = widget.error_container;
				widget.current_results_tab.style.display = "block";
				$(this).addClass('active');
			}
		});

		this.duplicate_link.addEventListener('click',function(e){
			if (widget.current_results_tab != widget.duplicate_container){
				$( widget.results_header_tabs ).find( '.active' ).removeClass( 'active' );
				widget.current_results_tab.style.display = "none";
				widget.current_results_tab = widget.duplicate_container;
				widget.current_results_tab.style.display = "block";
				$(this).addClass('active');
			}
		});

		this.upload_link.addEventListener('click',function(e){
			if (widget.current_results_tab != widget.upload_container){
				$( widget.results_header_tabs ).find( '.active' ).removeClass( 'active' );
				widget.current_results_tab.style.display = "none";
				widget.current_results_tab = widget.upload_container;
				widget.current_results_tab.style.display = "block";
				$(this).addClass('active');
			}
		});

		this.error_container.appendChild(this.error_list_container);
		this.error_container.appendChild(this.blank_error_list);
		this.duplicate_container.appendChild(this.duplicate_list_container);
		this.duplicate_container.appendChild(this.blank_duplicate_list);
		this.upload_container.appendChild(this.upload_list_container);
		this.upload_container.appendChild(this.blank_upload_list);

		this.results_section.appendChild(header);
		this.results_section.appendChild(this.error_container);
		this.results_section.appendChild(this.duplicate_container);
		this.results_section.appendChild(this.upload_container);

		this.body.appendChild(this.results_section);
	}
	build_file_list(){
		this.file_list_table = document.createElement('div');
		this.file_list_table.className = "justify-content-center w-100";

		this.blank_file_list = document.createElement('div');
		this.blank_file_list.className = "row justify-content-center blank_item_list w-100";
		this.blank_file_list.height = "600px";


		var file_picker_col = document.createElement('div');
		var file_btn = document.createElement('label');
		file_btn.htmlFor = "alter_file_picker";
		file_btn.className ="upload_tool";


		var add_label = document.createTextNode("Agregar archivos ");
		var add_icon = document.createElement('i');
		add_icon.className = "fas fa-plus";
		file_btn.appendChild(add_label);
		file_btn.appendChild(add_icon);

		this.alter_file_picker = document.createElement('input');
		this.alter_file_picker.id = "alter_file_picker";
		this.alter_file_picker.type = "file";
		this.alter_file_picker.style.display = "none";
		this.alter_file_picker.setAttribute("multiple","");

		file_picker_col.appendChild(file_btn);
		file_picker_col.appendChild(this.alter_file_picker);

		this.blank_file_list.appendChild(file_picker_col);

		var paginator = document.createElement('div');
		paginator.className = "row justify-content-center w-100";
		paginator.align = "center";

		var prev_col = document.createElement('div');
		prev_col.className = "col p-3 text-center";
		this.prev_file_btn = document.createElement('button');
		this.prev_file_btn.className = "btn btn-primary";
		var prev_label = document.createTextNode("Anterior");
		this.prev_file_btn.appendChild(prev_label);
		prev_col.appendChild(this.prev_file_btn);

		var file_page_col = document.createElement('div');
		file_page_col.className = "col p-3 text-center";
		this.file_page_label = document.createElement('h6');
		file_page_col.appendChild(this.file_page_label);

		var next_col = document.createElement('div');
		next_col.className = "col p-3 text-center";
		this.next_file_btn = document.createElement('button');
		this.next_file_btn.className = "btn btn-primary";
		var next_label = document.createTextNode("Siguiente");
		this.next_file_btn.appendChild(next_label);
		next_col.appendChild(this.next_file_btn);

		paginator.appendChild(prev_col);
		paginator.appendChild(file_page_col);
		paginator.appendChild(next_col);

		var widget = this;

		this.next_file_btn.onclick = function(e){
			if (widget.file_page_number+1 == widget.total_file_pages){
				this.disabled = true;
			} else {
				this.disabled = false;
			}
			widget.prev_file_btn.disabled = false;
			var page = widget.get_next_page("file_list");
			widget.render_file_list(page);
		}
		this.prev_file_btn.onclick = function(e){
			if (widget.file_page_number-1 <= 0){
				this.disabled = true;
			} else {
				this.disabled = false;
			}
			widget.next_file_btn.disabled = false;
			var page = widget.get_prev_page("file_list");
			widget.render_file_list(page);
		}

		this.alter_file_picker.addEventListener('change',function(e){
			function finalize_callback() {
				widget.render_by_name(['files','errors'])
			}

			widget.add_file_multiple(this.files,finalize_callback);
		});

		var header = document.createElement('div');
		header.className = 'row d-flex justify-content-between header_item w-100';
		header.align = "center";
		header.style["margin"] = "10px";

		var header_checkCol = document.createElement('div');
		header_checkCol.className = 'col-1  justify-content-center text-center item_col';

		var header_descrCol = document.createElement('div');
		header_descrCol.className = 'col-2  justify-content-center text-center item_col';

		var header_itemtypeCol = document.createElement('div');
		header_itemtypeCol.className = 'col-3  justify-content-center text-center item_col'

		var header_dateCol = document.createElement('div');
		header_dateCol.className = 'col-2  justify-content-center text-center item_col';

		var header_tzCol = document.createElement('div');
		header_tzCol.className = 'col-2  justify-content-center text-center item_col';

		var header_statusCol = document.createElement('div');
		header_statusCol.className = 'col-2  justify-content-center text-center item_col';

		this.header_checkFile = document.createElement('input');
		this.header_checkFile.type = 'checkbox';
		this.header_checkFile.className = 'item_checkbox header_title';
		this.header_checkFile["file_id"] = "all";
		header_checkCol.appendChild(this.header_checkFile);

		var fileTitle = document.createElement('div');
    	fileTitle.innerHTML = 'Archivo <i class="fas fa-sort"></i>';
    	fileTitle.className = 'ml-4 ellipsise text-light header_title';
    	header_descrCol.appendChild(fileTitle);

		var itemtypeTitle = document.createElement('div');
    	itemtypeTitle.innerHTML = 'Tipo <i class="fas fa-sort"></i>';
    	itemtypeTitle.className = 'ml-4 ellipsise text-light header_title';
    	header_itemtypeCol.appendChild(itemtypeTitle);

		var dateTitle = document.createElement('div');
    	dateTitle.innerHTML = 'Fecha <i class="fas fa-sort"></i>';
    	dateTitle.className = 'ml-4 ellipsise text-light header_title';
    	header_dateCol.appendChild(dateTitle);

		var tzTitle = document.createElement('div');
    	tzTitle.innerHTML = 'Zona horaria <i class="fas fa-sort"></i>';
    	tzTitle.className = 'ml-4 ellipsise text-light header_title';
    	header_tzCol.appendChild(tzTitle);

	    var statusTitle = document.createElement('div');
	    statusTitle.className = 'ml-4 ellipsise text-light header_title';
	    statusTitle.innerHTML = 'Estado <i class="fas fa-sort"></i>';
	    header_statusCol.appendChild(statusTitle);

		this.header_checkFile.addEventListener('input',function(e){
			var check_boxes = widget.file_list.querySelectorAll('input[type=checkbox]');
			for (var i=0;i<check_boxes.length;i++){
				check_boxes[i].checked = this.checked;
			}
			var files = widget.files.filter(widget.is_fixable);
			for (var i=0;i<files.length;i++){
				files[i].checked = this.checked;
			}

		});

	    header.appendChild(header_checkCol);
	    header.appendChild(header_descrCol);
	    header.appendChild(header_itemtypeCol);
	    header.appendChild(header_dateCol);
	    header.appendChild(header_tzCol);
	    header.appendChild(header_statusCol);

	    var widget = this;

		fileTitle.addEventListener('click',function(e){
			widget.list_sort_by('files','Archivo');
		});
		itemtypeTitle.addEventListener('click',function(e){
			widget.list_sort_by('files','Tipo');
		});
		dateTitle.addEventListener('click',function(e){
			widget.list_sort_by('files','Fecha');
		});
		tzTitle.addEventListener('click',function(e){
			widget.list_sort_by('files','Zona horaria');
		});
		statusTitle.addEventListener('click',function(e){
			widget.list_sort_by('files','Estado');
		});

	    this.file_list = document.createElement('div');
	    this.file_list.className = "upload_list";
	    this.file_list.style["min-height"] = "450px";
	    this.file_list.style["max-height"] = "450px";

	    this.file_list_table.appendChild(header);
	    this.file_list_table.appendChild(this.file_list);

		this.file_list_container.appendChild(this.file_list_table);
		this.file_list_container.appendChild(paginator);

		this.files_section.appendChild(this.blank_file_list);
		this.files_section.appendChild(this.file_list_container);
	}
	build_error_list(){
		var paginator = document.createElement('div');
		paginator.className = "row justify-content-center w-100";
		paginator.align = "center";

		var prev_col = document.createElement('div');
		prev_col.className = "col p-3 text-center";
		this.prev_error_btn = document.createElement('button');
		this.prev_error_btn.className = "btn btn-primary";
		var prev_label = document.createTextNode("Anterior");
		this.prev_error_btn.appendChild(prev_label);
		prev_col.appendChild(this.prev_error_btn);

		var page_col = document.createElement('div');
		page_col.className = "col p-3 text-center";
		this.error_page_label = document.createElement('h6');
		page_col.appendChild(this.error_page_label);

		var next_col = document.createElement('div');
		next_col.className = "col p-3 text-center";
		this.next_error_btn = document.createElement('button');
		this.next_error_btn.className = "btn btn-primary";
		var next_label = document.createTextNode("Siguiente");
		this.next_error_btn.appendChild(next_label);
		next_col.appendChild(this.next_error_btn);

		paginator.appendChild(prev_col);
		paginator.appendChild(page_col);
		paginator.appendChild(next_col);

		var widget = this;

		this.next_error_btn.onclick = function(e){
			if (widget.error_page_number+1 == widget.total_error_pages){
				this.disabled = true;
			} else {
				this.disabled = false;
			}
			widget.prev_error_btn.disabled = false;
			var page = widget.get_next_page("error_list");
			widget.render_error_list(page);
		}
		this.prev_error_btn.onclick = function(e){
			if (widget.error_page_number-1 <= 0){
				this.disabled = true;
			} else {
				this.disabled = false;
			}
			widget.next_error_btn.disabled = false;
			var page = widget.get_prev_page("error_list");
			widget.render_error_list(page);
		}

		this.error_list_table = document.createElement('div');
		this.error_list_table.className = "justify-content-center w-100";

		var header = document.createElement('div');
		header.className = 'row d-flex justify-content-between header_item w-100';
		header.align = "center";
		header.style["margin"] = "10px";

		var header_descrCol = document.createElement('div');
		header_descrCol.className = 'col-6  justify-content-center text-center item_col';

		var header_statusCol = document.createElement('div');
		header_statusCol.className = 'col-6  justify-content-center text-center item_col';

		var fileTitle = document.createElement('div');
    	fileTitle.innerHTML = 'Archivo <i class="fas fa-sort"></i>';
    	fileTitle.className = 'ml-4 ellipsise text-light header_title';
    	header_descrCol.appendChild(fileTitle);

	    var statusTitle = document.createElement('div');
	    statusTitle.className = 'ml-4 ellipsise text-light header_title';
	    statusTitle.innerHTML = 'Descripción <i class="fas fa-sort"></i>';
	    header_statusCol.appendChild(statusTitle);

	    header.appendChild(header_descrCol);
	    header.appendChild(header_statusCol);

	    var widget = this;

		fileTitle.addEventListener('click',function(e){
			widget.list_sort_by('errors','Archivo');
		});
		statusTitle.addEventListener('click',function(e){
			widget.list_sort_by('errors','Descripción');
		});

	    this.error_list = document.createElement('div');
	    this.error_list.className = "upload_list";

	    this.error_list_table.appendChild(header);
	    this.error_list_table.appendChild(this.error_list);


		this.error_list_container.appendChild(this.error_list_table);
		this.error_list_container.appendChild(paginator);

		this.blank_error_list = document.createElement('div');
		this.blank_error_list.className = "row blank_item_list justify-content-center w-100";
		this.blank_error_list.style.border = "none";
		this.blank_error_list.height = "300px";

		var blank_message = document.createElement('a');
		blank_message.innerHTML = "No hay errores"
		this.blank_error_list.appendChild(blank_message);
	}
	build_duplicate_list(){
		var paginator = document.createElement('div');
		paginator.className = "row justify-content-center w-100";
		paginator.align = "center";

		var prev_col = document.createElement('div');
		prev_col.className = "col p-3 text-center";
		this.prev_duplicate_btn = document.createElement('button');
		this.prev_duplicate_btn.className = "btn btn-primary";
		var prev_label = document.createTextNode("Anterior");
		this.prev_duplicate_btn.appendChild(prev_label);
		prev_col.appendChild(this.prev_duplicate_btn);

		var page_col = document.createElement('div');
		page_col.className = "col p-3 text-center";
		this.duplicate_page_label = document.createElement('h6');
		page_col.appendChild(this.duplicate_page_label);

		var next_col = document.createElement('div');
		next_col.className = "col p-3 text-center";
		this.next_duplicate_btn = document.createElement('button');
		this.next_duplicate_btn.className = "btn btn-primary";
		var next_label = document.createTextNode("Siguiente");
		this.next_duplicate_btn.appendChild(next_label);
		next_col.appendChild(this.next_duplicate_btn);

		paginator.appendChild(prev_col);
		paginator.appendChild(page_col);
		paginator.appendChild(next_col);

		var widget = this;

		this.next_duplicate_btn.onclick = function(e){
			if (widget.duplicate_page_number+1 == widget.total_duplicate_pages){
				this.disabled = true;
			} else {
				this.disabled = false;
			}
			widget.prev_duplicate_btn.disabled = false;
			var page = widget.get_next_page("duplicate_list");
			widget.render_duplicate_list(page);
		}
		this.prev_duplicate_btn.onclick = function(e){
			if (widget.duplicate_page_number-1 <= 0){
				this.disabled = true;
			} else {
				this.disabled = false;
			}
			widget.next_duplicate_btn.disabled = false;
			var page = widget.get_prev_page("duplicate_list");
			widget.render_duplicate_list(page);
		}

		this.duplicate_list_table = document.createElement('div');
		this.duplicate_list_table.className = "justify-content-center w-100";

		var header = document.createElement('div');
		header.className = 'row d-flex justify-content-between header_item w-100';
		header.align = "center";
		header.style["margin"] = "10px";
		header.style["padding-right"] = "0px !important";

		var header_descrCol = document.createElement('div');
		header_descrCol.className = 'col-5 justify-content-center text-center item_col';

		var header_statusCol = document.createElement('div');
		header_statusCol.className = 'col-5 justify-content-center text-center item_col';

		var fileTitle = document.createElement('div');
    	fileTitle.innerHTML = 'Archivo <i class="fas fa-sort"></i>';
    	fileTitle.className = 'ml-4 ellipsise text-light header_title';
    	header_descrCol.appendChild(fileTitle);

	    var statusTitle = document.createElement('div');
	    statusTitle.className = 'ml-4 ellipsise text-light header_title';
	    statusTitle.innerHTML = 'Link <i class="fas fa-sort"></i>';
	    header_statusCol.appendChild(statusTitle);

	    header.appendChild(header_descrCol);
	    header.appendChild(header_statusCol);

	    var widget = this;

	    fileTitle.addEventListener('click',function(e){
			widget.list_sort_by('duplicates','Archivo');
		});
	    statusTitle.addEventListener('click',function(e){
	    	widget.list_sort_by('duplicates','Link');
	    });

	    this.duplicate_list = document.createElement('div');
	    this.duplicate_list.className = "upload_list";

	    this.duplicate_list_table.appendChild(header);
	    this.duplicate_list_table.appendChild(this.duplicate_list);

		this.duplicate_list_container.appendChild(this.duplicate_list_table);
		this.duplicate_list_container.appendChild(paginator);

		this.blank_duplicate_list = document.createElement('div');
		this.blank_duplicate_list.className = "row blank_item_list justify-content-center w-100";
		this.blank_duplicate_list.style.border = "none";
		this.blank_duplicate_list.height = "300px";

		var blank_message = document.createElement('a');
		blank_message.innerHTML = "No hay duplicados"
		this.blank_duplicate_list.appendChild(blank_message);
	}
	build_upload_list(){
		var paginator = document.createElement('div');
		paginator.className = "row justify-content-center w-100";
		paginator.align = "center";

		var prev_col = document.createElement('div');
		prev_col.className = "col p-3 text-center";
		this.prev_upload_btn = document.createElement('button');
		this.prev_upload_btn.className = "btn btn-primary";
		var prev_label = document.createTextNode("Aanterior");
		this.prev_upload_btn.appendChild(prev_label);
		prev_col.appendChild(this.prev_upload_btn);

		var page_col = document.createElement('div');
		page_col.className = "col p-3 text-center";
		this.upload_page_label = document.createElement('h6');
		page_col.appendChild(this.upload_page_label);

		var next_col = document.createElement('div');
		next_col.className = "col p-3 text-center";
		this.next_upload_btn = document.createElement('button');
		this.next_upload_btn.className = "btn btn-primary";
		var next_label = document.createTextNode("Siguiente");
		this.next_upload_btn.appendChild(next_label);
		next_col.appendChild(this.next_upload_btn);

		paginator.appendChild(prev_col);
		paginator.appendChild(page_col);
		paginator.appendChild(next_col);

		var widget = this;

		this.next_upload_btn.onclick = function(e){
			if (widget.upload_page_number+1 == widget.total_upload_pages){
				this.disabled = true;
			} else {
				this.disabled = false;
			}
			widget.prev_upload_btn.disabled = false;
			var page = widget.get_next_page("upload_list");
			widget.render_upload_list(page);
		}
		this.prev_upload_btn.onclick = function(e){
			if (widget.upload_page_number-1 <= 0){
				this.disabled = true;
			} else {
				this.disabled = false;
			}
			widget.next_upload_btn.disabled = false;
			var page = widget.get_prev_page("upload_list");
			widget.render_upload_list(page);
		}

		this.upload_list_table = document.createElement('div');
		this.upload_list_table.className = "justify-content-center w-100";

		var header = document.createElement('div');
		header.className = 'row d-flex justify-content-between header_item w-100';
		header.align = "center";
		header.style["margin"] = "10px";

		var header_descrCol = document.createElement('div');
		header_descrCol.className = 'col-5  justify-content-center text-center item_col';

		var header_statusCol = document.createElement('div');
		header_statusCol.className = 'col-5  justify-content-center text-center item_col';

		var fileTitle = document.createElement('div');
    	fileTitle.innerHTML = 'Artículo <i class="fas fa-sort"></i>';
    	fileTitle.className = 'ml-4 ellipsise text-light header_title';
    	header_descrCol.appendChild(fileTitle);

	    var statusTitle = document.createElement('div');
	    statusTitle.className = 'ml-4 ellipsise text-light header_title';
	    statusTitle.innerHTML = 'Link <i class="fas fa-sort"></i>';
	    header_statusCol.appendChild(statusTitle);

	    header.appendChild(header_descrCol);
	    header.appendChild(header_statusCol);

	    var widget = this;

	    fileTitle.addEventListener('click',function(e){
			widget.list_sort_by('uploads','Archivo');
		});
	    statusTitle.addEventListener('click',function(e){
	    	widget.list_sort_by('uploads','Link');
	    });

	    this.upload_list = document.createElement('div');
	    this.upload_list.className = "upload_list";

		this.upload_list_table.appendChild(header);
	    this.upload_list_table.appendChild(this.upload_list);

		this.upload_list_container.appendChild(this.upload_list_table);
		this.upload_list_container.appendChild(paginator);

		this.blank_upload_list = document.createElement('div');
		this.blank_upload_list.className = "row blank_item_list justify-content-center w-100";
		this.blank_upload_list.style.border = "none";
		this.blank_upload_list.height = "300px";

		var blank_message = document.createElement('a');
		blank_message.innerHTML = "No se ha subido ningún archivo nuevo"
		this.blank_upload_list.appendChild(blank_message);
	}
	list_sort_by(list_name,field_name){
		switch(list_name){
			case 'files':{
				switch(field_name){
					case 'Archivo':{
						if (this.files_sort_by.field == field_name){
							if (this.files_sort_by.order == "asc"){
								this.files_sort_by.order = "desc";
								this.files_sort_by.function = this.compare_file_names_desc;
							} else {
								this.files_sort_by.order = "asc";
								this.files_sort_by.function = this.compare_file_names_asc;
							}
						} else {
							this.files_sort_by.field = field_name;
							this.files_sort_by.order = "desc";
							this.files_sort_by.function = this.compare_file_names_desc;
						}
						break;
					}
					case 'Tipo':{
						if (this.files_sort_by.field == field_name){
							if (this.files_sort_by.order == "asc"){
								this.files_sort_by.order = "desc";
								this.files_sort_by.function = this.compare_file_types_desc;
							} else {
								this.files_sort_by.order = "asc";
								this.files_sort_by.function = this.compare_file_types_asc;
							}
						} else {
							this.files_sort_by.field = field_name;
							this.files_sort_by.order = "desc";
							this.files_sort_by.function = this.compare_file_types_desc;
						}
						break;
					}
					case 'Fecha':{
						if (this.files_sort_by.field == field_name){
							if (this.files_sort_by.order == "asc"){
								this.files_sort_by.order = "desc";
								this.files_sort_by.function = this.compare_datetimes_desc;
							} else {
								this.files_sort_by.order = "asc";
								this.files_sort_by.function = this.compare_datetimes_asc;
							}
						} else {
							this.files_sort_by.field = field_name;
							this.files_sort_by.order = "desc";
							this.files_sort_by.function = this.compare_datetimes_desc;
						}
						break;
					}
					case 'Zona horaria':{
						if (this.files_sort_by.field == field_name){
							if (this.files_sort_by.order == "asc"){
								this.files_sort_by.order = "desc";
								this.files_sort_by.function = this.compare_file_timezones_desc;
							} else {
								this.files_sort_by.order = "asc";
								this.files_sort_by.function = this.compare_file_timezones_asc;
							}
						} else {
							this.files_sort_by.field = field_name;
							this.files_sort_by.order = "desc";
							this.files_sort_by.function = this.compare_file_timezones_desc;
						}
						break;
					}
					case 'Estado':{
						if (this.files_sort_by.field == field_name){
							if (this.files_sort_by.order == "asc"){
								this.files_sort_by.order = "desc";
								this.files_sort_by.function = this.compare_file_states_desc;
							} else {
								this.files_sort_by.order = "asc";
								this.files_sort_by.function = this.compare_file_states_asc;
							}
						} else {
							this.files_sort_by.field = field_name;
							this.files_sort_by.order = "desc";
							this.files_sort_by.function = this.compare_file_states_desc;
						}
						break;
					}
					default:{
						break;
					}
				}
				this.render_by_name(["files"]);
				break;
			}
			case 'errors':{
				switch(field_name){
					case 'Archivo':{
						if (this.errors_sort_by.field == field_name){
							if (this.errors_sort_by.order == "asc"){
								this.errors_sort_by.order = "desc";
								this.errors_sort_by.function = this.compare_file_names_desc;
							} else {
								this.errors_sort_by.order = "asc";
								this.errors_sort_by.function = this.compare_file_names_asc;
							}
						} else {
							this.errors_sort_by.field = field_name;
							this.errors_sort_by.order = "desc";
							this.errors_sort_by.function = this.compare_file_names_desc;
						}
						break;
					}
					case 'Descripción':{
						if (this.errors_sort_by.field == field_name){
							if (this.errors_sort_by.order == "asc"){
								this.errors_sort_by.order = "desc";
								this.errors_sort_by.function = this.compare_errors_desc;
							} else {
								this.errors_sort_by.order = "asc";
								this.errors_sort_by.function = this.compare_errors_asc;
							}
						} else {
							this.errors_sort_by.field = field_name;
							this.errors_sort_by.order = "desc";
							this.errors_sort_by.function = this.compare_errors_desc;
						}
						break;
					}
					default:{
						break;
					}
				}
				this.render_by_name(["errors"]);
			}
			case 'duplicates':{
				switch(field_name){
					case 'Archivo':{
						if (this.duplicates_sort_by.field == field_name){
							if (this.duplicates_sort_by.order == "asc"){
								this.duplicates_sort_by.order = "desc";
								this.duplicates_sort_by.function = this.compare_file_names_desc;
							} else {
								this.duplicates_sort_by.order = "asc";
								this.duplicates_sort_by.function = this.compare_file_names_asc;
							}
						} else {
							this.duplicates_sort_by.field = field_name;
							this.duplicates_sort_by.order = "desc";
							this.duplicates_sort_by.function = this.compare_file_names_desc;
						}
						break;
					}
					case 'Link':{
						if (this.duplicates_sort_by.field == field_name){
							if (this.duplicates_sort_by.order == "asc"){
								this.duplicates_sort_by.order = "desc";
								this.duplicates_sort_by.function = this.compare_uploaded_items_desc;
							} else {
								this.duplicates_sort_by.order = "asc";
								this.duplicates_sort_by.function = this.compare_uploaded_items_asc;
							}
						} else {
							this.duplicates_sort_by.field = field_name;
							this.duplicates_sort_by.order = "desc";
							this.duplicates_sort_by.function = this.compare_uploaded_items_desc;
						}
						break;
					}
					default:{
						break;
					}
				}
				this.render_by_name(["duplicates"]);
			}
			case 'uploads':{
				switch(field_name){
					case 'Archivo':{
						if (this.uploads_sort_by.field == field_name){
							if (this.uploads_sort_by.order == "asc"){
								this.uploads_sort_by.order = "desc";
								this.uploads_sort_by.function = this.compare_file_names_desc;
							} else {
								this.uploads_sort_by.order = "asc";
								this.uploads_sort_by.function = this.compare_file_names_asc;
							}
						} else {
							this.uploads_sort_by.field = field_name;
							this.uploads_sort_by.order = "desc";
							this.uploads_sort_by.function = this.compare_file_names_desc;
						}
						break;
					}
					case 'Link':{
						if (this.uploads_sort_by.field == field_name){
							if (this.uploads_sort_by.order == "asc"){
								this.uploads_sort_by.order = "desc";
								this.uploads_sort_by.function = this.compare_uploaded_items_desc;
							} else {
								this.uploads_sort_by.order = "asc";
								this.uploads_sort_by.function = this.compare_uploaded_items_asc;
							}
						} else {
							this.uploads_sort_by.field = field_name;
							this.uploads_sort_by.order = "desc";
							this.uploads_sort_by.function = this.compare_uploaded_items_desc;
						}
						break;
					}
					default:{
						break;
					}
				}
				this.render_by_name(["uploads"]);
			}
			default:{
				break;
			}
		}
	}
	get_file_thumbnail(file){
        var thumbnail_div = document.createElement('div');
        thumbnail_div.className = "justify-content-center media";

        if (["image/jpeg","image/jpg","image/png"].includes(file.type)){
	        var fileImage = document.createElement('img');
	        fileImage.className = "itemimage_tiny ml-4";
	        thumbnail_div.appendChild(fileImage);
	        this.read_file_to_img(file,fileImage);

        } else if (["audio/wav","audio/x-wav"].includes(file.type)){
        	var playbtn = document.createElement('button');
        	playbtn.style["font-size"] = "40px";
        	playbtn["file_id"] = file.file_id;
        	playbtn.className = "rounded";
        	playbtn.innerHTML = "<i class='fas fa-file-audio'>"
        	var widget = this;
        	playbtn.addEventListener('click',function(event){

        		var load = false;
        		if (!widget.wavesurfer.file_id){
        			load = true;
        		} else if (widget.wavesurfer.file_id != this.file_id){
        			load = true;
        		}

        		if (load){

        			if (widget.wavesurfer.file_id){
        				widget.wavesurfer.pause();
        			}
        			widget.waveform_title.textContent = widget.get_file_by_id(this.file_id).name;
	        		var dfile = widget.get_file_by_id(this.file_id);
	        		widget.refresh_wavesurfer(dfile);
        		} else {
					$(widget.waveform_container).modal();
        			widget.wavesurfer.playPause();
        		}
        	});
        	thumbnail_div.appendChild(playbtn);
        }
       	thumbnail_div.title = file.name;
        return thumbnail_div;
	}
	get_file_page(page, per_page, filter_function,sort_function=this.compare_file_names_desc) {
		var page = page || 1;
		if (page <= 0){
			page = 1;
		}
		var per_page = per_page || 10;

		if (filter_function){
			var filteredItems = this.files.filter(filter_function);
		} else {
			var filteredItems = this.files;
		}
		if (sort_function){
			filteredItems.sort(sort_function);
		}


		var total_pages = Math.ceil(filteredItems.length / per_page);

		if (filteredItems.length <= per_page && filteredItems.length > 0){
			total_pages = 1;
		}

		page = Math.min(page,total_pages);

		var offset = (page - 1) * per_page;
		var paginatedItems = filteredItems.slice(offset).slice(0, per_page);

		return {
				page: page,
				per_page: per_page,
				pre_page: page - 1 ? page - 1 : null,
				next_page: (total_pages > page) ? page + 1 : null,
				total: filteredItems.length,
				total_pages: total_pages,
				data: paginatedItems
				};
	}
	render_file_list(page) {
		while (this.file_list.firstChild) {
			this.file_list.removeChild(this.file_list.firstChild);
		}

		if (page.page == 1){
			this.prev_file_btn.disabled = true;
		} else {
			this.prev_file_btn.disabled = false;
		}

		if (page.page == page.total_pages){
			this.next_file_btn.disabled = true;
		} else {
			this.next_file_btn.disabled = false;
		}

		if (page.data.length > 0){
			this.blank_file_list.style.display = "none";
			this.file_list_container.style.display = "flex";
			this.total_file_pages = page.total_pages;
			$(this.file_page_label).html(page.page+"/"+page.total_pages);
			var widget = this;

			for (var i=0;i<page.data.length;i++){
				var row = document.createElement('div');
				row.className = 'row d-flex justify-content-between list_item w-100';
				row.align = "center";
				row.style["margin"] = "10px";

				var checkCol = document.createElement('div');
				checkCol.className = 'col-1 justify-content-center text-center item_col';

				var descrCol = document.createElement('div');
				descrCol.className = 'col-2 justify-content-center  text-center  item_col';

				var itemTypeCol = document.createElement('div');
				itemTypeCol.className = 'col-3 justify-content-center  text-center item_col';
				itemTypeCol.style["padding-left"] = "40px"

				var dateCol = document.createElement('div');
				dateCol.className = 'col-2 justify-content-center  text-center item_col w-100';
				dateCol.align = "center";

				var tzCol = document.createElement('div');
				tzCol.className = 'col-2 justify-content-center  text-center item_col w-100';
				tzCol.align = "center";

				var statusCol = document.createElement('div');
				statusCol.className = 'col-2 justify-content-center  text-center item_col';

				var checkFile = document.createElement('input');
				checkFile.type = 'checkbox';
				checkFile.className = 'item_checkbox file_title';
				checkFile["file_id"] = page.data[i].file_id;
				checkFile.checked = page.data[i].checked;

				checkCol.appendChild(checkFile);

				var thumbnail_div = this.get_file_thumbnail(page.data[i]);
		        descrCol.appendChild(thumbnail_div);

				var item_type_input = document.createElement('select');
				item_type_input.style.height = "40px";
				item_type_input.id = "item_type_input_file_"+page.data[i].file_id;
				item_type_input.file_id = page.data[i].file_id;
				item_type_input.className = "rounded";

				var doptions = ''
				for (var o=0;o<this.item_types.length;o++){
					doptions += '<option value="'+this.item_types[o].item_type+'">'+this.item_types[o].item_type+"<option/>";
				}

				item_type_input.innerHTML = doptions;

				if (page.data[i].item_type){
				    var selectOptions = item_type_input.options;
				    for (var opt, j = 0; opt = selectOptions[j]; j++) {
				        if (opt.value == page.data[i].item_type) {
				            item_type_input.selectedIndex = j;
				            break;
				        }
				    }
				} else {
					item_type_input.selectedIndex = -1;
				}


				itemTypeCol.appendChild(item_type_input)


		        var dateInput = document.createElement('input');
		        dateInput.autocomplete = 'disabled';
		        dateInput.type = "text";
		        dateInput.style["text-align"]="center";
		        dateInput.style.width = "115px";
		        dateInput.className = "incorrect_pattern ml-4 file_title rounded";
		        dateInput.id = "date_input_file_"+page.data[i]["file_id"];
          		dateInput.placeholder = "YYYY-MM-DD";
          		dateInput["file_id"] = page.data[i]["file_id"];

		        $(dateInput).datetimepicker({
					format:'Y-m-d',
					file_id: page.data[i]["file_id"],
					validateOnBlur: false,
					timepicker: false,
					onChangeDateTime: function(dp,$input){
						var file = widget.get_file_by_id($input[0].file_id);
						widget.set_file_date(file,$input.val());
				        widget.toggle_status($input[0].file_id);
				    }
				});

		        if (page.data[i].captured_on_date){
		        	dateInput.value = page.data[i].captured_on_date;
		        	$(dateInput).removeClass('incorrect_pattern');
		        }
		        var moment_row_0 = document.createElement('div');
		        moment_row_0.className = "row justify-content-center";
		        var moment_row_1 = document.createElement('div');
		        moment_row_1.className = "row";
		        moment_row_1.appendChild(dateInput);
		        moment_row_0.appendChild(moment_row_1);

		        var timeInput = document.createElement('input');
		        timeInput.autocomplete = 'disabled';
		        timeInput.type = "text";
		        timeInput.style["text-align"]="center";
		        timeInput.style.width = "115px";
		        timeInput.className = "incorrect_pattern ml-4 file_title rounded";
		        timeInput.id = "time_input_file_"+page.data[i]["file_id"];
          		timeInput.placeholder = "HH:mm:ss";
          		timeInput["file_id"] = page.data[i]["file_id"];

          		var valid_time = false;

		        $(timeInput).datetimepicker({
					format:'H:i:s',
					datepicker: false,
					file_id: page.data[i]["file_id"],
					validateOnBlur: false,
					onChangeDateTime: function(dp,$input){
						var file = widget.get_file_by_id($input[0].file_id);
						widget.set_file_time(file,$input.val());
				        widget.toggle_status($input[0].file_id);
				    }
				});

		        if (page.data[i].captured_on_time){
		        	timeInput.value = page.data[i].captured_on_time;
		        	$(timeInput).removeClass('incorrect_pattern');
		        }

		        var moment_row_2 = document.createElement('div');
		        moment_row_2.className = "row";
		        moment_row_2.appendChild(timeInput);

		        moment_row_0.appendChild(moment_row_2);

		        dateCol.appendChild(moment_row_0);

		        var tzInput = document.createElement('input');
		        tzInput.type = "text";
		        tzInput.style["text-align"]="center";
		        tzInput.style.width = "130px";
		        tzInput.className = "incorrect_pattern ml-4 file_title rounded";
		        tzInput.id = "tz_input_file_"+page.data[i]["file_id"];
          		tzInput["file_id"] = page.data[i]["file_id"];

		        $(tzInput).autocomplete({
					select: function(event,ui){
						var file = widget.get_file_by_id(this.file_id);
						widget.set_file_timezone(file,ui.item.label)

						if (file.captured_on_timezone){
							var date_input = document.getElementById("date_input_file_"+file.file_id);
							widget.set_datepicker_limits(date_input,file.captured_on_timezone);
						}

				        widget.toggle_status(this.file_id);
					},
					source: function(request,response){
						var results = $.ui.autocomplete.filter(widget.tz_list,request.term);
						response(results.slice(0,10));
					}
				});

		        if (page.data[i].captured_on_timezone){
		        	tzInput.value = page.data[i].captured_on_timezone;
		        	$(tzInput).removeClass('incorrect_pattern');
		        }

				this.set_datepicker_limits(dateInput,page.data[i].captured_on_timezone)

		        tzCol.append(tzInput);

				var status_btn = document.createElement('div');
				status_btn.className ="col text-muted ml-4 ellipsise file_title";
				status_btn.id = "status_btn_"+page.data[i]["file_id"];
				status_btn["file_id"] = page.data[i].file_id;
				status_btn.style.display = "none";
				status_btn.style.cursor = "pointer";

				var status_label = document.createTextNode("Listo ");
				var status_icon = document.createElement('i');
				status_icon.className = "fas fa-upload";


				status_btn.appendChild(status_label);
				status_btn.appendChild(status_icon);

				var status_div =  document.createElement('div');
				status_div.className = "row";

		        var statusText = document.createElement('div');
		        statusText.className = "col text-muted ml-4 ellipsise file_title";
		        statusText.id = "status_text_"+page.data[i]["file_id"];

		        var status = this.get_file_state(page.data[i]);

		        statusText.textContent = status;

		        if (status == "Listo"){
		        	$(statusText).removeClass("upload_not_ready");
		        	statusText.style.display = "none";
					status_btn.style.display = "inline-block";
		        	$(timeInput).removeClass('incorrect_pattern');
		        } else {
		        	$(statusText).addClass("upload_not_ready");
		        	statusText.style.display = "inline-block";
					status_btn.style.display = "none";
		        }




		        status_div.appendChild(statusText);
		        status_div.appendChild(status_btn);
		        statusCol.appendChild(status_div);


			    $(dateInput).datetimepicker("option", "onSelect", function(){
			    	var file = widget.get_file_by_id(this.file_id);
			    	widget.set_file_date(file,this.value);
			        widget.toggle_status($input[0].file_id);
			    });

			    dateInput.addEventListener('input',function(e){
			        var file = widget.get_file_by_id(this.file_id);
			        widget.set_file_date(file,this.value);
			        widget.toggle_status(this.file_id);
			    });


			    $(timeInput).datetimepicker("option", "onSelect", function(){
			    	var file = widget.get_file_by_id(this.file_id);
					widget.set_file_time(file,this.value);
			        widget.toggle_status(this.file_id);
			    });

			    timeInput.addEventListener('input',function(e){
			    	var file = widget.get_file_by_id(this.file_id);
					widget.set_file_time(file,this.value);
			        widget.toggle_status(this.file_id);
			      });

			   status_btn.addEventListener('click',function(e){
			      		var file_id = this.file_id;
			      		widget.upload_multiple(function(f){return widget.is_uploadable(f) && f.file_id == file_id});

			    });
			    tzInput.addEventListener('input',function(e){
			    		var file = widget.get_file_by_id(this.file_id)
						widget.set_file_timezone(file,this.value);
						if (file.captured_on_timezone){
							var date_input = document.getElementById("date_input_file_"+file.file_id);
							widget.set_datepicker_limits(date_input,file.captured_on_timezone);
						}
				        widget.toggle_status(this.file_id)
			    });
			    item_type_input.addEventListener('change',function(e){
			      	var file = widget.get_file_by_id(this.file_id);
			      	var new_val = null;
			      	if (this.value != ""){
			      		new_val = this.value;
			      	}
			      	file.item_type = new_val;
			      	widget.toggle_status(this.file_id);
			    });

			    checkFile.addEventListener('input',function(e){
			    	var file = widget.get_file_by_id(this.file_id);
			    	if (file){
			    		file.checked = this.checked;
			    	}

				});

		        row.appendChild(checkCol);
				row.appendChild(descrCol);
				row.appendChild(itemTypeCol);
				row.appendChild(dateCol);
				row.appendChild(tzCol);
				row.appendChild(statusCol);
				this.file_list.appendChild(row)

			}
		} else {
			this.file_list_container.style.display = "none";
			this.blank_file_list.style.display = "flex";
			this.header_checkFile.checked = false;
		}
	}
	render_error_list(page) {
		while (this.error_list.firstChild) {
			this.error_list.removeChild(this.error_list.firstChild);
		}

		this.error_link.innerHTML = "Errores ("+page.total+")";
		if (page.page == 1){
			this.prev_error_btn.disabled = true;
		} else {
			this.prev_error_btn.disabled = false;
		}

		if (page.page == page.total_pages){
			this.next_error_btn.disabled = true;
		} else {
			this.next_error_btn.disabled = false;
		}

		if (page.data.length > 0){
			this.blank_error_list.style.display = "none";
			this.error_list_container.style.display = "flex";
			this.total_error_pages = page.total_pages;
			$(this.error_page_label).html(page.page+"/"+page.total_pages);
			var widget = this;

			for (var i=0;i<page.data.length;i++){
				var row = document.createElement('div');
				row.className = 'row d-flex justify-content-between error_item w-100';
				row.align = "center";
				row.style["margin"] = "10px";

				var descrCol = document.createElement('div');
				descrCol.className = 'col-6  justify-content-center text-center item_col';

				var statusCol = document.createElement('div');
				statusCol.className = 'col-6  justify-content-center text-center item_col';

		        var fileName = document.createElement('div');
		        fileName.className = "text-muted ml-4 ellipsise";
		        fileName.textContent = page.data[i].name;
		        fileName.title = page.data[i].name;

		        descrCol.appendChild(fileName);

		        var statusText = document.createElement('div');
		        statusText.className = "text-muted ml-4 ellipsise";
		        statusText.id = "status_text_"+page.data[i]["file_id"];

		        var status = "";
		        if (page.data[i].wrong_mime_type){
		        	status = "Tipo incorrecto";
		        }
		        statusText.textContent = status;

		        statusCol.appendChild(statusText);

				row.appendChild(descrCol);
				row.appendChild(statusCol);

				this.error_list.appendChild(row);

			}

		} else {
			this.error_list_container.style.display = "none";
			this.blank_error_list.style.display = "flex";
		}
	}
	render_duplicate_list(page) {
		while (this.duplicate_list.firstChild) {
			this.duplicate_list.removeChild(this.duplicate_list.firstChild);
		}

		this.duplicate_link.innerHTML = "Duplicados ("+page.total+")";
		if (page.page == 1){
			this.prev_duplicate_btn.disabled = true;
		} else {
			this.prev_duplicate_btn.disabled = false;
		}

		if (page.page == page.total_pages){
			this.next_duplicate_btn.disabled = true;
		} else {
			this.next_duplicate_btn.disabled = false;
		}

		if (page.data.length > 0){
			this.blank_duplicate_list.style.display = "none";
			this.duplicate_list_container.style.display = "flex";
			this.total_duplicate_pages = page.total_pages;
			$(this.duplicate_page_label).html(page.page+"/"+page.total_pages);
			var widget = this;

			for (var i=0;i<page.data.length;i++){
				var row = document.createElement('div');
				row.className = 'row d-flex justify-content-between duplicate_item w-100';
				row.align = "center";
				row.style["margin"] = "10px";

				var descrCol = document.createElement('div');
				descrCol.className = 'col-5 justify-content-center text-center item_col';

				var statusCol = document.createElement('div');
				statusCol.className = 'col-5  justify-content-center text-center item_col';

		        var thumbnail_div = this.get_file_thumbnail(page.data[i]);
		        descrCol.appendChild(thumbnail_div);

		        var itemLink = document.createElement('a');
		        itemLink.className = "btn-link ml-4 ellipsise";
		        itemLink.setAttribute('href',page.data[i].upload_response.result.item.detail_url)
		        itemLink.setAttribute('target','_blank');
		        itemLink.innerHTML = "<h6>Artículo "+page.data[i].upload_response.result.item.pk+"</h6>";

		        statusCol.appendChild(itemLink);

				row.appendChild(descrCol);
				row.appendChild(statusCol);

				this.duplicate_list.appendChild(row);

			}
		} else {

			this.duplicate_list_container.style.display = "none";
			this.blank_duplicate_list.style.display = "flex";
		}
	}
	render_upload_list(page) {
		while (this.upload_list.firstChild) {
			this.upload_list.removeChild(this.upload_list.firstChild);
		}

		this.upload_link.innerHTML = "Subidos ("+page.total+")";
		if (page.page == 1){
			this.prev_upload_btn.disabled = true;
		} else {
			this.prev_upload_btn.disabled = false;
		}

		if (page.page == page.total_pages){
			this.next_upload_btn.disabled = true;
		} else {
			this.next_upload_btn.disabled = false;
		}

		if (page.data.length > 0){
			this.blank_upload_list.style.display = "none";
			this.upload_list_container.style.display = "flex";
			this.total_upload_pages = page.total_pages;
			$(this.upload_page_label).html(page.page+"/"+page.total_pages);
			var widget = this;

			for (var i=0;i<page.data.length;i++){
				var row = document.createElement('div');
				row.className = 'row d-flex justify-content-between uploaded_item w-100';
				row.align = "center";
				row.style["margin"] = "10px";

				var descrCol = document.createElement('div');
				descrCol.className = 'col-5  justify-content-center text-center item_col';

				var statusCol = document.createElement('div');
				statusCol.className = 'col-5  justify-content-center text-center item_col';


		        var thumbnail_div = this.get_file_thumbnail(page.data[i]);

		        descrCol.appendChild(thumbnail_div);

		        var itemLink = document.createElement('a');
		        itemLink.className = "btn-link ml-4 ellipsise";
		        itemLink.setAttribute('href',page.data[i].upload_response.result.item.detail_url)
		        itemLink.setAttribute('target','_blank');
		        itemLink.innerHTML = "<h6>Artículo "+page.data[i].upload_response.result.item.pk+"</h6>";

		        statusCol.appendChild(itemLink);

				row.appendChild(descrCol);
				row.appendChild(statusCol);

				this.upload_list.appendChild(row);

			}
		} else {
			this.upload_list_container.style.display = "none";
			this.blank_upload_list.style.display = "flex";
		}
	}
	get_checked_ids(){
    	var checked_files = this.files.filter(function(f){return f.checked;});
		var id_arr = [];
		for (var i=0;i<checked_files.length;i++){
			if (checked_files[i].file_id != "all"){
				id_arr.push(checked_files[i].file_id);
			}
		}
		return id_arr;
	}
	parse_datetime(fileName,parser_map){
	  var regexp_obj = new RegExp(parser_map["regexp"],"g");
	  var date_context = fileName.match(regexp_obj);
	  var date = "";
	  var time = "";

	  if (date_context){
	  	if (date_context.length == 1){
		    if ("year" in parser_map){
			    date = date + date_context.toString().substring(parser_map["year"]["limits"][0],parser_map["year"]["limits"][1]);
			    if ("month" in parser_map){
				    date = date + "-" + date_context.toString().substring(parser_map["month"]["limits"][0],parser_map["month"]["limits"][1]);
				    if ("day" in parser_map){
				    	date = date + "-" + date_context.toString().substring(parser_map["day"]["limits"][0],parser_map["day"]["limits"][1]);
				    }

			    }


		    }

		    }

		    if ("hour" in parser_map){
			    time = time + date_context.toString().substring(parser_map["hour"]["limits"][0],parser_map["hour"]["limits"][1]);
			    if ("minute" in parser_map){
				    time = time + ":" + date_context.toString().substring(parser_map["minute"]["limits"][0],parser_map["minute"]["limits"][1]);
				    if ("second" in parser_map){
				    	time = time + ":" + date_context.toString().substring(parser_map["second"]["limits"][0],parser_map["second"]["limits"][1]);
				    }

			    }

		    }


		    return {"date":date,"time":time};
		} else {
			return {"date":"","time":""};
		}
		return {"date":"","time":""};
	}
	retrieve_media_info(file,callback) {
		if (file.type == 'image/jpeg'){
			var fr = new FileReader();
			var widget = this;
			fr.onloadend = function(){
				var exif = null;

				try {
					exif = EXIF.readFromBinaryFile(this.result);
				} catch(error) {
					exif = null;
				}

          		if (exif) {
          			file.media_info = exif;
          			var date_time_original = exif.DateTimeOriginal;

          			if (typeof(date_time_original) !== 'undefined'){
          				var date_time_arr = date_time_original.split(" ");
          				var date = date_time_arr[0].replace(/:/g,'-');
          				var time = date_time_arr[1]

          				var valid_date = widget.validate_datetime(date);
          				var valid_time = widget.validate_datetime(time,'time');

				        if (valid_date && valid_time){
				        	file.media_info["DateTimeOriginalParsed"] = valid_date+" "+valid_time;
				        	widget.set_file_datetime(file,valid_date,valid_time);
				        }
          			}
          		}

				if (callback){
					callback(file);
				}
			}
			fr.readAsArrayBuffer(file);
		} else {
			if (callback){
				callback(file);
			}
		}
	}
	validate_parser_map(map_string){
	      var pattern_mask = "";
	      var pieces = [];
	      var date_parser_map = {};
	      var bad_date_map = false;
	      var date_regexp = null;

	      if (map_string.includes('<') && map_string.includes('>')){

	        for(var i=0; i<map_string.length;i++) {
	          if (map_string[i] == "<"){
	            pattern_mask = pattern_mask + map_string[i];
	            for (var j=i+1; j<map_string.length; j++){
	              pattern_mask = pattern_mask + map_string[j];
	              if (map_string[j] == ">"){
	                pieces.push([i+1,j]);
	                i = j;
	                break;
	              } else if (map_string[j] == "<") {
	                i = map_string.length;
	                break;
	              }
	            }
	          } else {
	            pattern_mask = pattern_mask + "_";
	          }
	        }

	        if (pieces.length > 0){
	          date_regexp = map_string.substring(pieces[0][0]-1,pieces[pieces.length-1][1]+1);
	          var cut_pattern = pattern_mask.substring(pieces[0][0]-1,pieces[pieces.length-1][1]+1).replace(/</g,"").replace(/>/g,"");

	          for (var p=0;p<pieces.length;p++){
	            var substr = map_string.substring(pieces[p][0],pieces[p][1]);
	            var substr_length = substr.length;
	            var cat = distinctStr(substr);
	            var parser_key = null;
	            var sub_regexp = "";
	            var start = 0;
	            if (substr_length > 0 && cat.length == 1){
	              switch(cat){
	                case 'Y':{
	                  if (substr_length == 4 || substr_length == 2){
	                    parser_key = 'year';
	                    sub_regexp = "([0-9]{4})";
	                  } else {
	                    bad_date_map = true;
	                  }
	                  break;
	                }
	                case 'M':{
	                  if (substr_length == 2){
	                    parser_key = 'month';
	                    sub_regexp = "(0[1-9]{1}|[10-12]{2})";
	                  } else {
	                    bad_date_map = true;
	                  }
	                  break;
	                }
	                case 'D':{
	                  if (substr_length == 2){
	                    parser_key = 'day';
	                    sub_regexp = "(0[1-9]{1}|[10-31]{2})";
	                  } else {
	                    bad_date_map = true;
	                  }
	                  break;
	                }
	                case 'H':{
	                  if (substr_length == 2){
	                    parser_key = 'hour';
	                    sub_regexp = "(0[0-9]{1}|[10-23]{2})"
	                  } else {
	                    bad_date_map = true;
	                  }
	                  break;
	                }
	                case 'm':{
	                  if (substr_length == 2){
	                    parser_key = 'minute';
	                    sub_regexp = "(0[0-9]{1}|[10-59]{2})";
	                  } else {
	                    bad_date_map = true;
	                  }
	                  break;
	                }
	                case 's':{
	                  if (substr_length == 2){
	                    parser_key = 'second';
	                    sub_regexp = "(0[0-9]{1}|[10-59]{2})";
	                  } else {
	                    bad_date_map = true;
	                  }
	                  break;
	                }
	                default:{
	                  bad_date_map = true;
	                  break;
	                }
	              }

	              if (!bad_date_map){
	                date_regexp = date_regexp.replace("<"+substr+">",sub_regexp);
	                start = cut_pattern.indexOf(substr);
	                date_parser_map[parser_key] = {'limits':[start,start+substr_length],'length':substr_length,"order":p};
	              }

	            } else {
	              bad_date_map = true;
	            }

	          }
	          if (!bad_date_map){
	              if ('year' in date_parser_map || ('hour' in date_parser_map && 'minute' in date_parser_map)){
		       	      if ('month' in date_parser_map && !('year' in date_parser_map)){
		              	bad_date_map = true;
		              }
		              if ('day' in date_parser_map && !('month' in date_parser_map)){
		              	bad_date_map = true;
		              }

		              if ('minute' in date_parser_map && !('hour' in date_parser_map)){
		              	bad_date_map = true;
		              }

		              if ('second' in date_parser_map && !('minute' in date_parser_map)){
		              	bad_date_map = true;
		              }

		              if (!bad_date_map){
		              	date_parser_map["regexp"] = date_regexp;
		              	return date_parser_map;
		              }
	              }
	          }
	        }
	      }

	      return false;
	}
	set_file_time(file,time){
        var valid_time = this.validate_datetime(time,'time');

        if (valid_time){
			file.captured_on_time = valid_time;
        } else {
        	file.captured_on_time = null;
        }

        file.captured_on_inrange = this.datetime_in_range(file.captured_on_date,file.captured_on_time,file.captured_on_timezone);
	}
	set_file_date(file,date){
        var valid_date = this.validate_datetime(date);

        if (valid_date){
			file.captured_on_date = valid_date;
        } else {
        	file.captured_on_date = null;
        }

        file.captured_on_inrange = this.datetime_in_range(file.captured_on_date,file.captured_on_time,file.captured_on_timezone);
	}
	set_datepicker_limits(dateInput,timezone,buffer=0){
		var started_on = moment(this.started_on,"YYYY-MM-DD HH:mm:ss",true);
		var ended_on = moment(this.ended_on,"YYYY-MM-DD HH:mm:ss",true);
		started_on.tz('UTC');
		ended_on.tz('UTC');

		if (this.tz_list.includes(timezone)){
			started_on.tz(timezone)
			ended_on.tz(timezone)
		} else {
			started_on.tz(this.site_timezone)
			ended_on.tz(this.site_timezone)
		}

		var minDate = new Date(started_on.format('YYYY-MM-DD'));
		minDate.setDate(minDate.getDate()+1-buffer);
		var maxDate = new Date(ended_on.format('YYYY-MM-DD'));
		maxDate.setDate(maxDate.getDate()+1+buffer);
		var startDate = new Date(started_on.format('YYYY-MM-DD'));
		startDate.setDate(startDate.getDate()+1);

		$(dateInput).datetimepicker({"maxDate":maxDate,"minDate":minDate,"startDate":startDate});
	}
	set_file_timezone(file,tz_string){
		if (this.tz_list.includes(tz_string)){
          file.captured_on_timezone = tz_string;
          file.captured_on_inrange = this.datetime_in_range(file.captured_on_date,file.captured_on_time,file.captured_on_timezone);
        } else {
          file.captured_on_timezone = null;
          file.captured_on_inrange = false;
        }
	}
	set_file_datetime(file,date,time){
        var valid_date = this.validate_datetime(date);
        var valid_time = this.validate_datetime(time,'time');

        if (valid_date){
			file.captured_on_date = valid_date;
        } else {
        	file.captured_on_date = null;
        }

        if (valid_time){
			file.captured_on_time = valid_time;
        } else {
        	file.captured_on_time = null;
        }

        file.captured_on_inrange = this.datetime_in_range(file.captured_on_date,file.captured_on_time,file.captured_on_timezone);
	}
	datetime_in_range(date,time,timezone){
		if (!timezone){
			return false;
		}
		if (!date){
			date = "";
		}
		if (!time){
			time = "";
		}

		var started_on = moment.tz(this.started_on,"YYYY-MM-DD HH:mm:ss",true,this.site_timezone);
		var ended_on = moment.tz(this.ended_on,"YYYY-MM-DD HH:mm:ss",true,this.site_timezone);


		var date_arr = date.split("-");
		var date_len = date_arr.length;
		var time_arr = time.split(":");
		var time_len = time_arr.length;

		var helper_moment = null;

		switch (date_len){
			case 1:{
				helper_moment = moment(date + "-01-01","YYYY-MM-DD",true,timezone);
				if ( !(helper_moment.isBefore(started_on,"year") || helper_moment.isAfter(ended_on,"year"))){
					return true;
				}
				break;
			}
			case 2:{
				helper_moment = moment(date + "-01","YYYY-MM-DD",true,timezone);
				if ( !(helper_moment.isBefore(started_on,"month") || helper_moment.isAfter(ended_on,"month"))){
					return true;
				}
				break;
			}
			case 3:{
				switch(time_len){
					case 1: {
						helper_moment = moment.tz(date,"YYYY-MM-DD",true,timezone);
						if ( !(helper_moment.isBefore(started_on,"day") || helper_moment.isAfter(ended_on,"day"))){
							return true;
						}
						break;
					}
					case 2:{
						helper_moment = moment.tz(date+" "+time,"YYYY-MM-DD HH:mm",true,timezone);
						if ( !(helper_moment.isBefore(started_on,"minute") || helper_moment.isAfter(ended_on,"minute"))){
							return true;
						}
						break;
					}
					case 3:{
						helper_moment = moment.tz(date+" "+time,"YYYY-MM-DD HH:mm:ss",true,timezone);
						if ( !(helper_moment.isBefore(started_on,"second") || helper_moment.isAfter(ended_on,"second"))){
							return true;
						}
						break;
					}
					default:{
						break;
					}
				}
				break;
			}
			default:{
				break;
			}
		}

		return false;
	}
	validate_datetime(dateString,type="date"){
	  if (dateString != ""){
	  	var formats = [];
	  	var aux_obj = "";
	  	switch(type){
	  		case "date": {
	  			var date_arr = dateString.split("-");
	  			var date_len = date_arr.length;

	  			switch (date_len){
		  				case 1:{
		  					aux_obj = dateString + "-01-01";
		  					break;
		  				}
		  				case 2:{
		  					aux_obj = dateString + "-01";
		  					break;
		  				}
		  				case 3:{
		  					aux_obj = dateString;
		  					break;
		  				}
		  				default:{
		  					break;
		  				}
	  			}

	  			formats = ["YYYY-MM-DD"]
	  			break;
	  		}
	  		case "time": {
	  			aux_obj = "2019-01-01 "+dateString;
	  			formats = ["YYYY-MM-DD HH:ss","YYYY-MM-DD HH:mm:ss"]
	  			break;
	  		}

	  		default: {
	  			aux_obj = dateString;
	  			formats = ["YYYY-MM-DD HH:ss","YYYY-MM-DD HH:mm:ss"]
	  			break;
	  		}
	  	}


		for (var i=0;i<formats.length;i++){
			if (moment(aux_obj,formats[i],true).isValid()){
				return dateString;
			}
		}
	  }

	  return false;
	}
	get_next_page(list_name){
		var page = null;
		switch(list_name){
			case "file_list":{
				page = this.get_file_page(this.file_page_number+1, this.per_page, this.is_fixable,this.files_sort_by.function);
				this.file_page_number = page.page;
				this.total_file_pages = page.total_pages;
				break;
			}
			case "error_list":{
				page = this.get_file_page(this.error_page_number+1, this.per_page, this.has_errors,this.errors_sort_by.function);
				this.error_page_number = page.page;
				this.total_error_pages = page.total_pages;
				break;
			}
			case "duplicate_list":{
				page = this.get_file_page(this.duplicate_page_number+1, this.per_page, this.is_duplicate,this.duplicates_sort_by.function)
				this.duplicate_page_number = page.page;
				this.total_duplicate_pages = page.total_pages;
				break;
			}
			case "upload_list":{
				page = this.get_file_page(this.upload_page_number+1, this.per_page, this.is_uploaded,this.uploads_sort_by.function)
				this.duplicate_page_number = page.page;
				this.total_upload_pages = page.total_pages;
				break;
			}
			default:{
				return null;
				break;
			}
		}

		return page;
	}
	get_prev_page(list_name){
		var page = null;
		switch(list_name){
			case "file_list":{
				page = this.get_file_page(this.file_page_number-1, this.per_page, this.is_fixable,this.files_sort_by.function);
				this.file_page_number = page.page;
				this.total_file_pages = page.total_pages;
				break;
			}
			case "error_list":{
				page = this.get_file_page(this.error_page_number-1, this.per_page, this.has_errors,this.errors_sort_by.function);
				this.error_page_number = page.page;
				this.total_error_pages = page.total_pages;
				break;
			}
			case "duplicate_list":{
				page = this.get_file_page(this.duplicate_page_number-1, this.per_page, this.is_duplicate,this.duplicates_sort_by.function)
				this.duplicate_page_number = page.page;
				this.total_duplicate_pages = page.total_pages;
				break;
			}
			case "upload_list":{
				page = this.get_file_page(this.upload_page_number-1, this.per_page, this.is_uploaded,this.uploads_sort_by.function)
				this.duplicate_page_number = page.page;
				this.total_upload_pages = page.total_pages;
				break;
			}
			default:{
				return null;
				break;
			}
		}

		return page;
	}
	generate_id() {
		var new_id = this.last_id + 1;
		this.last_id = this.last_id + 1;

		return new_id;
	}
	is_uploadable(file){
		if (file.item_type){
			if ((file.captured_on_date && file.captured_on_time && file.captured_on_inrange && file.captured_on_timezone && !file.upload_response) || file.force_upload){
				return true;
			}
		}
		return false;
	}
	is_uploading(file){
		if (file.upload_response){
			if (file.upload_response != "uploading"){
				return true;
			}
		}

		return false;
	}
	is_duplicate(file){
		if (file.upload_response){
			if (file.upload_response != "uploading"){
				if (file.upload_response.result_type == "duplicate"){
					return true;
				}
			}
		}
		return false;
	}
	is_uploaded(file){
		if (file.upload_response){
			if (file.upload_response != "uploading"){
				if (file.upload_response.result_type == "success"){
					return true;
				}
			}
		}
		return false;
	}
	is_fixable(file){
		if (!file.wrong_mime_type && !file.upload_response){
			return true;
		}
		return false;
	}
	is_forced(file){
		if (file.force){
			return true;
		}
		return false;
	}
	has_media_info(file){
		if (file.media_info){
			return true;
		}

		return false;
	}
	has_errors(file){
		if (file.wrong_mime_type){
			return true;
		}
		return false;
	}
	compare_file_states_desc(f1,f2){
		function file_state(file){
	        var status = "";

	        if (!file.captured_on_time && !file.captured_on_date && !file.captured_on_timezone){
	        	status = "Sin momento";
	        } else if (!file.captured_on_date){
				status = "Sin fecha";
			} else if (!file.captured_on_time) {
				status = "Sin tiempo";
			} else if (!file.captured_on_timezone) {
				status = "Sin zona horaria";
			} else if (!file.captured_on_inrange){
				status = "Fuera de rango";
			} else {
				status = "Listo";
			}

			if (!file.item_type){
				if (status == "Listo"){
					status = "Sin tipo"
				} else {
					status += " y sin tipo"
				}
			}

			return status;
		}
		var state1 = file_state(f1);
		var state2 = file_state(f2);
		if (state1 < state2){
			return -1;
		}
		if (state1 > state2){
			return 1;
		}
		return 0;

	}
	compare_errors_desc(f1,f2){
		return 0;
	}
	compare_errors_asc(f1,f2){
		return 0;
	}
	compare_uploaded_items_desc(f1,f2){
		var pk1 = f1.upload_response.result.item.pk;
		var pk2 = f2.upload_response.result.item.pk;
		if (pk1 < pk2){
			return -1;
		} else if (pk2 < pk1){
			return 1;
		}
		return 0;
	}
	compare_uploaded_items_asc(f1,f2){
		var pk1 = f1.upload_response.result.item.pk;
		var pk2 = f2.upload_response.result.item.pk;
		if (pk1 < pk2){
			return 1;
		} else if (pk2 < pk1){
			return -1;
		}
		return 0;
	}
	compare_file_states_asc(f1,f2){
		function file_state(file){
	        var status = "";

	        if (!file.captured_on_time && !file.captured_on_date && !file.captured_on_timezone){
	        	status = "Sin momento";
	        } else if (!file.captured_on_date){
				status = "Sin fecha";
			} else if (!file.captured_on_time) {
				status = "Sin tiempo";
			} else if (!file.captured_on_timezone) {
				status = "Sin zona horaria";
			} else if (!file.captured_on_inrange){
				status = "Fuera de rango";
			} else {
				status = "Listo";
			}

			if (!file.item_type){
				if (status == "Listo"){
					status = "Sin tipo"
				} else {
					status += " y sin tipo"
				}
			}

			return status;
		}
		var state1 = file_state(f1);
		var state2 = file_state(f2);
		if (state1 < state2){
			return 1;
		}
		if (state1 > state2){
			return -1;
		}
		return 0;

	}
	compare_file_timezones_desc(f1,f2){
		if (!f1.captured_on_timezone && !f2.captured_on_timezone){
			return 0;
		} else if (!f1.captured_on_timezone){
			return -1;
		} else if (!f2.captured_on_timezone){
			return 1;
		}

		if (f1.captured_on_timezone < f2.captured_on_timezone){
			return -1;
		}
		if (f1.captured_on_timezone > f2.captured_on_timezone){
			return 1;
		}
		return 0;
	}
	compare_file_timezones_asc(f1,f2){
		if (!f1.captured_on_timezone && !f2.captured_on_timezone){
			return 0;
		} else if (!f1.captured_on_timezone){
			return 1;
		} else if (!f2.captured_on_timezone){
			return -1;
		}

		if (f1.captured_on_timezone < f2.captured_on_timezone){
			return 1;
		}
		if (f1.captured_on_timezone > f2.captured_on_timezone){
			return -1;
		}
		return 0;
	}
	compare_file_types_desc(f1,f2){
		if (!f1.item_type && !f2.item_type){
			return 0;
		} else if (!f1.item_type){
			return -1;
		} else if (!f2.item_type){
			return 1;
		}

		if (f1.item_type < f2.item_type){
			return -1;
		}
		if (f1.item_type > f2.item_type){
			return 1;
		}
		return 0;
	}
	compare_file_types_asc(f1,f2){
		if (!f1.item_type && !f2.item_type){
			return 0;
		} else if (!f1.item_type){
			return 1;
		} else if (!f2.item_type){
			return -1;
		}

		if (f1.item_type < f2.item_type){
			return 1;
		}
		if (f1.item_type > f2.item_type){
			return -1;
		}
		return 0;
	}
	compare_file_names_desc(f1,f2){
		if (f1.name < f2.name){
			return -1;
		}
		if (f1.name > f2.name){
			return 1;
		}
		return 0;
	}
	compare_file_names_asc(f1,f2){
		if (f1.name < f2.name){
			return 1;
		}
		if (f1.name > f2.name){
			return -1;
		}
		return 0;
	}
	compare_datetimes_desc(f1,f2){
		if (!f1.captured_on_timezone && !f2.captured_on_timezone){
			return 0;
		} else if (!f1.captured_on_timezone){
			return -1;
		} else if (!f2.captured_on_timezone){
			return 1;
		}

		if (!f1.captured_on_date && !f2.captured_on_date){
			return 0;
		} else if (!f1.captured_on_date){
			return -1;
		} else if (!f2.captured_on_date){
			return 1;
		} else {
			function lazy_moment(datestring,timestring,timezone){
				if (!timestring){
					timestring = "";
				}
				var date_arr = datestring.split("-");
				var date_len = date_arr.length;
				var time_arr = timestring.split(":");
				var time_len = time_arr.length;
				var extended_date = datestring;
				var format = "YYYY-MM-DD";

				switch (date_len){
					case 1:{
						extended_date += "-01-01";
						break;
					}
					case 2:{
						extended_date += "-01";
						break;
					}
					case 3:{
						switch(time_len){
							case 2:{
								format = "YYYY-MM-DD HH:mm";
								extended_date = extended_date+" "+timestring;
								break;
							}
							case 3:{
								format = "YYYY-MM-DD HH:mm:ss";
								extended_date = extended_date+" "+timestring;
								break;
							}
							default:{
								break;
							}
						}
					}
					default:{
						break;
					}
				}
				var dmoment = moment.tz(extended_date,format,true,timezone);
				return {'moment':dmoment,'valid_up_to':date_len+time_len}
			}

			var lazy_moment1 = lazy_moment(f1.captured_on_date,f1.captured_on_time,f1.captured_on_timezone);
			var lazy_moment2 = lazy_moment(f2.captured_on_date,f2.captured_on_time,f2.captured_on_timezone);

			var level = 'year';
			var valid_up_to = Math.min(lazy_moment1.valid_up_to,lazy_moment2.valid_up_to)

			if (valid_up_to == 2){
				level = 'month';
			} else if (valid_up_to == 3){
				level = 'day';
			} else if (valid_up_to == 5) {
				level = 'minute';
			} else if (valid_up_to == 6){
				level = 'second';
			}

			if (lazy_moment1.moment.isBefore(lazy_moment2.moment,level)){
				return -1;
			} else if (lazy_moment2.moment.isBefore(lazy_moment1.moment,level)){
				return 1;
			} else {
				return 0;
			}
		}
	}
	compare_datetimes_asc(f1,f2){
		if (!f1.captured_on_timezone && !f2.captured_on_timezone){
			return 0;
		} else if (!f1.captured_on_timezone){
			return 1;
		} else if (!f2.captured_on_timezone){
			return -1;
		}

		if (!f1.captured_on_date && !f2.captured_on_date){
			return 0;
		} else if (!f1.captured_on_date){
			return 1;
		} else if (!f2.captured_on_date){
			return -1;
		} else {
			function lazy_moment(datestring,timestring,timezone){
				if (!timestring){
					timestring = "";
				}
				var date_arr = datestring.split("-");
				var date_len = date_arr.length;
				var time_arr = timestring.split(":");
				var time_len = time_arr.length;
				var extended_date = datestring;
				var format = "YYYY-MM-DD";

				switch (date_len){
					case 1:{
						extended_date += "-01-01";
						break;
					}
					case 2:{
						extended_date += "-01";
						break;
					}
					case 3:{
						switch(time_len){
							case 2:{
								format = "YYYY-MM-DD HH:mm";
								extended_date = extended_date +" "+ timestring;
								break;
							}
							case 3:{
								format = "YYYY-MM-DD HH:mm:ss";
								extended_date = extended_date +" "+ timestring;
								break;
							}
							default:{
								break;
							}
						}
					}
					default:{
						break;
					}
				}
				var dmoment = moment.tz(extended_date,format,true,timezone);
				return {'moment':dmoment,'valid_up_to':date_len+time_len}
			}

			var lazy_moment1 = lazy_moment(f1.captured_on_date,f1.captured_on_time,f1.captured_on_timezone);
			var lazy_moment2 = lazy_moment(f2.captured_on_date,f2.captured_on_time,f2.captured_on_timezone);

			var level = 'year';
			var valid_up_to = Math.min(lazy_moment1.valid_up_to,lazy_moment2.valid_up_to)

			if (valid_up_to == 2){
				level = 'month';
			} else if (valid_up_to == 3){
				level = 'day';
			} else if (valid_up_to == 5) {
				level = 'minute';
			} else if (valid_up_to == 6){
				level = 'second';
			}

			if (lazy_moment1.moment.isBefore(lazy_moment2.moment,level)){
				return 1;
			} else if (lazy_moment2.moment.isBefore(lazy_moment1.moment,level)){
				return -1;
			} else {
				return 0;
			}
		}
	}
	get_file_state(file){
        var status = "";

        if (!file.captured_on_time && !file.captured_on_date && !file.captured_on_timezone){
        	status = "Sin momento";
        } else if (!file.captured_on_date){
			status = "Sin fecha";
		} else if (!file.captured_on_time) {
			status = "Sin tiempo";
		} else if (!file.captured_on_timezone) {
			status = "Sin zona horaria";
		} else if (!file.captured_on_inrange){
			status = "Fuera de rango";
		} else {
			status = "Listo";
		}

		if (!file.item_type){
			if (status == "Listo"){
				status = "Sin tipo"
			} else {
				status += " y sin tipo"
			}
		}

		return status;
	}
	refresh_wavesurfer(dfile){
		$('html').css("cursor", "wait");
	  	var audio_url = URL.createObjectURL(dfile);
	  	var audio = new Audio();
	  	var widget = this;
	  	this.wavesurfer = null;
	  	document.getElementById("waveform").innerHTML = "";
	  	document.getElementById("wave-spectrogram").innerHTML = "";


	  	$(audio).on("loadedmetadata",function(){
	  		var pxpersec = Math.round(900.0/audio.duration);
			widget.wavesurfer = WaveSurfer.create({
					container:"#waveform",
				    waveColor: 'white',
				    progressColor: 'green',
				    normalize: true,
				    minPxPerSec: pxpersec,
				    height: 200,
				    barWidth: 1,
				    barGap: 1,
				    plugins: [
				        WaveSurfer.spectrogram.create({
				            wavesurfer: this,
				            container: "#wave-spectrogram",
				            labels: true
				        })
					],
	  				fillParent: false
			});

			widget.wavesurfer["file_id"] = dfile.file_id;

			function format_time_display(number){
				if (number > 0){
					if (number < 10){
						return "0"+number;
					} else {
						return number;
					}
				} else {
					return "00";
				}
			}
			widget.wavesurfer.on('play',function(){
				widget.playpause.innerHTML = "<i class='fas fa-pause'></i>";
			});
			widget.wavesurfer.on('pause',function(){
				widget.playpause.innerHTML = "<i class='fas fa-play'></i>";
			});
			widget.wavesurfer.on('audioprocess',function(){
				if (widget.wavesurfer.isPlaying()){
					var new_time = widget.wavesurfer.getCurrentTime();
					var hours = Math.floor(new_time/3600);
					var minutes = Math.floor((new_time-hours*3600)/60);
					var seconds = Math.floor(new_time-hours*3600-minutes*60);

					widget.waveform_time.innerHTML = format_time_display(hours)+":"+format_time_display(minutes)+":"+format_time_display(seconds);
				}
			});
			widget.wavesurfer.on('seek',function(position){
				if (!widget.wavesurfer.isPlaying()){
					var new_time = position*widget.wavesurfer.getDuration();
					var hours = Math.floor(new_time/3600);
					var minutes = Math.floor((new_time-hours*3600)/60);
					var seconds = Math.floor(new_time-hours*3600-minutes*60);

					widget.waveform_time.innerHTML = format_time_display(hours)+":"+format_time_display(minutes)+":"+format_time_display(seconds);
				}


			});
			widget.wavesurfer.on('ready', function () {
				widget.wavesurfer.drawBuffer();
				$(widget.waveform_container).modal();
				widget.wavesurfer.play();
			});

			widget.wavesurfer.empty();
	        widget.wavesurfer.load(URL.createObjectURL(dfile));
	  	});

	    audio.src = audio_url;


	}
	get_item_type(file){
	  var ftype = file.type;
	  if (ftype == "audio/wav"){
	  	ftype = "audio/x-wav"
	  	if (!this.wavesurfer){
			this.wavesurfer = WaveSurfer.create({
					container:"#waveform",
				    waveColor: 'white',
				    progressColor: 'green',
				    normalize: true,
				    minPxPerSec: 1,
				    height: 200,
				    barWidth: 1,
				    barGap: 1,
				    plugins: [
				        WaveSurfer.spectrogram.create({
				            wavesurfer: this,
				            container: "#wave-spectrogram",
				            labels: true
				        })
    				],
	  				fillParent: false
			});

			this.wavesurfer["file_id"] = null;

	  		var widget = this;

			function format_time_display(number){
				if (number > 0){
					if (number < 10){
						return "0"+number;
					} else {
						return number;
					}
				} else {
					return "00";
				}
			}
			this.wavesurfer.on('play',function(){
				widget.playpause.innerHTML = "<i class='fas fa-pause'></i>";
			});
			this.wavesurfer.on('pause',function(){
				widget.playpause.innerHTML = "<i class='fas fa-play'></i>";
			});
			this.wavesurfer.on('audioprocess',function(){
				if (widget.wavesurfer.isPlaying()){
					var new_time = widget.wavesurfer.getCurrentTime();
					var hours = Math.floor(new_time/3600);
					var minutes = Math.floor((new_time-hours*3600)/60);
					var seconds = Math.floor(new_time-hours*3600-minutes*60);

					widget.waveform_time.innerHTML = format_time_display(hours)+":"+format_time_display(minutes)+":"+format_time_display(seconds);
				}
			});
			this.wavesurfer.on('seek',function(position){
				if (!widget.wavesurfer.isPlaying()){
					var new_time = position*widget.wavesurfer.getDuration();
					var hours = Math.floor(new_time/3600);
					var minutes = Math.floor((new_time-hours*3600)/60);
					var seconds = Math.floor(new_time-hours*3600-minutes*60);

					widget.waveform_time.innerHTML = format_time_display(hours)+":"+format_time_display(minutes)+":"+format_time_display(seconds);
				}


			});

	  	}

	  }
	  if (this.item_types.length == 1){
	  	for (var i=0;i<this.item_types[0].mime_types.length;i++){
	  		if (ftype == this.item_types[0].mime_types[i].mime_type){
	  			return this.item_types[0].item_type;
	  			break;
	  		}
	  	}
	  } else {
	  	return null;
	  }
	}
	is_mime_type_wrong(file){
		var ftype = file.type;
		if (ftype == "audio/wav"){
			ftype = "audio/x-wav";
		}
		if (!this.mime_types.includes(ftype)){
			return true;
		}
		return false;
	}
	upload_single(file,callback) {
	  var url = this.form.action;
	  console.log(url)
	  var formData = new FormData($(this.form)[0]);

	  formData.set('item_file', file);
	  formData.set('item_type',file.item_type);

	  if (file.captured_on_date){
	  	var date_arr = file.captured_on_date.split("-");
	  	var date_len = date_arr.length;
	  	switch (date_len){
	  		case 1:{
				formData.set('captured_on_year',date_arr[0]);
	  			break;
	  		}
	  		case 2:{
				formData.set('captured_on_year',date_arr[0]);
				formData.set('captured_on_month',date_arr[1]);
	  			break;
	  		}
	  		case 3:{
				formData.set('captured_on_year',date_arr[0]);
				formData.set('captured_on_month',date_arr[1]);
				formData.set('captured_on_day',date_arr[2]);
	  			break;
	  		}
	  	}
	  }
	  if (file.captured_on_time){
	  	var time_arr = file.captured_on_time.split(":");
	  	var time_len = time_arr.length;
	  	switch (time_len){
	  		case 2:{
				formData.set('captured_on_hour',time_arr[0]);
				formData.set('captured_on_minute',time_arr[1]);
	  			break;
	  		}
	  		case 3:{
				formData.set('captured_on_hour',time_arr[0]);
				formData.set('captured_on_minute',time_arr[1]);
				formData.set('captured_on_second',time_arr[2]);
	  			break;
	  		}
	  	}
	  }
	  if (file.captured_on_timezone){
	  	formData.set('captured_on_timezone',file.captured_on_timezone);
	  }

	  $.ajax({
		  url: url,
		  data: formData,
		  processData: false,
		  contentType: false,
		  cache: false,
		  enctype: 'multipart/form-data',
		  type: 'POST',
		  success: function(data){
				console.log('sucess in post');
	  	 	var response_obj = null;
			  try {
			    response_obj = data;
			    file["upload_response"] = response_obj;
			  } catch (error) {
			  	file["upload_response"] = null;
			  }

			  if (callback){
			  	callback(response_obj);
			  }
	    },
	    error: function(data){
	  		var response_obj = null;
			  try {
			    response_obj = JSON.parse(data.responseText);
			    file["upload_response"] = response_obj;
			  } catch (error) {
			  	file["upload_response"] = null;
			  }

			  if (callback){
			  	callback(response_obj);
			  }
	  	}
	  });
	}
	render_by_name(name_arr){
		if (!name_arr){
			name_arr = ['files','errors','duplicates','uploads'];
		}
		if (name_arr.includes('files')){
			var file_page = this.get_file_page(this.file_page_number, this.per_page, this.is_fixable, this.files_sort_by.function);
			this.render_file_list(file_page);
		}
		if (name_arr.includes('errors')){
			var error_page = this.get_file_page(this.error_page_number, this.per_page, this.has_errors,this.errors_sort_by.function);
			this.render_error_list(error_page);
		}
		if (name_arr.includes('duplicates')){
			var duplicate_page = this.get_file_page(this.duplicate_page_number, this.per_page, this.is_duplicate,this.duplicates_sort_by.function);
			this.render_duplicate_list(duplicate_page);
		}
		if (name_arr.includes('uploads')){
			var upload_page = this.get_file_page(this.upload_page_number, this.per_page, this.is_uploaded,this.uploads_sort_by.function);
			this.render_upload_list(upload_page);
		}
	}
	progress_upload(count,total){

  		var percent = Math.max(5,Math.round((count * 100) / total));
  		$(this.progress_bar)
    		.css('width', percent + '%')
    		.attr('aria-valuenow', percent);
  		$(this.progress_bar_label).html(percent + '%');
	}
	upload_multiple(filter_function, finalize_callback){
		var to_upload = this.files.filter(filter_function);
		if (to_upload.length > 0){
			for (var i=0;i<to_upload.length;i++){
				to_upload[i]["upload_response"] = "uploading";
			}

			this.render_by_name(['files']);

			var file_count = 0;
			var total_files = to_upload.length;
			var widget = this;

			function gather(response){
				file_count++;
				widget.render_by_name(['errors', 'duplicates', 'uploads']);
				widget.progress_upload(file_count, total_files);

				if (file_count >= total_files-1){
					setTimeout(function() {
						widget.progress_container.style.display = "none";
						widget.progress_upload(0, total_files);
					}, 2000);
				}
			}

			this.progress_container.style.display = "block";

			for (var i=0;i<to_upload.length;i++){
				this.upload_single(to_upload[i], gather);
			}
		}
	}
	add_file(file,callback){
		file["captured_on_date"] = null;
		file["captured_on_time"] = null;
		file["captured_on_inrange"] = false;
		file["captured_on_timezone"] = null;
		if (this.site_timezone){
			file["captured_on_timezone"] = this.site_timezone;
		}
		file["wrong_mime_type"] = this.is_mime_type_wrong(file);
		file["item_type"] = this.get_item_type(file);
		file["media_info"] = null;
		file["force_upload"] = false;
		file["checked"] = false;
		file["upload_response"] = null;
		file["file_id"] = this.generate_id();
		this.files.push(file);

		this.retrieve_media_info(this.files[this.files.length-1],callback);
	}
	add_file_multiple(file_arr,finalize_callback){
		var file_count = 0;
		var total_files = file_arr.length;

		function gather(f){
			file_count++;
			if (file_count >= total_files-1){
				finalize_callback();
			}
		}

		for (var i=0;i<file_arr.length;i++){
			this.add_file(file_arr[i],gather);
		}
	}
	remove_multiple(id_arr){
		this.files = this.files.filter(function(f){return !id_arr.includes(f.file_id); });
	}
	remove_all(){
		this.files = [];
	}
	remove_file_by_id(file_id){
		var result = this.files.findIndex(function(f){return f.file_id==file_id});

		if (result >= 0){
			this.files.splice(result,1);
		}

		return true;
	}
	remove_files(filter_function) {
		var result = this.files.findIndex(filter_function);
		var removed_ids = []
		for (var i=0;i<result.length;i++){
			this.files.splice(result[i],1);
			removed_ids.push(result[i])
		}
		this.refresh_view();
		return removed_ids;
	}
	get_file_by_id(file_id) {
		var result = this.files.filter(function(f){return f.file_id==file_id});

		if (result.length > 0){
			return result[0];
		}

		return null;
	}
	read_file_to_img(file,img) {
        var reader = new FileReader();

        reader.onload = function (e) {
          $(img).attr('src', e.target.result);
         };

        reader.readAsDataURL(file);
    }
	toggle_status(file_id) {
		var file = this.get_file_by_id(file_id);
		if (file){
			var date_ready = true;
			var time_ready = true;
			var tz_ready = true;
			var tinput = document.getElementById("time_input_file_"+file_id);
			var dinput = document.getElementById("date_input_file_"+file_id);
			var tzinput = document.getElementById("tz_input_file_"+file_id);
			var status_btn = document.getElementById("status_btn_"+file_id);
			var statustext = document.getElementById("status_text_"+file_id);

			if (!file.captured_on_date){
				date_ready = false;
				$(dinput).addClass("incorrect_pattern");
			} else {
				$(dinput).removeClass("incorrect_pattern");
			}
			if (!file.captured_on_time){
				time_ready = false;
				$(tinput).addClass("incorrect_pattern");
			} else {
				$(tinput).removeClass("incorrect_pattern");
			}
			if (!file.captured_on_timezone){
				tz_ready = false;
				$(tzinput).addClass("incorrect_pattern");
			} else {
				$(tzinput).removeClass("incorrect_pattern");
			}

			var status = this.get_file_state(file);
			statustext.textContent = status;

			if (status == "Listo"){
				$(statustext).removeClass("upload_not_ready");
				statustext.style.display = "none";
				status_btn.style.display = "inline-block";
			} else {
				$(statustext).addClass("upload_not_ready");
				statustext.style.display = "inline-block";
				status_btn.style.display = "none";
			}


		}
	}
}
