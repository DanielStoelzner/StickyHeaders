/* 
 * Sticky headers for all classic lists and libraries
 * 
 * Author  : Daniel Stoelzner
 * E-Mail  : daniel@spoodoo.com
 * Website : http://spoodoo.com
 * Copyright (c) 2017 Daniel Stoelzner 
 * Licensed under the MIT X11 License
 * 
 * v3.2.2BETA1 for SharePoint 2013 and SharePoint Online
 * LastMod: 6th of August 2017
 * 
 * Dependencies: jQuery - http://jquery.com
 */

if ("undefined" != typeof g_MinimalDownload && g_MinimalDownload && (window.location.pathname.toLowerCase()).endsWith("/_layouts/15/start.aspx") && "undefined" != typeof asyncDeltaManager) {
	RegisterModuleInit("/Style Library/Scripts/StickyHeaders.js", loadJQueryFirstOrExecuteDirectly);
	loadJQueryFirstOrExecuteDirectly();
} else {
	loadJQueryFirstOrExecuteDirectly();
}

function loadJQueryFirstOrExecuteDirectly() {
	if(window.jQuery === undefined) {
		var script = document.createElement("script");
		script.onload = function(){
			stickyHeaders();
		};
		script.onerror = function(){  
			SP.UI.Notify.addNotification("[StickyHeaders] Error: Couldn't load jQuery from " + script.src + "!", false);  
		};
		script.type = "text/javascript";
		script.src = "//code.jquery.com/jquery-3.2.1.min.js";
		document.getElementsByTagName("head")[0].appendChild(script);
	} else {
		stickyHeaders();
	};
}

