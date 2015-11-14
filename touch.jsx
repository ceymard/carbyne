'use strict';

// FIXME there is something happening where the active class gets
// added the first time the elements are clicked, but never removed.
// should investigate that.

/**
 * Click decorator for touch devices.
 * Almost all of the code was stolen from Angular's excellent ngTouch module.
 */

 var TAP_DURATION = 750; // Shorter than 750ms is a tap, longer is a taphold or drag.
 var MOVE_TOLERANCE = 12; // 12px seems to work in most mobile browsers.
 var PREVENT_DURATION = 2500; // 2.5 seconds maximum from preventGhostClick call to click
 var CLICKBUSTER_THRESHOLD = 25; // 25 pixels in any dimension is the limit for busting clicks.
 var ACTIVE_CLASS_NAME = 'active';

 //! $rootElement is an Angular service. In here, we shall just assume this is the body.
 var $rootElement = document.body;

// To allow :active links in CSS.
document.addEventListener("touchstart", function(){}, true);

 var lastPreventedTime;
 var touchCoordinates;
 var lastLabelClickCoordinates;

 // TAP EVENTS AND GHOST CLICKS
 //
 // Why tap events?
 // Mobile browsers detect a tap, then wait a moment (usually ~300ms) to see if you're
 // double-tapping, and then fire a click event.
 //
 // This delay sucks and makes mobile apps feel unresponsive.
 // So we detect touchstart, touchcancel and touchend ourselves and determine when
 // the user has tapped on something.
 //
 // What happens when the browser then generates a click event?
 // The browser, of course, also detects the tap and fires a click after a delay. This results in
 // tapping/clicking twice. We do "clickbusting" to prevent it.
 //
 // How does it work?
 // We attach global touchstart and click handlers, that run during the capture (early) phase.
 // So the sequence for a tap is:
 // - global touchstart: Sets an "allowable region" at the point touched.
 // - element's touchstart: Starts a touch
 // (- touchcancel ends the touch, no click follows)
 // - element's touchend: Determines if the tap is valid (didn't move too far away, didn't hold
 //   too long) and fires the user's tap handler. The touchend also calls preventGhostClick().
 // - preventGhostClick() removes the allowable region the global touchstart created.
 // - The browser generates a click event.
 // - The global click handler catches the click, and checks whether it was in an allowable region.
 //     - If preventGhostClick was called, the region will have been removed, the click is busted.
 //     - If the region is still there, the click proceeds normally. Therefore clicks on links and
 //       other elements without ngTap on them work normally.
 //
 // This is an ugly, terrible hack!
 // Yeah, tell me about it. The alternatives are using the slow click events, or making our users
 // deal with the ghost clicks, so I consider this the least of evils. Fortunately Angular
 // encapsulates this ugly logic away from the user.
 //
 // Why not just put click handlers on the element?
 // We do that too, just to be sure. If the tap event caused the DOM to change,
 // it is possible another element is now in that position. To take account for these possibly
 // distinct elements, the handlers are global and care only about coordinates.

 // Checks if the coordinates are close enough to be within the region.
 function hit(x1, y1, x2, y2) {
   return Math.abs(x1 - x2) < CLICKBUSTER_THRESHOLD && Math.abs(y1 - y2) < CLICKBUSTER_THRESHOLD;
 }

 // Checks a list of allowable regions against a click location.
 // Returns true if the click should be allowed.
 // Splices out the allowable region from the list after it has been used.
 function checkAllowableRegions(touchCoordinates, x, y) {
   for (var i = 0; i < touchCoordinates.length; i += 2) {
     if (hit(touchCoordinates[i], touchCoordinates[i + 1], x, y)) {
       touchCoordinates.splice(i, i + 2);
       return true; // allowable region
     }
   }
   return false; // No allowable region; bust it.
 }

 // Global click handler that prevents the click if it's in a bustable zone and preventGhostClick
 // was called recently.
 function onClick(event) {
   if (Date.now() - lastPreventedTime > PREVENT_DURATION) {
     return; // Too old.
   }

   var touches = event.touches && event.touches.length ? event.touches : [event];
   var x = touches[0].clientX;
   var y = touches[0].clientY;
   // Work around desktop Webkit quirk where clicking a label will fire two clicks (on the label
   // and on the input element). Depending on the exact browser, this second click we don't want
   // to bust has either (0,0), negative coordinates, or coordinates equal to triggering label
   // click event
   if (x < 1 && y < 1) {
     return; // offscreen
   }
   if (lastLabelClickCoordinates &&
       lastLabelClickCoordinates[0] === x && lastLabelClickCoordinates[1] === y) {
     return; // input click triggered by label click
   }
   // reset label click coordinates on first subsequent click
   if (lastLabelClickCoordinates) {
     lastLabelClickCoordinates = null;
   }
   // remember label click coordinates to prevent click busting of trigger click event on input
   // ! NOTE there was a call to _NodeName
   if (event.target.tagName.toLowerCase() === 'label') {
     lastLabelClickCoordinates = [x, y];
   }

   // Look for an allowable region containing this click.
   // If we find one, that means it was created by touchstart and not removed by
   // preventGhostClick, so we don't bust it.
   if (checkAllowableRegions(touchCoordinates, x, y)) {
     return;
   }

   // If we didn't find an allowable region, bust the click.
   event.stopPropagation();
   event.preventDefault();

   // Blur focused form elements
   event.target && event.target.blur && event.target.blur();
 }


 // Global touchstart handler that creates an allowable region for a click event.
 // This allowable region can be removed by preventGhostClick if we want to bust it.
 function onTouchStart(event) {
   var touches = event.touches && event.touches.length ? event.touches : [event];
   var x = touches[0].clientX;
   var y = touches[0].clientY;
   touchCoordinates.push(x, y);

   // was $timeout
   setTimeout(function() {
     // Remove the allowable region.
     for (var i = 0; i < touchCoordinates.length; i += 2) {
       if (touchCoordinates[i] == x && touchCoordinates[i + 1] == y) {
         touchCoordinates.splice(i, i + 2);
         return;
       }
     }
   }, PREVENT_DURATION);
 }

 // On the first call, attaches some event handlers. Then whenever it gets called, it creates a
 // zone around the touchstart where clicks will get busted.
 function preventGhostClick(x, y) {
   if (!touchCoordinates) {
     $rootElement.addEventListener('click', onClick, true);
     $rootElement.addEventListener('touchstart', onTouchStart, true);
     touchCoordinates = [];
   }

   lastPreventedTime = Date.now();

   checkAllowableRegions(touchCoordinates, x, y);
 }


