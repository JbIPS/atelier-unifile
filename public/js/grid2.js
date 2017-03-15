/*
* debouncedresize: special jQuery event that happens once after a window resize
*
* latest version and complete README available on Github:
* https://github.com/louisremi/jquery-smartresize/blob/master/jquery.debouncedresize.js
*
* Copyright 2011 @louis_remi
* Licensed under the MIT license.
*/
var $event = $.event,
$special,
resizeTimeout;

$special = $event.special.debouncedresize = {
  setup: function() {
    $( this ).on( "resize", $special.handler );
  },
  teardown: function() {
    $( this ).off( "resize", $special.handler );
  },
  handler: function( event, execAsap ) {
    // Save the context
    var context = this,
      args = arguments,
      dispatch = function() {
        // set correct event type
        event.type = "debouncedresize";
        $event.dispatch.apply( context, args );
      };

    if ( resizeTimeout ) {
      clearTimeout( resizeTimeout );
    }

    execAsap ?
      dispatch() :
      resizeTimeout = setTimeout( dispatch, $special.threshold );
  },
  threshold: 250
};

// ======================= imagesLoaded Plugin ===============================
// https://github.com/desandro/imagesloaded

// $('#my-container').imagesLoaded(myFunction)
// execute a callback when all images have loaded.
// needed because .load() doesn't work on cached images

// callback function gets image collection as argument
//  this is the container

// original: MIT license. Paul Irish. 2010.
// contributors: Oren Solomianik, David DeSandro, Yiannis Chatzikonstantinou

// blank image data-uri bypasses webkit log warning (thx doug jones)
var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

$.fn.imagesLoaded = function( callback ) {
  var $this = this,
    deferred = $.isFunction($.Deferred) ? $.Deferred() : 0,
    hasNotify = $.isFunction(deferred.notify),
    $images = $this.find('img').add( $this.filter('img') ),
    loaded = [],
    proper = [],
    broken = [];

  // Register deferred callbacks
  if ($.isPlainObject(callback)) {
    $.each(callback, function (key, value) {
      if (key === 'callback') {
        callback = value;
      } else if (deferred) {
        deferred[key](value);
      }
    });
  }

  function doneLoading() {
    var $proper = $(proper),
      $broken = $(broken);

    if ( deferred ) {
      if ( broken.length ) {
        deferred.reject( $images, $proper, $broken );
      } else {
        deferred.resolve( $images );
      }
    }

    if ( $.isFunction( callback ) ) {
      callback.call( $this, $images, $proper, $broken );
    }
  }

  function imgLoaded( img, isBroken ) {
    // don't proceed if BLANK image, or image is already loaded
    if ( img.src === BLANK || $.inArray( img, loaded ) !== -1 ) {
      return;
    }

    // store element in loaded images array
    loaded.push( img );

    // keep track of broken and properly loaded images
    if ( isBroken ) {
      broken.push( img );
    } else {
      proper.push( img );
    }

    // cache image and its state for future calls
    $.data( img, 'imagesLoaded', { isBroken: isBroken, src: img.src } );

    // trigger deferred progress method if present
    if ( hasNotify ) {
      deferred.notifyWith( $(img), [ isBroken, $images, $(proper), $(broken) ] );
    }

    // call doneLoading and clean listeners if all images are loaded
    if ( $images.length === loaded.length ){
      setTimeout( doneLoading );
      $images.unbind( '.imagesLoaded' );
    }
  }

  // if no images, trigger immediately
  if ( !$images.length ) {
    doneLoading();
  } else {
    $images.bind( 'load.imagesLoaded error.imagesLoaded', function( event ){
      // trigger imgLoaded
      imgLoaded( event.target, event.type === 'error' );
    }).each( function( i, el ) {
      var src = el.src;

      // find out if this image has been already checked for status
      // if it was, and src has not changed, call imgLoaded on it
      var cached = $.data( el, 'imagesLoaded' );
      if ( cached && cached.src === src ) {
        imgLoaded( el, cached.isBroken );
        return;
      }

      // if complete is true and browser supports natural sizes, try
      // to check for image status manually
      if ( el.complete && el.naturalWidth !== undefined ) {
        imgLoaded( el, el.naturalWidth === 0 || el.naturalHeight === 0 );
        return;
      }

      // cached images don't fire load sometimes, so we reset src, but only when
      // dealing with IE, or image is complete (loaded) and failed manual check
      // webkit hack from http://groups.google.com/group/jquery-dev/browse_thread/thread/eee6ab7b2da50e1f
      if ( el.readyState || el.complete ) {
        el.src = BLANK;
        el.src = src;
      }
    });
  }

  return deferred ? deferred.promise( $this ) : $this;
};

