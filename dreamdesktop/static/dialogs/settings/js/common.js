$(function() {

// Global link toggles

  $('.toggle').click(function () {
  	target = $(this).attr('href');
    $(target).toggle();
    return false;
  });
  $('.slideToggle').click(function () {
  	target = $(this).attr('href');
    $(target).slideToggle(200);
    return false;
  });
  $('.fadeToggle').click(function () {
  	target = $(this).attr('href');
    $(target).fadeToggle(200);
    return false;
  });

// View change button

  $('.viewChange').live('click', function(event) {
    event.preventDefault();
    target = $(this).attr('href');
    $(this).closest('.contentBox').hide();
    $(target).fadeIn(200);
  });

// Tooltips

  loadTooltips();

  function loadTooltips(){
    $('.titleTT').each( function(index){
      if ($(this).attr('title') && $(this).attr('title') !== '' && $(this).attr('title') !== ' ') {
        $(this).tooltip({
          offset: [-7, 0],
          opacity: 0.9,
          delay: 0,
          tipClass: 'tooltip'
        }).dynamic();   
      }
    });

    $('.rightTT30').each( function(index){
      if ($(this).attr('title') && $(this).attr('title') !== '' && $(this).attr('title') !== ' ') {
        $(this).tooltip({
          offset: [-7, 30],
          position: "top left",
          opacity: 0.9,
          delay: 0,
          tipClass: 'tooltip rightTT30Wrap'
        });
      }
    });

    $('.rightTT38').each( function(index){
      if ($(this).attr('title') && $(this).attr('title') !== '' && $(this).attr('title') !== ' ') {
        $(this).tooltip({
          offset: [-7, 38],
          position: "top left",
          opacity: 0.9,
          delay: 0,
          tipClass: 'tooltip rightTT38Wrap'
        });
      }
    });

    $('.dynamicTT30').each( function(index){
      if ($(this).attr('title') && $(this).attr('title') !== '' && $(this).attr('title') !== ' ') {
        $(this).tooltip({
          offset: [-7, 0],
          opacity: 0.9,
          delay: 0,
          tipClass: 'tooltip dynamicTT30Wrap'
        }).dynamic({
          left: {
            position: "top left",
            offset: [-7, -30]
          },
          right: {
            position: "top right",
            offset: [-7, 30]
          }
        });
      }
    });

    $('.dynamicTT38').each( function(index){
      if ($(this).attr('title') && $(this).attr('title') !== '' && $(this).attr('title') !== ' ') {
        $(this).tooltip({
          offset: [-7, 0],
          opacity: 0.9,
          delay: 0,
          tipClass: 'tooltip dynamicTT38Wrap'
        }).dynamic({
          left: {
            position: "top left",
            offset: [-7, -38]
          },
          right: {
            position: "top right",
            offset: [-7, 38]
          }
        });
      }
    });

    // Remove all tooltips on any click
    $(document).bind('click', function (e) {
        $('.tooltip').hide();
    });

  }

// Tabs functionality

  $('.tab').click(function() {
    if ($(this).hasClass('active')) {
      return false;
    } else {
      target = $(this).attr('href');
      $('.tab').removeClass('active');
      $('.tabCont').removeClass('active').hide();
      $(this).addClass('active');
      $(target).addClass('active');
      $(target).fadeIn(200);
      dynamicInputWidth();
      return false;
    }
  });

// Dynamic action bar search field width

  function dynamicInputWidth() {
    $('.actionBox').bind('click', function() {
      var containerWidth = $(this).outerWidth(true);
      var button1Width = $(this).find('.action1').outerWidth(true);
      var button2Width = $(this).find('.action2').outerWidth(true);
      var inputWidth = containerWidth - button1Width - button2Width - 40;
      $(this).find('.search input').width(inputWidth);
    });
    $('.actionBox').trigger('click');
  };

// Simple dialog (SD) - Open function

  $('.sdOpen').click(function(e) {

    e.preventDefault();

    var id = $(this).attr('href');
    var overlay = $(id).find('.sdOverlay');
    var content = $(id).find('.sdContent');
    var winH = $(window).height();
    var winW = $(window).width();
 
    // Hide all open simple dialogs
    $('.sd, .sdOverlay, .sdContent').fadeOut(400);

    //Show dialog
    $(id).show();

    //Fade in overlay
    $(overlay).css({'width':winW,'height':winH});
    $(overlay).fadeTo(300,0.75);  
          
    //Fade in content
    $(content).fadeIn(400);

    //Set the content to center
    $(content).css('left', winW/2-$(content).width()/2);

  });

// Simple dialog (SD) - Close function
  
  $('.sdClose').click(function () {
    $('.sd, .sdOverlay, .sdContent').fadeOut(400);
  });

// Filterbox
    
  $('.filter').click(function(event) {
    event.preventDefault();
    // menu actions
    $(this).siblings('.filter').removeClass('active');
    $(this).toggleClass('active');
    // show/hide container
    target = $(this).attr('href');
    $(target).siblings('.filterContainer').hide();
    $(target).toggle();
  });

  $('.filterContainer .tag').click(function(event) {
    event.preventDefault();
    $(this).toggleClass('active');
    var filterType = $(this).closest('div').attr('id');
    var activeFilters = $('#' + filterType + ' a.active').length;
    if ( activeFilters > 0 ) { 
      $('.' + filterType + ' .indicator').addClass('active').text(' (' + activeFilters + ')');
    } else {
      $('.' + filterType + ' .indicator').removeClass('active').text('');
    }
  });

});
