/*
 * Copyright (C) 2012-2016 InSeven Limited.
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

(function($) {

  App.TouchListener = function(element, delegate) {
    this.init(element, delegate);
  };
  
  jQuery.extend(App.TouchListener.prototype, {

    init: function (element, delegate) {
      var self = this;
      self.element = element;
      self.delegate = delegate;
      self.recognizers = [];

      // Used for tracking the current touch interaction.
      // We need to cache the touch position as we don't get valid coordinates in
      // touchend so we map them back to our previous touch to make it easier to
      // write more involved controls.
      self.touch = { x: 0, y: 0 };

      self.element.on('touchstart', function(e) {
        self.dispatchEvent(App.Control.Touch.START, e);
      });

      self.element.on('mousedown', function(e) {
        self.dispatchEvent(App.Control.Touch.START, e);
      });

      self.element.on('touchmove', function(e) {
        self.dispatchEvent(App.Control.Touch.MOVE, e);
      });

      self.element.on('mousemove', function(e) {
        self.dispatchEvent(App.Control.Touch.MOVE, e);
      });

      self.element.on('touchend', function(e) {
        self.onTouchEvent(App.Control.Touch.END, self.touch, e.timeStamp, e);
      });

      self.element.on('mouseup', function(e) {
        self.onTouchEvent(App.Control.Touch.END, self.touch, e.timeStamp, e);
      });

      self.element.on('touchcancel', function(e) {
        self.onTouchEvent(App.Control.Touch.END, self.touch, e.timeStamp, e);
      });
    },

    onTouchEvent: function(state, position, timestamp, event) {
      var self = this;
      for (var i=0; i<self.recognizers.length; i++) {
        var recognizer = self.recognizers[i];
        self.recognizers[i].onTouchEvent(state, position, timestamp, event);
      }
      self.delegate.onTouchEvent(state, position, timestamp, event);
    },

    dispatchEvent: function(state, event) {
      var self = this;
      var touchEvent = self.getEvent(event);
      if (touchEvent !== undefined) {
        self.touch = self.convert(touchEvent);
        self.onTouchEvent(state, self.touch, event.timeStamp, event);
      }
    },

    convert: function(event) {
      var self = this;
      var offset = self.element.offset();
      return { 'x': event.pageX - offset.left ,
               'y': event.pageY - offset.top };
    },

    // Queries the touch/mouse event looking for an a suitable event within the
    // target object.  Returns undefined if one cannot be found.
    getEvent: function(event) {
      var self = this;
      if (event.touches) {
        if (event.targetTouches && event.targetTouches.length > 0) {
          return event.targetTouches[0];
        }
      } else {
        return event;
      }
      return undefined;
    },

    addRecognizer: function(recognizer) {
      var self = this;
      self.recognizers.push(recognizer);
    }
    
  });

})(jQuery);
