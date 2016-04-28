/* Sticky headers for all Custom Lists, Document Libraries and administration lists
 * ---------------------------------------------
 * Created by Daniel Stoelzner
 * stoelzner.daniel@gmail.com
 * http://spoodoo.com
 * Copyright (c) 2016 Daniel Stoelzner (Licensed under the MIT X11 License)
 * v3.01 for SharePoint 2013 and SharePoint Online
 * LastMod: 8th of March, 2016
 * ---------------------------------------------
 * Include reference to:
 *  jquery - http://jquery.com
 * ---------------------------------------------
 * Add a reference to this file in a CEWP or Script Editor Web Part or reference the file in your masterpage
 */

jQuery(function () {
	if(typeof asyncDeltaManager != "undefined"){
		asyncDeltaManager.add_endRequest(stickyHeaders)
	} else { 
		stickyHeaders();
	}
});

function stickyHeaders() {
	listContainer = []
	function findListsAndAttachHandlers() {
		jQuery("tr:has(>th[class^='ms-vh']):visible").closest("table").each(function(){
			var list = new List(jQuery(this))
			listContainer.push(list)
			list.init()
			list.webpart.data("stickyHeaderData",list)
			jQuery("#" + g_Workspace).on("scroll.stickyeaders", {elem:list}, function (event) {
				event.data.elem.update()
			})
			jQuery(window).on("resize.stickyHeaders", {elem:list}, function (event) {
				event.data.elem.setWidth()
				event.data.elem.update()
			})
			if(list.fixedHeight || list.fixedWidth){
				list.webpart.on("scroll.stickyHeaders", {elem: list}, function(event){
					event.data.elem.update()
				})
			}
			if(typeof ReRenderListView == "function") {
				var ReRenderListView_old = ReRenderListView
				ReRenderListView = function(b, l, e){
					ReRenderListView_old(b, l, e)
					jQuery("#WebPart" + b.wpq).data("stickyHeaderData").init()
				}
			}
		})
		var ribbonHeight = 0
		g_workspaceResizedHandlers.push(function () {
			var newRibbonHeight = jQuery("#RibbonContainer").height()
			if(ribbonHeight !== newRibbonHeight) {
				jQuery(listContainer).each(function(){
					this.s4OffsetTop = jQuery("#" + g_Workspace).offset().top
					this.update()
				})
				ribbonHeight = newRibbonHeight
			}
		})
		var ExpCollGroup_old = ExpCollGroup
		ExpCollGroup = function (c, F, y, w) {
			ExpCollGroup_old(c, F, y, w)
			var tbodId = ("#tbod" + c + "_")
			var interval = setInterval(function () {
				if(jQuery(tbodId).attr("isloaded") == "true") {
					setTimeout(function(){
						var listData = jQuery(tbodId).closest("[id^=WebPartWPQ]").data("stickyHeaderData")
						listData.firstRow = listData.list.find("tbody[isloaded=true]:has(>tr):visible > tr").first()
						listData.setWidth()
						listData.update()
					},200)
					clearInterval(interval)
				}
			}, 100)
		}
	}
	function List(list) {
		this.list             = list
		this.webpart          = jQuery(this.list.closest("div[id^=WebPartWPQ]")[0] || this.list[0])
		this.fixedHeight      = ["","auto","100%"].indexOf(this.webpart.prop("style")["height"]) + 1 ? false : true
		this.fixedWidth       = ["","auto","100%"].indexOf(this.webpart.prop("style")["width"])  + 1 ? false : true
		this.s4OffsetTop      = 0
		this.webpartOffsetTop = 0
		this.stickyHeight     = 0
		this.prevHeight       = 0
		this.sticky           = null
		this.firstRow         = null
		this.listType         = null
		this.init = function() {
			this.s4OffsetTop  = jQuery("#" + g_Workspace).offset().top
			this.list         = jQuery.contains(document.documentElement, this.list[0]) ? jQuery(this.list) : jQuery(this.webpart.find(".ms-listviewtable").last()[0] || this.webpart.find("> table")[0])
			this.listType     = this.list.find("tbody[id^=GroupByCol]").length ? "GroupedList" : this.list.hasClass('ms-listviewgrid') ? "Grid" : typeof this.list.closest("div[id^=WebPartWPQ]")[0] == "undefined" ? "SysList" : "NormalList"
			this.firstRow     = (this.listType == "Grid" || this.listType == "SysList") ? this.list.find(">*>tr:nth-child(2), >tr:nth-child(2)") : this.listType == "GroupedList" ? this.list.find("tbody[isloaded=true]:has(>tr):visible > tr").first() : this.list.find("> tbody > tr:nth-child(1)")
			this.prevHeight   = this.listType == "Grid" ? this.list.parent().closest(".ms-listviewtable")[0].offsetTop : this.list[0].offsetTop //little bug in Edge: value wrong after pagination
			this.sticky       = this.webpart.find("tr:has(>th[class^='ms-vh']):visible").first()
			this.stickyHeight = this.sticky.outerHeight()
			this.list.css({"table-layout":"fixed", 
						   "width"       :"auto"})
			if(this.listType == "Grid"){
				jQuery("#spgridcontainer_" + this.webpart.attr("id").substr(7))[0].jsgrid.AttachEvent(SP.JsGrid.EventType.OnCellEditCompleted, (function(caller){
					return function(){
						caller.setWidth.apply(caller, arguments);
					}
				})(this));
			}
			this.setWidth()
			this.update()
		}
		this.setWidth = throttleUpdates(50, false, function() {
			this.sticky.css({"position": "static", 
							 "display" : "table-row"})
			var stickyChildren   = this.sticky.children("th")
			var firstRowChildren = this.firstRow.children("td")
			jQuery.each([stickyChildren, firstRowChildren], function(){
				jQuery(this).css("min-width", 0)
			})
			jQuery.each([stickyChildren, firstRowChildren], function(){
				this.each(function(){
					jQuery(this).css("min-width", jQuery(this).width())
				})
			})
			this.sticky.css("position", this.sticky.hasClass('stickyHeader') ? "fixed" : "static")
		})
		this.update = throttleUpdates(50, false, function() {
			if(this.fixedWidth) return
			this.webpartOffsetTop = this.webpart.offset().top
			if(this.firstRow.length && (this.webpartOffsetTop + this.webpart.height() - this.s4OffsetTop > 0 && (this.webpartOffsetTop - this.s4OffsetTop + this.prevHeight < 0 || this.webpart.scrollTop() > this.prevHeight) && this.firstRow.length)){
				this.sticky.hasClass("stickyHeader") ? null : this.toggleSticky(true)
				this.sticky.css({"left": this.webpart.offset().left,
								 "top" : (!this.fixedHeight || this.webpartOffsetTop < (this.s4OffsetTop + 2)) ? (this.s4OffsetTop + 2) :  (this.webpartOffsetTop)})
			} else {
				this.sticky.hasClass("stickyHeader") ? this.toggleSticky(false) : null
			}
		})
		this.toggleSticky = function(mode){
			var headerChildren = (this.listType == "GroupedList") ? this.list.find("tbody[id^=titl]").first().find("td") : this.firstRow.children("td")
			var _stickyHeight = this.stickyHeight
			headerChildren.each(function(){
				jQuery(this).css("padding-top", parseInt(jQuery(this).css("padding-top")) + _stickyHeight * (mode == true ? 1 : -1))
			})
			this.sticky.css({"position": mode ? "fixed" : "static", 
							 "display" : mode ? "none"  : "table-row"}).removeClass("sticky")
			this.listType == "NormalList" ? (mode ? this.list.addClass("addPadding").fadeIn() : this.list.removeClass("addPadding")) : null
			mode ? this.sticky.addClass("stickyHeader").fadeIn() : this.sticky.removeClass("stickyHeader")
		}
	}
	/*
	 * jQuery throttle / debounce - v1.1 - 3/7/2010
	 * http://benalman.com/projects/jquery-throttle-debounce-plugin/
	 *
	 * Copyright (c) 2010 "Cowboy" Ben Alman
	 * Dual licensed under the MIT and GPL licenses.
	 * http://benalman.com/about/license/
	 */
	function throttleUpdates (delay, no_trailing, callback, debounce_mode) {
		var timeout_id, last_exec = 0
		function wrapper() {
			var that = this, elapsed = + new Date() - last_exec, args = arguments
			function exec() {
				last_exec = + new Date()
				callback.apply(that, args)
			}
			if(debounce_mode && !timeout_id) {
				exec()
			}
			timeout_id && clearTimeout(timeout_id)
			if(debounce_mode === undefined && elapsed > delay) {
				exec()
			} else if(no_trailing !== true) {
				timeout_id = setTimeout(debounce_mode ? timeout_id = undefined : exec, debounce_mode === undefined ? delay - elapsed : delay)
			}
		}
		if(jQuery.guid) wrapper.guid = callback.guid = callback.guid || jQuery.guid++
		return wrapper
	}
	(function () {
		if(!jQuery("#MSOLayout_InDesignMode").val() && !jQuery("#_wikiPageMode").val()){
			if(jQuery.inArray("spgantt.js", g_spPreFetchKeys) > -1) {
				ExecuteOrDelayUntilScriptLoaded(function () {
					setTimeout(function () {
						findListsAndAttachHandlers()
					}, 0)
				}, "spgantt.js")
			} else {
				findListsAndAttachHandlers()
			}
			if(typeof _spWebPartComponents != "undefined" && Object.keys(_spWebPartComponents).length === 1) {
				ExecuteOrDelayUntilScriptLoaded(function(){
					ShowContextRibbonSections = (function fn(){
						SP.Ribbon.WebPartComponent.registerWithPageManager({editable: true, isEditMode: false, allowWebPartAdder: false})
						SP.Ribbon.WebPartComponent.get_instance().selectWebPart(jQuery("#MSOZoneCell_" + Object.keys(_spWebPartComponents))[0], true)
						return fn
					})()
					ExecuteOrDelayUntilScriptLoaded(function(){
						var DeselectAllWPItems_old = DeselectAllWPItems
						DeselectAllWPItems = function () {
							DeselectAllWPItems_old()
							setTimeout(function () { 
								ShowContextRibbonSections() 
							}, 25)
						}
					}, "core.js")
				}, "sp.ribbon.js")
			}
			jQuery("<div/>",{html: "&shy;<style>" +
											".stickyHeader {" +
												"border: 1px solid grey;" +
												"background-color: white;" +
												"box-shadow: 0 0 6px -2px black;" +
												"z-index: 1;" +
											"} " +
											".stickyHeader > th {" +
												"position: relative;" +
											"} " +
											".ms-listviewtable th .ms-core-menu-box {" +
												"top: auto !important;" +
												"left: auto !important;" +
											"}" +
											".stickyHeader th:not([id^='spgridcontainer']) {" +
												"border-bottom: 0 !important;" +
											"}" +
											".ms-listviewtable.addPadding {" +
												"padding-right: 26px !important;" +
											"}" +
										"</style>"
							}).appendTo("body")
		}
	})()
}