// ngTouch.directive('ngClick', ['$parse', '$timeout', '$rootElement',
//     function($parse, $timeout, $rootElement) {

export function click(fn) {

  return function (node) {

    node.on('create', function () {

      // FIXME disabled
      var clickHandler = fn, //! was $parse attr.ngClick
          tapping = false,
          tapElement,  // Used to blur the element after a tap.
          startTime,   // Used to check if the tap was held too long.
          touchStartX,
          touchStartY,
          element = node.element;

      function resetState() {
        tapping = false;
        element.classList.remove(ACTIVE_CLASS_NAME);
      }

      element.addEventListener('touchstart', function(event) {
        tapping = true;
        tapElement = event.target ? event.target : event.srcElement; // IE uses srcElement.
        // Hack for Safari, which can target text nodes instead of containers.
        if (tapElement.nodeType == 3) {
          tapElement = tapElement.parentNode;
        }

        element.classList.add(ACTIVE_CLASS_NAME);

        startTime = Date.now();

        // Use jQuery originalEvent
        var originalEvent = event.originalEvent || event;
        var touches = originalEvent.touches && originalEvent.touches.length ? originalEvent.touches : [originalEvent];
        var e = touches[0];
        touchStartX = e.clientX;
        touchStartY = e.clientY;
      });

      element.addEventListener('touchcancel', function(event) {
        resetState();
      });

      element.addEventListener('touchend', function(event) {
        var diff = Date.now() - startTime;

        // Use jQuery originalEvent
        var originalEvent = event.originalEvent || event;
        var touches = (originalEvent.changedTouches && originalEvent.changedTouches.length) ?
            originalEvent.changedTouches :
            ((originalEvent.touches && originalEvent.touches.length) ? originalEvent.touches : [originalEvent]);
        var e = touches[0];
        var x = e.clientX;
        var y = e.clientY;
        var dist = Math.sqrt(Math.pow(x - touchStartX, 2) + Math.pow(y - touchStartY, 2));

        if (tapping && diff < TAP_DURATION && dist < MOVE_TOLERANCE) {
          // Call preventGhostClick so the clickbuster will catch the corresponding click.
          preventGhostClick(x, y);

          // Blur the focused element (the button, probably) before firing the callback.
          // This doesn't work perfectly on Android Chrome, but seems to work elsewhere.
          // I couldn't get anything to work reliably on Android Chrome.
          if (tapElement) {
            tapElement.blur();
          }

          //! fire the event. We might need to
          // if (!angular.isDefined(attr.disabled) || attr.disabled === false) {
            // FIXME triggerHandler is not implemented here, so we might have
            // to actually redefine it somewhere
            // element.triggerHandler('click', [event]);
            // NOTE maybe we could just call the function here ?
            fn.call(this, event);
          // }
        }

        resetState();
      });

      // Hack for iOS Safari's benefit. It goes searching for onclick handlers and is liable to click
      // something else nearby.
      element.onclick = function(event) { };

      // Actual click handler.
      // There are three different kinds of clicks, only two of which reach this point.
      // - On desktop browsers without touch events, their clicks will always come here.
      // - On mobile browsers, the simulated "fast" click will call this.
      // - But the browser's follow-up slow click will be "busted" before it reaches this handler.
      // Therefore it's safe to use this directive on both mobile and desktop.
      element.addEventListener('click', function(event) {
        fn.call(this, event);
      });

      element.addEventListener('mousedown', function(event) {
        element.classList.add(ACTIVE_CLASS_NAME);
      });

      element.addEventListener('mousemove mouseup', function(event) {
        element.classList.remove(ACTIVE_CLASS_NAME);
      });

    });

  }

}