function stickyHeaders() {
	window.SHListContainer = [];
	function findListsAndAttachHandlers() {
		jQuery("tr:has(>th[class*=ms-vh]):visible").closest("table").each(function(){
			var list = new List(jQuery(this));
			list.init();
			window.SHListContainer.push(list);
			jQuery("#s4-workspace").on("scroll.stickyHeaders", {elem: list}, function (event) {
				event.data.elem.update();
			});
			jQuery(window).on("resize.stickyHeaders", {elem: list}, function (event) {
				setTimeout(function(){
					event.data.elem.setWidth();
					event.data.elem.update();
				},50);
			});
			if(list.fixedHeight || list.fixedWidth){
				list.webpart.on("scroll.stickyHeaders", {elem: list}, function(event){
					event.data.elem.update();
				});
			};
		});
		if(typeof ReRenderListView == "function") {
			var ReRenderListView_old = ReRenderListView;
			ReRenderListView = function(b, l, e){
				ReRenderListView_old(b, l, e);
				jQuery(window.SHListContainer).each(function(){
					this.init();
				});
			};
		}
		var ribbonHeight = 0;
		g_workspaceResizedHandlers.push(function () {
			var newRibbonHeight = jQuery("#RibbonContainer").height();
			if(ribbonHeight !== newRibbonHeight) {
				jQuery(window.SHListContainer).each(function(){
					this.s4OffsetTop = jQuery("#s4-workspace").offset().top;
					this.update();
				});
				ribbonHeight = newRibbonHeight;
			}
		});
		var ExpCollGroup_old = ExpCollGroup;
		ExpCollGroup = function (c, F, y, w) {
			ExpCollGroup_old(c, F, y, w);
			var element = ("#tbod" + c + "_, #titl" + c);
			var interval = setInterval(function () {
				if(jQuery(element).attr("isloaded") == "true" || typeof jQuery(element).attr("isloaded") == "undefined") {
					setTimeout(function(){
						jQuery(window.SHListContainer).each(function(){
							this.init();
						});
					},200);
					clearInterval(interval);
				}
			}, 100);
		};
	};
	function List(list) {
		this.list			= list;
		this.webpart 		= jQuery(this.list.closest("div[id^=WebPartWPQ]")[0] || this.list[0]);
		this.fixedHeight	= ["","auto","100%"].indexOf(this.webpart.prop("style")["height"]) + 1 ? false : true;
		this.fixedWidth		= ["","auto","100%"].indexOf(this.webpart.prop("style")["width"])  + 1 ? false : true;
		this.s4OffsetTop	= jQuery("#s4-workspace").offset().top;
		this.listType		= this.list.find("tbody[id^=GroupByCol]").length ? "GroupedList" : this.list.hasClass("ms-listviewgrid") ? "Grid" : typeof this.list.closest("div[id^=WebPartWPQ]")[0] == "undefined" ? "SysList" : "NormalList";
		this.init = function() {
			this.list			= jQuery.contains(document.documentElement, this.list[0]) ? jQuery(this.list) : jQuery(this.webpart.find(".ms-listviewtable").last()[0] || this.webpart.find("> table")[0]);
			this.firstRow		= this.list.find("thead").length ? (this.listType == "GroupedList" ? this.list.find("tbody[isloaded=true]:visible > tr").first() : this.list.find("> tbody > tr:nth-child(1)")) : this.list.find("> tr:nth-child(2), > tbody > tr:nth-child(2)");
			this.prevHeight		= this.listType == "Grid" ? this.list.parent().closest(".ms-listviewtable")[0].offsetTop : this.list[0].offsetTop; //little bug in Edge: value wrong after pagination
			this.sticky			= this.webpart.find("tr:has(>th[class*=ms-vh]):visible").first();
			this.stickyHeight	= this.sticky.outerHeight();
			this.webpartHeight	= this.webpart.height();
			this.active			= this.firstRow.length ? true : false
			if(this.active) {
				if(this.listType == "Grid") {
					this.list.css({
						"table-layout": "fixed",
						"width"       : "auto"
					});
					jQuery("#spgridcontainer_" + this.webpart.attr("id").substr(7))[0].jsgrid.AttachEvent(SP.JsGrid.EventType.OnCellEditCompleted, (function(caller){
						return function(){
							caller.setWidth.apply(caller, arguments);
						};
					})(this));
					this.sticky.find("a").on("click", this.fixSortFunctionality);
				};
				if(this.sticky.find("th:last-child.ms-vh-icon:has(>span.ms-addcolumn-span)").hide().length) {
					this.list.addClass("addPadding");
				};
				this.setWidth();
				this.update();
			}
		};
		this.fixSortFunctionality = function(e){
			if(jQuery(e.target).parents(".stickyHeader").length > 0){
				var clvp = jQuery(e.target).closest(".ms-listviewtable:not(.ms-listviewgrid)")[0].clvp;
				var strHash = ajaxNavigate.getParam("InplviewHash" + clvp.wpid);
				var result = {};
				strHash.split("-").forEach(function(part) {
					var item = part.split("=");
					result[item[0]] = decodeURIComponent(item[1]);
				});
				var prevSortField = result.SortField;
				result.SortField = jQuery(e.target).closest("th")[0].thColumnKey;
				result.SortDir = prevSortField != result.SortField ? "Asc" : result.SortDir == "Asc" ? "Desc" : "Asc";
				var params = $.param(result);
				InitGridFromView(clvp.ctx.view, true);
				clvp.strHash = params.replace(/&/g, "-");
				clvp.fRestore = true;
				clvp.RefreshPagingEx("?" + params, true, null);
			}
		};
		this.setWidth = throttleUpdates(function() {
			if(this.active) {
				var firstRowChildren = this.firstRow.children("td");
				var stickyChildren   = this.sticky.children("th");
				this.sticky.css({
					"position": "static",
					"display" : "table-row"
				});
				jQuery.each([stickyChildren, firstRowChildren], function(){
					jQuery(this).css("min-width", 0);
				});
				var stickyChildrenWidths = [], firstRowChildrenWidths = [];
				for(var i=0; i < stickyChildren.length; i++){
					stickyChildrenWidths.push(navigator.appVersion.indexOf("Chrome/") == -1 ? jQuery(stickyChildren[i]).width() : getComputedStyle(stickyChildren[i]).getPropertyValue("width"));
					firstRowChildrenWidths.push(navigator.appVersion.indexOf("Chrome/") == -1 ? jQuery(firstRowChildren[i]).width() : getComputedStyle(firstRowChildren[i]).getPropertyValue("width"));
				};
				for(var i=0; i < stickyChildren.length; i++){
					jQuery(stickyChildren[i]).css("min-width",   stickyChildrenWidths[i]);
					jQuery(firstRowChildren[i]).css("min-width", firstRowChildrenWidths[i]);
				};
				this.sticky.css("position", this.sticky.hasClass("stickyHeader") ? "fixed" : "static")
			}
		});
		this.update = throttleUpdates(function() {
			if(this.active) {
				if(this.fixedWidth) {
					return;
				};
				this.webpartOffsetTop = this.webpart.offset().top;
				if(this.webpartOffsetTop + this.webpartHeight - this.s4OffsetTop > 0 && (this.webpartOffsetTop - this.s4OffsetTop + this.prevHeight < 0 || this.webpart.scrollTop() > this.prevHeight)){
					if(!this.sticky.hasClass("stickyHeader")) {
						this.toggleSticky(1);
					};
					this.sticky.css({
						"left": this.webpart.offset().left,
						"top" : !this.fixedHeight || this.webpartOffsetTop < this.s4OffsetTop + 2 ? this.s4OffsetTop + 2 : this.webpartOffsetTop
					})
				} else {
					if(this.sticky.hasClass("stickyHeader")) {
						this.toggleSticky(0)
					}
				}
			}
		});
		this.toggleSticky = function(on){
			if(this.listType == "SysList"){
				var headerChildren = this.listType == "GroupedList" ? this.list.find("tbody[id^=titl]").first().find("td") : this.firstRow.children("td");
				var _stickyHeight = this.stickyHeight;
				headerChildren.each(function(){
					jQuery(this).css("padding-top", parseInt(jQuery(this).css("padding-top")) + _stickyHeight * (on ? 1 : -1));
				})
			} else {
				this.list.css("margin-top", on ? this.stickyHeight : 0);
			}
			this.sticky.css({
				"position": on ? "fixed" : "static",
				"display" : on ? "none"  : "table-row"
			});
			on ? this.sticky.addClass("stickyHeader").slideDown(200) : this.sticky.removeClass("stickyHeader");
		}
	};
	/*
	 * Throttle function extracted from:
	 * http://benalman.com/projects/jquery-throttle-debounce-plugin/
	 * Copyright (c) 2010 "Cowboy" Ben Alman
	 * Dual licensed under the MIT and GPL licenses
	 * http://benalman.com/about/license/
	 */
	function throttleUpdates(t,e){function u(){function e(){n=+new Date,t.apply(u,d)}var u=this,a=+new Date-n,d=arguments;i&&clearTimeout(i),a>r?e():i=setTimeout(e,r-a)}var i,n=0,r=50;return jQuery.guid&&(u.guid=t.guid=t.guid||jQuery.guid++),u}
	(function () {
		if(!jQuery("#MSOLayout_InDesignMode").val() && !jQuery("#_wikiPageMode").val()){
			if(jQuery.inArray("spgantt.js", g_spPreFetchKeys) > -1) {
				ExecuteOrDelayUntilScriptLoaded(function () {
					setTimeout(function () {
						findListsAndAttachHandlers();
					}, 0)
				}, "spgantt.js")
			} else {
				findListsAndAttachHandlers();
			};
			if(typeof _spWebPartComponents != "undefined" && Object.keys(_spWebPartComponents).length == 1) {
				ExecuteOrDelayUntilScriptLoaded(function(){
					var ShowContextRibbonSections = (function fn(){
						SP.Ribbon.WebPartComponent.registerWithPageManager({editable: true, isEditMode: false, allowWebPartAdder: false});
						SP.Ribbon.WebPartComponent.get_instance().selectWebPart(jQuery("#MSOZoneCell_" + Object.keys(_spWebPartComponents))[0], true);
						return fn
					})();
					ExecuteOrDelayUntilScriptLoaded(function(){
						var DeselectAllWPItems_old = DeselectAllWPItems;
						DeselectAllWPItems = function () {
							DeselectAllWPItems_old();
							setTimeout(function () { 
								ShowContextRibbonSections() 
							}, 25)
						}
					}, "core.js")
				}, "sp.ribbon.js")
			};
			var style = ".stickyHeader {" +
							"border: 1px solid grey;" +
							"background-color: white;" +
							"box-shadow: 0 0 6px -2px black;" +
							"z-index: 1;" +
						"}" +
						".stickyHeader > th {" +
							"position: relative;" +
						"}" +
						".ms-listviewtable th .ms-core-menu-box {" +
							"top: auto !important;" +
							"left: auto !important;" +
						"}" +
						".stickyHeader th:not([id^=spgridcontainer]) {" +
							"border-bottom: 0 !important;" +
						"}" +
						".ms-listviewtable.addPadding {" +
							"padding-right: 26px !important;" +
						"}" +
						".stickyHeader th {" +
							"background-color: transparent !important;" +
						"}" +
						".stickyHeader div[colid=menuImg] {" +
							"display: none;" +
						"}";
			var div = jQuery("<div />", {
				html: "&shy;<style>" + style + "</style>"
			}).appendTo("body");
		}
	})()
}