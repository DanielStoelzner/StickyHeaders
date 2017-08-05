/* Sticky headers for all Custom Lists, Document Libraries and administration lists
 * ---------------------------------------------
 * Created by Daniel Stoelzner
 * stoelzner.daniel@gmail.com
 * http://spoodoo.com
 * Copyright (c) 2017 Daniel Stoelzner (Licensed under the MIT X11 License)
 * v3.2.1 for SharePoint 2013 and SharePoint Online
 * LastMod: 8th of August, 2017
 * ---------------------------------------------
 * Dependencies: jQuery - http://jquery.com
 * ---------------------------------------------
 * Add a reference to this file in a CEWP or Script Editor Web Part or reference this file in your masterpage
 */
 
/*
 * - Fixed a bug where Sticke Headers are not working in Datasheet-view when the user has less than Edit-permission
 * - Implemented a funtion that will load jQuery for you if it is not already loaded. No need to load jQuery via a separate script-tag any longer.
	 NOTE: Uncomment line 23-29 and remove or comment out line 32-52 if you don't want this feature
 * - Added some semicolons for a better minification
 */
  
 /*
 jQuery(function () {
	if(typeof asyncDeltaManager != "undefined"){
		asyncDeltaManager.add_endRequest(stickyHeaders);
	} else { 
		stickyHeaders();
	}
});
 */

if (typeof asyncDeltaManager != "undefined"){
	asyncDeltaManager.add_endRequest(loadJQueryFirstOrExecuteDirectly);
} else {
	loadJQueryFirstOrExecuteDirectly();
};

function loadJQueryFirstOrExecuteDirectly(){
	if(window.jQuery === undefined) {
		var script = document.createElement("script");
		script.type = "text/javascript";
		document.getElementsByTagName("head")[0].appendChild(script);
		script.src = "//code.jquery.com/jquery-3.2.1.min.js";
		script.onload = function(){
			stickyHeaders();
		};
		script.onerror = function(){
			SP.UI.Notify.addNotification("[StickyHeaders] Error: Couldn't load jQuery from " + script.src + "!", false);
		};
	} else {
		stickyHeaders();
	};
}