var Grid = (function() {

  this.$grid = null;
  this.current = null;
  this.previewPos = null;
  this.scrollExtra = null;
  this.marginExpanded = null;
  this.$window = null;
  this.winsize = null;
  this.$body = null;
  this.transEndEventNames = null;
  this.transEndEventName = null;
  this.support = null;
  this.settings = null;
  this.$items = null;

  function init( config ) {

    // list of items
    this.$grid = $( '#og-grid' );
    // the items
    this.$items = this.$grid.children( 'li' );
    // current expanded item's index
    this.current = -1;
    // position (top) of the expanded item
    // used to know if the preview will expand in a different row
    this.previewPos = -1;
    // extra amount of pixels to scroll the window
    this.scrollExtra = 0;
    // extra margin when expanded (between preview overlay and the next items)
    this.marginExpanded = 10;
    this.$window = $( window );
    this.winsize;
    this.$body = $( 'html, body' );
    // transitionend events
    this.transEndEventNames = {
      'WebkitTransition' : 'webkitTransitionEnd',
      'MozTransition' : 'transitionend',
      'OTransition' : 'oTransitionEnd',
      'msTransition' : 'MSTransitionEnd',
      'transition' : 'transitionend'
    };
    this.transEndEventName = this.transEndEventNames[ Modernizr.prefixed( 'transition' ) ];
    // support for csstransitions
    this.support = Modernizr.csstransitions;
    // default settings
    this.settings = {
      minHeight : 500,
      speed : 350,
      easing : 'ease'
    };

    // the settings..
    //this.settings = $.extend( true, {}, settings, config );

    // preload all images
    this.$grid.imagesLoaded( function() {

      // save item´s size and offset
      saveItemInfo(this.$items, true );
      // get window´s size
      getWinSize.bind(this)();
      // initialize some events
      initEvents.bind(this)();

    }.bind(this) );

  }
  // add more items to the grid.
  // the new items need to appended to the grid.
  // after that call Grid.addItems(theItems);
  function addItems( $newitems ) {

    this.$items = this.$items.add( $newitems );

    $newitems.each( function() {
      var $item = $( this );
      $item.data( {
        offsetTop : $item.offset().top,
        height : $item.height()
      } );
    } );

    initItemsEvents.bind(this)( $newitems );

  }

  // saves the item´s offset top and height (if saveheight is true)
  function saveItemInfo($items, saveheight ) {
    $items.each( function() {
      var $item = $( this );
      $item.data( 'offsetTop', $item.offset().top );
      if( saveheight ) {
        $item.data( 'height', $item.height() );
      }
    } );
  }

  function initEvents() {

    // when clicking an item, show the preview with the item´s info and large image.
    // close the item if already expanded.
    // also close if clicking on the item´s cross
    initItemsEvents.bind(this)( this.$items );

    // on window resize get the window´s size again
    // reset some values..
    this.$window.on( 'debouncedresize', function() {

      this.scrollExtra = 0;
      this.previewPos = -1;
      // save item´s offset
      saveItemInfo();
      getWinSize();
      var preview = $.data( this, 'preview' );
      if( typeof preview != 'undefined' ) {
        hidePreview();
      }
    });
  }

  function initItemsEvents( $items ) {
    var self = this;
    $items.on( 'click', 'span.og-close', function() {
      hidePreview.bind(self)();
      return false;
    } ).children( 'a' ).on( 'click', function(e) {

      var $item = $( this ).parent();
      // check if item already opened
      self.current === $item.index() ? hidePreview.bind(self)() : showPreview.bind(self)( $item );
      return false;

    } );
  }
  function getWinSize() {
    this.winsize = { width : this.$window.width(), height : this.$window.height() };
  }

  function showPreview( $item ) {

    //var preview = $.data( this, 'preview' );
      // item´s offset top
    var position = $item.data( 'offsetTop' );

    this.scrollExtra = 0;

    // if a preview exists and previewPos is different (different row) from item´s top then close it
    if( typeof this.preview != 'undefined' ) {

      // not in the same row
      if( this.previewPos !== position ) {
        // if position > previewPos then we need to take te current preview´s height in consideration when scrolling the window
        if( position > this.previewPos ) {
          this.scrollExtra = this.preview.height;
        }
        hidePreview.bind(this)();
      }
      // same row
      else {
        this.preview.update( $item );
        return false;
      }
    }

    // update previewPos
    this.previewPos = position;
    var grid = this;
    // initialize new preview for the clicked item
    this.preview = new Preview(grid, $item );
    // expand preview overlay
    this.preview.open();

  }

  function hidePreview() {
    this.current = -1;
    //var preview = $.data( this, 'preview' );
    this.preview.close();
    //$.removeData( this, 'preview' );
  }

  // the preview obj / overlay
  function Preview( grid, $item ) {
    this.grid = grid;
    this.$item = $item;
    this.expandedIdx = this.$item.index();
    this.create();
    this.update();
  }

  Preview.prototype = {
    create : function() {
      // create Preview structure:
      this.$title = $( '<h3></h3>' );
      this.$description = $( '<p></p>' );
      this.$details = $( '<div class="og-details"></div>' ).append( this.$title, this.$description );
      this.$loading = $( '<div class="og-loading"></div>' );
      this.$fullimage = $( '<div class="og-fullimg"></div>' ).append( this.$loading );
      this.$closePreview = $( '<span class="og-close"></span>' );
      this.$previewInner = $( '<div class="og-expander-inner"></div>' ).append( this.$closePreview, this.$fullimage, this.$details );
      this.$previewEl = $( '<div class="og-expander"></div>' ).append( this.$previewInner );
      // append preview element to the item
      this.$item.append( this.getEl() );
      // set the transitions for the preview and the item
      if( this.grid.support ) {
        this.setTransition();
      }
    },
    update : function( $item ) {

      if( $item ) {
        this.$item = $item;
      }

      // if already expanded remove class "og-expanded" from current item and add it to new item
      if( this.grid.current !== -1 ) {
        var $currentItem = this.grid.$items.eq( this.grid.current );
        $currentItem.removeClass( 'og-expanded' );
        this.$item.addClass( 'og-expanded' );
        // position the preview correctly
        this.positionPreview();
      }

      // update current value
      this.grid.current = this.$item.index();

      // update preview´s content
      var $itemEl = this.$item.children( 'a' ),
        eldata = {
          href : $itemEl.attr( 'href' ),
          largesrc : $itemEl.data( 'largesrc' ),
          title : $itemEl.data( 'title' ),
          description : $itemEl.data( 'description' )
        };

      this.$title.html( eldata.title );
      this.$description.html( eldata.description );

      var self = this;

      // remove the current image in the preview
      if( typeof self.$largeImg != 'undefined' ) {
        self.$largeImg.remove();
      }

      // preload large image and add it to the preview
      // for smaller screens we don´t display the large image (the media query will hide the fullimage wrapper)
      if( self.$fullimage.is( ':visible' ) ) {
        this.$loading.show();
        $( '<img/>' ).load( function() {
          var $img = $( this );
          if( $img.attr( 'src' ) === self.$item.children('a').data( 'largesrc' ) ) {
            self.$loading.hide();
            self.$fullimage.find( 'img' ).remove();
            self.$largeImg = $img.fadeIn( 350 );
            self.$fullimage.append( self.$largeImg );
          }
        } ).attr( 'src', eldata.largesrc );
      }

    },
    open : function() {

      setTimeout( $.proxy( function() {
        // set the height for the preview and the item
        this.setHeights();
        // scroll to position the preview in the right place
        this.positionPreview();
      }, this ), 25 );

    },
    close : function() {

      var self = this,
        onEndFn = function() {
          if( self.grid.support ) {
            $( this ).off( self.grid.transEndEventName );
          }
          self.$item.removeClass( 'og-expanded' );
          self.$previewEl.remove();
        };

      setTimeout( $.proxy( function() {

        if( typeof this.$largeImg !== 'undefined' ) {
          this.$largeImg.fadeOut( 'fast' );
        }
        this.$previewEl.css( 'height', 0 );
        // the current expanded item (might be different from this.$item)
        var $expandedItem = this.grid.$items.eq( this.expandedIdx );
        if(parseInt(this.$item.css('height')) !== $expandedItem.data('height'))
          $expandedItem.css( 'height', $expandedItem.data( 'height' ) ).on( this.grid.transEndEventName, onEndFn );
        else 
          onEndFn();

        if( !this.grid.support ) {
          onEndFn.call();
        }

      }, this ), 25 );

      return false;

    },
    calcHeight : function() {

      var heightPreview = this.grid.winsize.height - this.$item.data( 'height' ) - this.grid.marginExpanded,
        itemHeight = this.grid.winsize.height;

      if( heightPreview < this.grid.settings.minHeight ) {
        heightPreview = this.grid.settings.minHeight;
        itemHeight = this.grid.settings.minHeight + this.$item.data( 'height' ) + this.grid.marginExpanded;
      }

      this.height = heightPreview;
      this.itemHeight = itemHeight;

    },
    setHeights : function() {

      var self = this,
        onEndFn = function() {
          if( self.grid.support ) {
            self.$item.off( self.grid.transEndEventName );
          }
          self.$item.addClass( 'og-expanded' );
        };

      this.calcHeight();
      this.$previewEl.css( 'height', this.height );
      this.$item.css( 'height', this.itemHeight ).on( this.grid.transEndEventName, onEndFn );

      if( !this.grid.support ) {
        onEndFn.call();
      }

    },
    positionPreview : function() {

      // scroll page
      // case 1 : preview height + item height fits in window´s height
      // case 2 : preview height + item height does not fit in window´s height and preview height is smaller than window´s height
      // case 3 : preview height + item height does not fit in window´s height and preview height is bigger than window´s height
      var position = this.$item.data( 'offsetTop' ),
        previewOffsetT = this.$previewEl.offset().top - this.grid.scrollExtra,
        scrollVal = this.height + this.$item.data( 'height' ) + this.grid.marginExpanded <= this.grid.winsize.height ? position : this.height < this.grid.winsize.height ? previewOffsetT - ( this.grid.winsize.height - this.height ) : previewOffsetT;

      this.grid.$body.animate( { scrollTop : scrollVal }, this.grid.settings.speed );

    },
    setTransition  : function() {
      this.$previewEl.css( 'transition', 'height ' + this.grid.settings.speed + 'ms ' + this.grid.settings.easing );
      this.$item.css( 'transition', 'height ' + this.grid.settings.speed + 'ms ' + this.grid.settings.easing );
    },
    getEl : function() {
      return this.$previewEl;
    }
  }

  return {
    init : init,
    addItems : addItems
  };
})();
