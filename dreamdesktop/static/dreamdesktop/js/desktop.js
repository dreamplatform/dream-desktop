$(document).ready(function () {

  /*==========================================================
    GLOBALS
  ==========================================================*/

  var g = {};
  g.page = $('#page');
  g.menu = $('#dw-menu');
  g.addGadgetsPanel = $('#add-gadgets-panel');
  g.grid = $('#grid');
  g.gridContent = $('#grid-content');
  g.gadgetList = new Array();
  g.zoomControl = $('#zoom-overlay-control');
  g.sbWidth = getScrollbarWidth();

  /*==========================================================
    INITS
  ==========================================================*/

  resize_grid();
  initKinetic();
  infoBoxes();
  initZoom();

  /*==========================================================
    LISTENERS
  ==========================================================*/

  // Toggle add gadgets mode
  $('.toggle-add-gadgets-mode').on('click', function() {
    toggle_add_gadgets_mode();
  });

  // Toggle edit mode
  $('.toggle-edit-mode').on('click', function() {
    toggle_edit_mode();
  });

  // Toggle zoom mode
  $('.toggle-zoom-mode').on('click', function() {
    gridOverview();
  });

  // Add/Remove gadget via add gadgets panel
  g.addGadgetsPanel.on('click', '.gadget', function () {
    if ($(this).hasClass('active')) {
      var $targetGadget = g.grid.find('.gadget[data-gadget-id="' + $(this).attr('data-gadget-id') + '"]');
      removeGadget($targetGadget);
    } else {
      addGadget($(this));
    }
  });

  // Remove gadget via gadget's remove button 
  g.grid.on('click', '.gadget .remove', function () {
    removeGadget($(this).closest('.gadget'));
  });

  // Keyboard shortcuts
  $(window).on('keyup', function (e) {

    // Toggle edit mode (e)
    if (e.which == 69) {
      toggle_edit_mode();
      $('.toggle-edit-mode').children('.button-tooltip').clearQueue().fadeIn().delay(1000).fadeOut(300, function(){ $(this).css({'display': '', 'opacity': 1}); });
    }

    // Toggle zoom mode (z)
    if (e.which == 90) {
      gridOverview();
      $('.toggle-zoom-mode').children('.button-tooltip').clearQueue().fadeIn().delay(1000).fadeOut(300, function(){ $(this).css({'display': '', 'opacity': 1}); });
    }

    // Toggle add gadgets mode (a, +)
    if (e.which == 65 || e.which == 107) {
      if ($('html').hasClass('add-gadgets-mode-active')) {
        $('.toggle-add-gadgets-mode').children('.button-tooltip').clearQueue().fadeIn().delay(1000).fadeOut(300, function(){ $(this).css({'display': '', 'opacity': 1}); });
      }
      toggle_add_gadgets_mode();
    }

    // Toggle fullscreen mode (f)
    if (e.which == 70) {
      toggle_fullscreen_mode();
    }

    // Deactivate all modes (esc)
    if (e.which== 27) {
    
      // Deactivate fullscreen mode
      if ($('html').hasClass('fullscreen-mode-active')) {
        toggle_fullscreen_mode();
      }

      // Deactivate edit mode
      if ($('html').hasClass('edit-mode-active')) {
        toggle_edit_mode();
      }

      // Deactivate add gadgets mode
      if ($('html').hasClass('add-gadgets-mode-active')) {
        toggle_add_gadgets_mode();
      }

      // Deactivate zoom mode
      if (g.grid.hasClass('zoom-active')) {
        gridOverview();
      }

    }

  });

  // Iframe preloading
  /*
  $('.gadget iframe').on('load', function(){
    $(this).closest('.gadget').hide();
    $(this).closest('.gadget').removeClass('gadget-loading');
    $(this).closest('.gadget').fadeIn(1000);
  });
  */
  (function(){
    var deferreds = [],
        gadgetFrames = $('.gadget iframe');

    gadgetFrames.each(function(){
      var $this = $(this),
          deferred = $.Deferred();

      deferreds.push(deferred);
      $this.data('deferred', deferred);

      $this.on('load.dream-preloader, error.dream-preloader', function(){
        $(this).off('load.dream-preloader, error.dream-preloader').data('deferred').resolve();
      });

      // Timeout if gadget takes too long to load
      window.setTimeout(function(){
        $this.off('load.dream-preloader, error.dream-preloader').data('deferred').resolve();
      }, 5000);
    });
    
    $.when.apply(null, deferreds).then(function(){
      gadgetFrames.each(function(){
        var $this = $(this),
            timeout = Math.floor(Math.random() * 1000);

        window.setTimeout(function(){
          $this.closest('.gadget').hide();
          $this.closest('.gadget').removeClass('gadget-loading');
          $this.closest('.gadget').fadeIn(1000);
        }, timeout);
      });
    });
  })();

  // Keep gadgetList updated regardless of future implementations
  $(document).on('mousedown mouseup', updateGadgetList);
  $(document).on('mousedown', '.gadget', function(){ updateGadgetIndex($(this)); });
  $(document).on('mouseup', function(){ g.currentGadget = -1; });

  /*==========================================================
    FUNCTIONS
  ==========================================================*/

  function resize_grid(enlargeOnly) {

    var max_x = 0;
    var max_y = 0;

    g.grid.find('.gadget, #gadgetDragPlaceholder').each(function () {
    
      var right_x = parseInt($(this).css('left'));
      var bottom_y = parseInt($(this).css('top'));

      // Find the furthest point of gadget on the X-axis
      right_x += $(this).outerWidth(true);

      // Change into coordinates
      right_x = Math.round(right_x/100);

      // Find the furthest point of gadget on the Y-axis
      bottom_y += $(this).outerHeight(true);

      // Change into coordinates
      bottom_y = Math.round(bottom_y/100);

      // Update max values
      if (right_x > max_x) {
        max_x = right_x;
      }
      if (bottom_y > max_y) {
        max_y = bottom_y;
      }

    });

    // Check if we are enlarging or not
    if (enlargeOnly) {

      // Resize if bigger
      if (parseFloat(g.gridContent.css('width')) < max_x * 100) {
        g.gridContent.css({ width: max_x * 100 });
      }

      // Resize if bigger
      if(parseFloat(g.gridContent.css('height') ) < max_y * 100) {
        g.gridContent.css({ height: max_y * 100 });
      }

    } else {

      // Set width & height of grid container
      g.gridContent.css({
        width: max_x * 100,
        height: max_y * 100
      });

    }

  }

  function initKinetic() {

    g.grid.kinetic({
      /* triggerHardware: true,*/
      maxvelocity: 200,
      filterTarget: function (e) {

        var gcLeft = g.grid.offset().left;
        var gcTop = g.grid.offset().top;
        var gcWidth = g.grid.outerWidth();
        var gcHeight = g.grid.outerHeight();

        // Check if dragging scrollbar
        if ((e.pageX <= (gcLeft + gcWidth) && e.pageX >= (gcLeft + gcWidth - g.sbWidth)) || (e.pageY <= (gcTop + gcHeight) && e.pageY >= (gcTop + gcHeight - g.sbWidth))) {
          return false;
        }

        // Check if noscrolldrag class
        if ($(e.target).parent().hasClass('noscrolldrag')) {
          return false;
        }

        // In other cases, return true
        return true;

      }
    });

  }

  // Get device scrollbar width
  function getScrollbarWidth() {  
    var inner = document.createElement('p');
    inner.style.width = "100%";
    inner.style.height = "200px";
    var outer = document.createElement('div');
    outer.style.position = "absolute";
    outer.style.top = "0px";
    outer.style.left = "0px";
    outer.style.visibility = "hidden";
    outer.style.width = "200px";
    outer.style.height = "150px";
    outer.style.overflow = "hidden";
    outer.appendChild(inner);
    document.body.appendChild(outer);
    var w1 = inner.offsetWidth;
    outer.style.overflow = 'scroll';
    var w2 = inner.offsetWidth;
    if (w1 == w2) { w2 = outer.clientWidth; }
    document.body.removeChild(outer);
    return (w1 - w2);
  }

  function toggle_edit_mode() {

    // Break conditions 
    if (g.grid.is(':animated') || g.addGadgetsPanel.is(':animated')) {
      return;
    }

    // Activate
    if (!$('html').hasClass('edit-mode-active')) {

      // Disable zoom
      if(g.grid.hasClass('zoom-active')) {
        gridOverview();
      }

      // Add active class
      $('.toggle-edit-mode').addClass('active');

      // Add active class
      $('html').addClass('edit-mode-active');

      // Add editing capabilities
      add_edit_capabilities();

    // Disable
    } else {

      // Remove active class
      $('.toggle-edit-mode').removeClass('active');

      // Remove active class
      $('html').removeClass('edit-mode-active');

      // Remove editing capabilities
      remove_edit_capabilities();
      
    }

  }

  function toggle_add_gadgets_mode() {

    // Break conditions 
    if (g.grid.is(':animated') || g.addGadgetsPanel.is(':animated') || $('html').hasClass('fullscreen-mode-active')) {
      return;
    }
    
    // Disable zoom
    if(g.grid.hasClass('zoom-active')) {
      gridOverview();
    }

    // Remove infobox
    $('#tooltip-infobox').remove();

    // Activate
    if (!$('html').hasClass('add-gadgets-mode-active')) {

      // Add active class
      $('.toggle-add-gadgets-mode').addClass('active');

      // Add active class
      $('html').addClass('add-gadgets-mode-active');

      // Chrome animate fix (give grid inline left value before animating)
      g.grid.css('left', g.grid.css('left'));

      // Slide grid
      g.grid.animate({left: '350px'}, 600, 'easeOutExpo', function () {

        // If edit mode is on -> reboot edit cpabilities
        if ($('html').hasClass('edit-mode-active')) {
          reboot_edit_capabilities();
        }

      });

      // Chrome animate fix (give #add-gadgets-panel inline left value before animating)
      g.addGadgetsPanel.css('left', g.addGadgetsPanel.css('left'));

      // Slide add gadgets panel
      g.addGadgetsPanel.show().animate({left: '0px'}, 600, 'easeOutExpo');

    // Disable
    } else {

      // Remove active class
      $('.toggle-add-gadgets-mode').removeClass('active');

      // Slide grid
      g.grid.animate({left: '0px'}, 600, 'easeOutExpo', function () {

        // Remove active class
        $('html').removeClass('add-gadgets-mode-active');

        // If edit mode is on -> reboot edit cpabilities
        if ($('html').hasClass('edit-mode-active')) {
          reboot_edit_capabilities();
        }

      });

      // Slide add gadgets panel
      g.addGadgetsPanel.animate({left: '-355px'}, 600, 'easeOutExpo', function () {
        $(this).hide();
      });

    }

  }

  function toggle_fullscreen_mode() {

    // Stop possible animations
    g.grid.stop(true, true);
    g.addGadgetsPanel.stop(true, true);

    // Activate
    if (!$('html').hasClass('fullscreen-mode-active')) {

      // Remove infobox
      $('#tooltip-infobox').remove();

      // Hide menu and panel, and dreamwidget
      g.menu.hide();
      g.addGadgetsPanel.hide();
      $('#dreamwidget').hide();

      // Save page's current positions and reposition it to fill the entire screen
      g.page
        .data('leftBeforeFullscreen', g.page.css('left'))
        .data('rightBeforeFullscreen', g.page.css('right'))
        .data('topBeforeFullscreen', g.page.css('top'))
        .data('bottomBeforeFullscreen', g.page.css('bottom'))
        .css({ left: '0px', right: '0px', top: '0px', bottom: '0px' });

      // Add active class
      $('html').addClass('fullscreen-mode-active');

      // If edit mode is on -> reboot edit capabilities
      if ($('html').hasClass('edit-mode-active')) {
        reboot_edit_capabilities();
      }

    // Disable
    } else {

      // Return grid's original left & top values
      g.page.css({
        left: g.page.data('leftBeforeFullscreen'),
        right: g.page.data('rightBeforeFullscreen'),
        top: g.page.data('topBeforeFullscreen'),
        bottom: g.page.data('bottomBeforeFullscreen')
      });

      // Show menu, panel and dreambar
      g.menu.show();
      g.addGadgetsPanel.show();
      $('#dreamwidget').show();

      // Remove active class
      $('html').removeClass('fullscreen-mode-active');

      // If edit mode is on -> reboot edit capabilities
      if ($('html').hasClass('edit-mode-active')) {
        reboot_edit_capabilities();
      }

    }

  }

  // Add drag, resize & remove to gadgets
  function add_edit_capabilities() {

    var $gridContainer = g.grid,
        $grid = g.gridContent,
        $gadgets = $grid.find('.gadget'),
        grid_size_x = 100,
        grid_size_y = 100,
        x_start = $gridContainer.offset().left,
        x_end = 10000,
        y_start = $gridContainer.offset().top,
        y_end = 10000;

    $gadgets.each(function () {

      var $gadget = $(this),
          id = $gadget.attr('data-id'),
          $gui_elements = $('<span class="move"></span><span class="remove"></span><div class="ui-resizable-handle"></div>'),
          min_w = $(this).data('min-width'),
          min_h = $(this).data('min-height'),
          max_w = $(this).data('max-width'),
          max_h = $(this).data('max-height'),
          gadget_start_left, gadget_start_top;

      // Add gadget move overlay, remove button and resize handle
      $gadget.append($gui_elements);

      // Make gadgets draggable
      $gadget.draggable({
        containment: [x_start, y_start, x_end, y_end],
        scrollSensitivity: 150,
        scrollSpeed: 40,
        zIndex: 99,
        stack: '#grid .gadget',
        start: function (event, ui) {
          gadget_start_left = $gadget.position().left;
          gadget_start_top = $gadget.position().top;
        },
        drag: function (event, ui) {
          resize_grid(true); // enlargeOnly = true
          gadgetPlaceholder('position', $gadget);
        },
        stop: function (event, ui) {

          // Get placeholder position
          var gadget_left = gadgetPlaceholder('getPosition').left,
              gadget_top = gadgetPlaceholder('getPosition').top,
              gadget_zIndex = $gadget.css('z-index');

          // Update gadget position
          $gadget
          .attr('data-left', gadget_left)
          .attr('data-top', gadget_top)
          .css('z-index', 99)
          .animate({top: gadget_top + 'px', left: gadget_left + 'px'}, 200, function() {

            // Return the correct z-index
            $gadget.css({'z-index': gadget_zIndex});

            // Remove placeholder
            gadgetPlaceholder('destroy');

          });

          // Update grid dimensions
          resize_grid();

          // Post data
          $.ajax({
            url: '/services/gadget/position/',
            type: 'POST',
            data: {id: id, top: gadget_top, left: gadget_left},
            success: function () {},
            error: function () {

              // Restate gadget position
              $gadget
              .attr('data-left', gadget_start_left)
              .attr('data-top', gadget_start_top)
              .css({'left': gadget_start_left, 'top': gadget_start_top});

              // Let user know somehow that the ajax post failed
              alert('There was an error connecting to database, please try again.');

            }
          });

        }
      });

      // If min is not max, make gadget resizable 
      if (!(min_w == max_w && min_h == max_h)) {

        $gadget.resizable({
          maxHeight: max_h * grid_size_y,
          maxWidth: max_w * grid_size_x,
          minHeight: min_h * grid_size_y,
          minWidth: min_w * grid_size_x,
          grid: [grid_size_x, grid_size_y],
          handles: {se: '.ui-resizable-handle'},
          stop: function (event, ui) {

            var current_width = $gadget.outerWidth(true) / grid_size_x,
                current_height = $gadget.outerHeight(true) / grid_size_y;

            // Post data
            $.ajax({
              url: '/services/gadget/position/',
              type: 'POST',
              data: {id: id, width: current_width, height: current_height},
              success: function () {

                // Update width/height classes, remove inline height/width styles and update data attributes
                $gadget
                  .attr('class', $gadget.attr('class').replace(/(w_)[0-9]+/, 'w_' + current_width).replace(/(h_)[0-9]+/, 'h_' + current_height))
                  .css({'width': '', 'height': ''})
                  .attr('data-width', current_width)
                  .attr('data-height', current_height);

                resize_grid();

              },
              error: function () {
                
                // Undo resize by removing inline width and height styles
                $gadget.css({'width': '', 'height': ''});

                resize_grid();

                // Let user know somehow that the ajax post failed
                alert('There was an error connecting to database, please try again.');

              }
            });

          }
        });

      // If min is max, remove resize handle 
      } else {

        $gadget.find('.ui-resizable-handle').remove();

      }

    });

  }

  // Remove drag, resize & remove from gadgets
  function remove_edit_capabilities() {

    resize_grid();

    // Remove edit gui elements
    $('#grid .move, #grid .remove').remove();

    // Destroy draggables and resizables
    $('#grid .gadget').each(function () {

      if ($(this).hasClass('ui-draggable')) {
        $(this).draggable('destroy');
      }

      if ($(this).hasClass('ui-resizable')) {
        $(this).resizable('destroy');
      }

    });

  }

  // Utility function - reboot edit capabilities
  function reboot_edit_capabilities() {
    remove_edit_capabilities();
    add_edit_capabilities();
  }

  // Add gadget function
  function addGadget(gadget) {

    var id = gadget.attr('data-gadget-id');
    var $gridGadget = g.grid.find('.gadget[data-gadget-id="' + id + '"]');

    // Do nothing if grid is animated or if any list gadget is processing data or if gadget already exists on the grid
    if (g.grid.is(':animated') || g.addGadgetsPanel.hasClass('processing') || gadget.hasClass('active')) {
      return;
    }

    // Add "processing" class
    gadget.addClass('processing');
    g.addGadgetsPanel.addClass('processing');

    // Post data
    $.ajax({
      url: '/services/gadget/add/?ret=id',
      type: 'POST',
      data: {gadgetid : id},
      success: function (data) {

        // NOTE: data should return only user-gadget id (and nothing else!)
        var user_gadget_id = data,
            viewport_center_y = g.grid.height() / 2 + g.grid.scrollTop(),
            viewport_center_x = g.grid.width() / 2 + g.grid.scrollLeft(),
            gadget_width = gadget.attr('data-default-width'),
            gadget_height = gadget.attr('data-default-height'),
            gadget_top = Math.round( ( viewport_center_y - gadget_height * 100 / 2 ) / 100 ) * 100,
            gadget_left = Math.round( ( viewport_center_x - gadget_width * 100 / 2 ) / 100 ) * 100;

        // Check overlap and find the closest non-overlapping position
        if( checkOverlap( gadget_top, gadget_left, gadget_width * 100, gadget_height * 100 ) ) {
          var newPos = findPosition( gadget_top, gadget_left, gadget_width * 100, gadget_height * 100 );
          gadget_top = newPos.top;
          gadget_left = newPos.left;
        }

        // Post position data
        $.ajax({
          url: '/services/gadget/position/',
          type: 'POST',
          data: {id: user_gadget_id, top: gadget_top, left: gadget_left, width: gadget_width, height: gadget_height},
          success: function () {

            // Add gadget to grid
            addGadgetToGrid(gadget, user_gadget_id, gadget_top, gadget_left);

          },
          error: function () {

            // Remove "processing" class
            gadget.removeClass('processing');
            g.addGadgetsPanel.removeClass('processing');

          }
        });

      },
      error: function () {

        // Remove "processing" class
        gadget.removeClass('processing');
        g.addGadgetsPanel.removeClass('processing');

      }
    });

  }

  // Function for adding gadget to grid
  function addGadgetToGrid(listGadget, userGadgetID, gadget_top, gadget_left) {

    var scrollbarWidth = getScrollbarWidth();

    // Activate edit mode if it is not already activated
    /*
    if(!$('html').hasClass('edit-mode-active')) {
      toggle_edit_mode();
    }
    */

    // Create placeholder
    $placeholder = $('<div class="placeholder"></div>');

    // Get gadget data
    var gadget_id = listGadget.attr('data-gadget-id'),
        gadget_url = listGadget.attr('data-url'),
        gadget_name = listGadget.attr('data-name'),
        gadget_description = listGadget.attr('data-description'),
        gadget_width = listGadget.attr('data-default-width'),
        gadget_height = listGadget.attr('data-default-height'),
        gadget_width_min = listGadget.attr('data-min-width'),
        gadget_height_min = listGadget.attr('data-min-height'),
        gadget_width_max = listGadget.attr('data-max-width'),
        gadget_height_max = listGadget.attr('data-max-height');

    // Create gadget object
    var $newGadget = $('<div class="gadget noscrolldrag"><iframe src="' + gadget_url + '" frameborder="0"></iframe></div>');

    // Add data to gadget object
    $newGadget
      .addClass('w_' + gadget_width)
      .addClass('h_' + gadget_height)
      .attr('data-id', userGadgetID)
      .attr('data-gadget-id', gadget_id)
      .attr('data-url', gadget_url)
      .attr('data-name', gadget_name)
      .attr('data-description', gadget_description)
      .attr('data-top', gadget_top)
      .attr('data-left', gadget_left)
      .attr('data-width', gadget_width)
      .attr('data-min-width', gadget_width_min)
      .attr('data-max-width', gadget_width_max)
      .attr('data-height', gadget_height)
      .attr('data-min-height', gadget_height_min)
      .attr('data-max-height', gadget_height_max)
      .css({
        'left': gadget_left,
        'top': gadget_top,
        'visibility': 'hidden'
      });

    // Append the gadget
    g.gridContent.append($newGadget);

    // Add placeholder styles
    $placeholder.css({
      'position': 'absolute',
      'left': $newGadget.position().left,
      'top': $newGadget.position().top,
      'width': $newGadget.width(),
      'height': $newGadget.height()
    });

    // Append placeholder
    g.gridContent.append($placeholder);

    // Resize grid
    resize_grid();

    // Reboot draggables and resizables to make the appended gadget resizable and draggable
    if($('html').hasClass('edit-mode-active')) {
      remove_edit_capabilities();
      add_edit_capabilities();
    }

    // Scroll to the gadget (center on gadget)
    g.grid.animate({scrollTop: $newGadget.position().top + ( $newGadget.height() + 10 ) / 2 - ( g.grid.height() - scrollbarWidth ) / 2, scrollLeft: $newGadget.position().left + ( $newGadget.width() + 10 ) / 2 - ( g.grid.width() - scrollbarWidth * 2 ) / 2}, 400, function () {
      
      // Do a nice little highlight effect
      $newGadget.css({'visibility': 'visible', 'display': 'none'}).fadeIn(400, function () {

        // Remove placeholder
        $placeholder.remove();

        // Remove "processing" classes and add "active" classes
        listGadget.removeClass('processing').addClass('active');
        g.addGadgetsPanel.removeClass('processing');

      });

    });

    // Update gadget list
    updateGadgetList();

    /* Notification API example
    // Notify
    if( ! $('html').hasClass('edit-mode-active') ) {
      dream.notify('Lisäsit gadgetin. Jos haluat siirtää sen eri kohtaan, klikkaa tästä, tai paina [e].', 'notify', function() {
        if( ! $('html').hasClass('edit-mode-active') ) {
          toggle_edit_mode();
          $('.toggle-edit-mode').children('.button-tooltip').clearQueue().fadeIn().delay(3000).fadeOut(300, function() { $(this).css({'display': '', 'opacity': 1}); });

          dream.notify('Siirryit muokkaustilaan. Pääset takaisin käyttämään gadgetteja klikkaamalla muokkaustilaa valikkopalkista tai painamalla [e].');
        }
      });
    } else {
      dream.notify('Lisäsit gadgetin. Muista siirtyä pois muokkaustilasta [e], niin pääset käyttämään gadgetteja.');
    }
    */
  }

  function removeGadget(gadget) {

    var id = gadget.attr('data-gadget-id');
    var $listGadget = g.addGadgetsPanel.find('.gadget[data-gadget-id="' + id + '"]');

    // Do nothing if grid is animated or if any list gadget is processing data
    if (g.grid.is(':animated') || g.addGadgetsPanel.hasClass('processing')) {
      return;
    }

    // Add "processing" classes
    $listGadget.addClass('processing');
    g.addGadgetsPanel.addClass('processing');

    // Post data
    $.ajax({
      url: '/services/gadget/remove/',
      type: 'POST',
      data: {gadgetid : id},
      success: function (data) {

        // Grid gadget fade out
        gadget.fadeOut(400, function () {

          // Remove gadget
          gadget.remove();

          // Update grid dimensions
          resize_grid();

          // Remove "processing" & "active" classes
          $listGadget.removeClass('processing active');
          g.addGadgetsPanel.removeClass('processing');

        });

      },
      error: function () {

        // Remove "processing" classes
        $listGadget.removeClass('processing');
        g.addGadgetsPanel.removeClass('processing');

      }
    });

  }

  // Check if gadget overlaps other gadgets
  function checkOverlap( gadget_top, gadget_left, gadget_width, gadget_height ) {
    var overlap = false;

    for(var i = 0; i < g.gadgetList.length; i++) {
      if(g.currentGadget == i) {
        continue;
      }
      var position = g.gadgetList[i].position,
          width = g.gadgetList[i].width + 10,
          height = g.gadgetList[i].height + 10;
      if (
        ( // If left..
          ( gadget_left + gadget_width > position.left && gadget_left + gadget_width <= position.left + width ) ||
          // ...or right side overlaps
          ( gadget_left >= position.left && gadget_left < position.left + width ) ||
          // Or both are in-...
          ( gadget_left > position.left && gadget_left + gadget_width < position.left + width ) ||
          // ...or outside the target
          ( gadget_left < position.left && gadget_left + gadget_width > position.left + width )
        ) && ( // And top...
          ( gadget_top + gadget_height > position.top && gadget_top + gadget_height <= position.top + height ) ||
          // ...or bottom side overlaps
          ( gadget_top >= position.top && gadget_top < position.top + height ) ||
          // Or both are in-...
          ( gadget_top > position.top && gadget_top + gadget_height < position.top + height ) ||
          // ...or outside the target
          ( gadget_top < position.top && gadget_top + gadget_height > position.top + height )
        )
      ) // Then this is an overlapping gadget
      overlap = true;
      // Also check if we are out of bounds
      if( gadget_top < 0 || gadget_left < 0 )
        overlap = true;
    }

    return overlap;
  }

  // Function to find the closest non-overlapping position for a gadget
  function findPosition(gadget_top, gadget_left, gadget_width, gadget_height) {

    var i, j, tmp_top, tmp_left;

    overlap_loop:
    // Check every square around the current position, and move to a wider area until a non-overlapping spot is found
    for( i = 1; i < 100; i++ ) {
      // Check top-left sides
      for( j = 0; j <= i; j++ ) {
        // We keep the new values in temporary variables so we can calculate future values relative to the original
        tmp_top = gadget_top - j * 100;
        tmp_left = gadget_left - i * 100;
        if( ! checkOverlap( tmp_top, tmp_left, gadget_width, gadget_height ) )
          break overlap_loop;
        tmp_top = gadget_top - i * 100;
        tmp_left = gadget_left - j * 100;
        if( ! checkOverlap( tmp_top, tmp_left, gadget_width, gadget_height ) )
          break overlap_loop;
      }
      // Check top-right sides
      for( j = 0; j <= i; j++ ) {
        tmp_top = gadget_top - j * 100;
        tmp_left = gadget_left + i * 100;
        if( ! checkOverlap( tmp_top, tmp_left, gadget_width, gadget_height ) )
          break overlap_loop;
        tmp_top = gadget_top - i * 100;
        tmp_left = gadget_left + j * 100;
        if( ! checkOverlap( tmp_top, tmp_left, gadget_width, gadget_height ) )
          break overlap_loop;
      }
      // Check bottom-left sides
      for( j = 0; j <= i; j++ ) {
        tmp_top = gadget_top + j * 100;
        tmp_left = gadget_left - i * 100;
        if( ! checkOverlap( tmp_top, tmp_left, gadget_width, gadget_height ) )
          break overlap_loop;
        tmp_top = gadget_top + i * 100;
        tmp_left = gadget_left - j * 100;
        if( ! checkOverlap( tmp_top, tmp_left, gadget_width, gadget_height ) )
          break overlap_loop;
      }
      // Check bottom-right sides
      for( j = 0; j <= i; j++ ) {
        tmp_top = gadget_top + j * 100;
        tmp_left = gadget_left + i * 100;
        if( ! checkOverlap( tmp_top, tmp_left, gadget_width, gadget_height ) )
          break overlap_loop;
        tmp_top = gadget_top + i * 100;
        tmp_left = gadget_left + j * 100;
        if( ! checkOverlap( tmp_top, tmp_left, gadget_width, gadget_height ) )
          break overlap_loop;
      }
    }

    return { top: tmp_top, left: tmp_left };

  }

  // Update list of gadgets
  function updateGadgetList() {
    var gadgets = g.grid.find('.gadget'), gadget;
    g.gadgetList = new Array();
    gadgets.each(function() {
      gadget = {
        'position': $(this).position(),
        'width': $(this).width(),
        'height': $(this).height(),
        'object': $(this)
      }
      g.gadgetList.push(gadget);
    });
  }

  // Update current gadget index for exclusion
  function updateGadgetIndex(gadget) {
    for(var i = 0; i < g.gadgetList.length; i++) {
      if(gadget.is(g.gadgetList[i].object)) {
        g.currentGadget = i;
      }
    }
  }

  function gadgetPlaceholder(method, gadget) {

    var ns = 'gadgetDragPlaceholder';

    if (method === 'position') {

      var $placeholder = $('#' + ns).length === 1 ? $('#' + ns) : $('<div id="' + ns + '"></div>');
      var gadget_width = gadget.outerWidth(true);
      var gadget_height = gadget.outerHeight(true);
      var gadget_left = gadget.position().left;
      var gadget_top = gadget.position().top;
      var gadget_left_final = gadget_left;
      var gadget_top_final = gadget_top;
      var grid_size_x = 100;
      var grid_size_y = 100;
      var gadget_position;

      // Snap left edge to grid
      if (!is_integer(gadget_left / grid_size_x)) {
        gadget_left_final = Math.round((gadget_left / grid_size_x)) * grid_size_x;
      }

      // Snap top edge to grid
      if (!is_integer(gadget_top / grid_size_y)) {
        gadget_top_final = Math.round((gadget_top / grid_size_y)) * grid_size_y;
      }

      // Find a free position on the grid
      if(checkOverlap(gadget_top_final, gadget_left_final, gadget_width, gadget_height) ) {
        gadget_position = findPosition(gadget_top_final, gadget_left_final, gadget_width, gadget_height);
      } else {
        gadget_position = { left: gadget_left_final, top: gadget_top_final };
      }

      $placeholder
      .attr('data-left', gadget_position.left)
      .attr('data-top', gadget_position.top)
      .css({
        position: 'absolute',
        zIndex: 98,
        width: gadget_width,
        height: gadget_height,
        left: gadget_position.left,
        top: gadget_position.top
      });

      if ($('#' + ns).length === 0) {
        g.gridContent.append($placeholder);
      }

    }

    if (method === 'getPosition') {

      return { left: $('#' + ns).attr('data-left'), top: $('#' + ns).attr('data-top') };

    }

    if (method === 'destroy') {

      $('#' + ns).remove();

    }

  }

  // Scroll grid container
  function scrollToPosition(posX, posY, percentage, centered, animated) {

    var tempX = posX;
    var tempY = posY;
    var finalX, finalY; 

    if (percentage === true) {
      tempX = (posX / 100) * g.gridContent.outerWidth();
      tempY = (posY / 100) * g.gridContent.outerHeight();
    }

    finalX = tempX;
    finalY = tempY;

    if (centered === true) {
      finalX = tempX - (g.grid.width() / 2);
      finalY = tempY - (g.grid.height() / 2);
    }

    if(animated === true) {
      g.grid.animate({
        'scrollTop': finalY,
        'scrollLeft': finalX
      }, 600);
    } else {
      g.grid.scrollTop(finalY).scrollLeft(finalX);
    }

  }

  // Utility function - check if value is integer
  function is_integer(n) {
   return n % 1 === 0;
  }

  // Infobox tooltips
  function infoBoxes() {

    // There can be only one infobox at a time visible, and this is it's id
    var id = 'tooltip-infobox';

    // Timers
    var timerIn = null,
        timerOut = null;

    // Bind show & hide listeners
    $(document)
      .on('mouseenter', '#add-gadgets-panel .gadget', function () {
        showInfoBox($(this));
      })
      .on('mouseleave', '#add-gadgets-panel .gadget', function () {
        hideInfoBox($(this));
      });

    // Special listeners & functionality for when mouse is hovering the infobox
    $(document)
      .on('mouseenter', '#' + id, function () {

        // If timerOut is not null -> clear and null timer
        if (timerOut !== null) {
          clearTimeout(timerOut);
          timerOut = null;
        }

      })
      .on('mouseleave', '#' + id, function () {

        // If timerIn is not null -> clear and null timer
        if (timerIn !== null) {
          clearTimeout(timerIn);
          timerIn= null;
        }

        // Start timerOut
        timerOut = setTimeout(function () {

          // Set timerOut to null
          timerOut = null;

          // Remove infobox (with a little fade effect)
          if ($('#' + id).length > 0) {
            $('#' + id).fadeOut(200, function () {
              $('#' + id).remove();
            });
          }

        }, 600);

      });

    // Show functionality
    function showInfoBox(gadget) {

      // Break conditions 
      if (g.grid.is(':animated') || g.addGadgetsPanel.is(':animated')) {
        return;
      }

      // Do some calculations and clone the infobox from the gadget object
      var $gadget = gadget,
          $infoBox = $gadget.find('.infobox').clone().attr('id', id).attr('data-gadget-id', id).attr('data-gadget-id', $gadget.attr('data-gadget-id'));

      // If the infobox already exists and it has the same id as the gadget
      if ($('#' + id).length > 0 && $('#' + id).attr('data-gadget-id') === $gadget.attr('data-gadget-id')) {

        // Clear and null timer
        clearTimeout(timerOut);
        timerOut = null;

        // Stop here
        return;

      }

      // If timerOut is not null
      if (timerOut !== null) {

        // Clear and null timer
        clearTimeout(timerOut);
        timerOut = null;

      }

      // Remove the current infobox if it is visible
      if ($('#' + id).length > 0) {
        $('#' + id).remove();
      }

      // Start timerIn
      timerIn = setTimeout(function () {

        // Set timerIn to null
        timerIn = null;

        // Render infobox
        renderInfoBox();

      }, 200);

      // Render function
      function renderInfoBox() {

        // Prestyle infobox
        $infoBox.css({
          'position': 'absolute',
          'display': 'block',
          'z-index': -1,
          'visibility': 'hidden'
        });

        // Append the infobox
        $('body').append($infoBox);

        // Position & show the infobox
        $infoBox
          .position({
            my: 'left top',
            at: 'right top',
            of: $gadget,
            offset: '20 0',
            collision: 'none fit'
          }).css({
            'z-index': 200,
            'visibility': 'visible'
          });

        // Apply a little fade effect
        $infoBox.hide().fadeIn(200);

      }

    }

    // Hide functionality
    function hideInfoBox(gadget) {

      // If timerIn is not null -> clear and null timer
      if (timerIn !== null) {
        clearTimeout(timerIn);
        timerIn = null;
      }

      // If infobox is visible
      if ($('#' + id).length > 0) {

        // Start timerOut
        timerOut = setTimeout(function () {

          // Set timerOut to null
          timerOut = null;

          // Remove infobox (with a little fade effect)
          if ($('#' + id).length > 0) {
            $('#' + id).fadeOut(200, function () {
              $('#' + id).remove();
            });
          }

        }, 600);

      }

    }

  }

  // Grid zooming
  var gridScrollDimensions = {};
  function initZoom() {
    $(g.grid).on('click', function(event, indirect) {
      if( ( event.button === 0 || indirect === true ) && g.grid.hasClass('zoom-active') ) {
        var gadget, scrollObject;
        g.grid.removeClass('zoom-active');
        gadget = $(document.elementFromPoint(event.clientX, event.clientY)).closest('.gadget');
        scrollObject = g.gridContent.data('original-scroll');
        if( gadget.length > 0 ) {
          scrollObject.x = Math.max( Math.min( parseInt(gadget.attr('data-left')) + parseInt(gadget.attr('data-width')) * 100 / 2 - g.grid.width() / 2, gridScrollDimensions.width ), 0 );
          scrollObject.y = Math.max( Math.min( parseInt(gadget.attr('data-top')) + parseInt(gadget.attr('data-height')) * 100 / 2 - g.grid.height() / 2, gridScrollDimensions.height ), 0 );
          g.gridContent.data('original-scroll', scrollObject);
        }
        g.grid.css('overflow-x', 'hidden'); // Chrome horizontal scroll bug workaround
        g.gridContent.zoomTo({'targetsize': 1, 'root': g.gridContent, 'animationendcallback': function() {
          g.grid.css('overflow-x', 'auto');
          scrollToPosition(scrollObject.x, scrollObject.y);
          $('.toggle-zoom-mode').removeClass('active');
        }});
      }
    });
  }
  window.gridOverview = function() {
    if( g.grid.hasClass('zoom-active') ) {
      g.grid.trigger('click', true);
      $('.toggle-zoom-mode').removeClass('active');
    } else {
      if ($('html').hasClass('edit-mode-active')) { toggle_edit_mode(); }
      if ($('html').hasClass('add-gadgets-mode-active')) { toggle_add_gadgets_mode(); }
      gridScrollDimensions.width = g.grid[0].scrollWidth - g.grid.width() + g.sbWidth;
      gridScrollDimensions.height = g.grid[0].scrollHeight - g.grid.height() + g.sbWidth;
      g.zoomControl.zoomTo({'targetsize': 0.9, 'root': g.gridContent});
      g.grid.addClass('zoom-active');
      $('.toggle-zoom-mode').addClass('active');
    }
  }

  window.setTimeout(function(){
    gridOverview();
    g.grid.css({'overflow': ''});
  }, 4);

});