function stickyHeaders() {
	window.SHListContainer = [];
	function findListsAndAttachHandlers() {
		jQuery("tr:has(>th[class*=ms-vh]):visible").closest("table").each(function(){
			var list = new List(jQuery(this));
			window.SHListContainer.push(list);
			list.init();
			list.webpart.data("stickyHeaderData",list);
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
			if(typeof ReRenderListView == "function") {
				var ReRenderListView_old = ReRenderListView;
				ReRenderListView = function(b, l, e){
					ReRenderListView_old(b, l, e);
					jQuery("#WebPart" + b.wpq).data("stickyHeaderData").init();
				};
			}
		});
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
						jQuery(element).closest("[id^=WebPartWPQ]").data("stickyHeaderData").init();
					},200);
					clearInterval(interval);
				}
			}, 100);
		};
		
	};
	function List(list) {
		this.list			= list;
		this.webpart		= jQuery(this.list.closest("div[id^=WebPartWPQ]")[0] || this.list[0]);
		this.fixedHeight	= ["","auto","100%"].indexOf(this.webpart.prop("style")["height"]) + 1 ? false : true;
		this.fixedWidth		= ["","auto","100%"].indexOf(this.webpart.prop("style")["width"])  + 1 ? false : true;
		this.init = function() {
			this.s4OffsetTop	= jQuery("#s4-workspace").offset().top;
			this.list			= jQuery.contains(document.documentElement, this.list[0]) ? jQuery(this.list) : jQuery(this.webpart.find(".ms-listviewtable").last()[0] || this.webpart.find("> table")[0]);
			this.listType		= this.list.find("tbody[id^=GroupByCol]").length ? "GroupedList" : this.list.hasClass("ms-listviewgrid") ? "Grid" : typeof this.list.closest("div[id^=WebPartWPQ]")[0] == "undefined" ? "SysList" : "NormalList";
			this.firstRow		= this.list.find("thead").length ? (this.listType == "GroupedList" ? this.list.find("tbody[isloaded=true]:visible > tr").first() : this.list.find("> tbody > tr:nth-child(1)")) : this.list.find("> tr:nth-child(2), > tbody > tr:nth-child(2)");
			this.prevHeight		= this.listType == "Grid" ? this.list.parent().closest(".ms-listviewtable")[0].offsetTop : this.list[0].offsetTop; //little bug in Edge: value wrong after pagination
			this.sticky			= this.webpart.find("tr:has(>th[class*=ms-vh]):visible").first();
			this.stickyHeight	= this.sticky.outerHeight();
			this.webpartHeight	= this.webpart.height();
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
				jQuery("th").hover(function(e){
					if(jQuery(e.target).parents(".stickyHeader").length > 0){
						jQuery(e.target).find(".clip9x6").css("visibility", e.type == "mouseenter" ? "visible" : "hidden").find("> img").show();
					};
				}).on("mouseleave", function(e){
					if(jQuery(e.target).parents(".stickyHeader").length > 0){
						jQuery(e.target).find(".clip9x6").css("visibility", "hidden").find("> img").show();
					};
				})
			};
			if(this.sticky.find("th:last-child.ms-vh-icon:has(>span.ms-addcolumn-span)").hide().length) {
				this.list.addClass("addPadding");
			};
			this.setWidth();
			this.update();
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
			this.sticky.css({
				"position": "static",
				"display" : "table-row"
			});
			var stickyChildren   = this.sticky.children("th");
			var firstRowChildren = this.firstRow.children("td");
			jQuery.each([stickyChildren, firstRowChildren], function(){
				jQuery(this).css("min-width", 0);
			});
			var stickyChildrenWidths = [], firstRowChildrenWidths = [];
			for(var i=0; i < stickyChildren.length; i++){
				stickyChildrenWidths.push(jQuery(stickyChildren[i]).width());
				firstRowChildrenWidths.push(jQuery(firstRowChildren[i]).width());
			};
			for(var i=0; i < stickyChildren.length; i++){
				jQuery(stickyChildren[i]).css("min-width",   stickyChildrenWidths[i]);
				jQuery(firstRowChildren[i]).css("min-width", firstRowChildrenWidths[i]);
			};
			this.sticky.css("position", this.sticky.hasClass("stickyHeader") ? "fixed" : "static")
		});
		this.update = throttleUpdates(function() {
			if(this.fixedWidth) {
				return;
			};
			this.webpartOffsetTop = this.webpart.offset().top;
			if(this.firstRow.length && (this.webpartOffsetTop + this.webpartHeight - this.s4OffsetTop > 0 && (this.webpartOffsetTop - this.s4OffsetTop + this.prevHeight < 0 || this.webpart.scrollTop() > this.prevHeight))){
				if(!this.sticky.hasClass("stickyHeader")) {
					this.toggleSticky(true);
				};
				this.sticky.css({
					"left": this.webpart.offset().left,
					"top" : (!this.fixedHeight || this.webpartOffsetTop < (this.s4OffsetTop + 2)) ? (this.s4OffsetTop + 2) : (this.webpartOffsetTop)
				})
			} else {
				if(this.sticky.hasClass("stickyHeader")) {
					this.toggleSticky(false)
				}
			}
		});
		this.toggleSticky = function(mode){
			if(this.listType == "SysList"){
				var headerChildren = (this.listType == "GroupedList") ? this.list.find("tbody[id^=titl]").first().find("td") : this.firstRow.children("td");
				var _stickyHeight = this.stickyHeight;
				headerChildren.each(function(){
					jQuery(this).css("padding-top", parseInt(jQuery(this).css("padding-top")) + _stickyHeight * (mode == true ? 1 : -1));
				})
			} else {
				mode ? this.list.css("padding-top", this.stickyHeight) : this.list.css("padding-top", 0);
			};
			this.sticky.css({
				"position": mode ? "fixed" : "static",
				"display" : mode ? "none"  : "table-row"
			});
			mode ? this.sticky.addClass("stickyHeader").slideDown(200) : this.sticky.removeClass("stickyHeader");
		}
	};
	/*
	 * Throttle function extracted from:
	 * http://benalman.com/projects/jquery-throttle-debounce-plugin/
	 * Copyright (c) 2010 "Cowboy" Ben Alman
	 * Dual licensed under the MIT and GPL licenses.
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
						"}";
			var div = jQuery("<div />", {
				html: "&shy;<style>" + style + "</style>"
			}).appendTo("body");
		}
	})()
}