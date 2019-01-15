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

  App.SoundMenu = function(willShow, didHide) {
    this.init(willShow, didHide);
  };
  
  jQuery.extend(
    App.SoundMenu.prototype, {
      
      init: function(willShow, didHide) {
        var self = this;
        self.onReset = undefined;
        self.onABStartSelect = undefined;
        self.willShow = willShow;
        self.didHide = didHide;
        self.screen = $('#screen-sound');
        self.element = $('#screen-sound-menu');
        self.cancel = new App.Controls.Button($('#screen-sound-menu-button-cancel'), { touchUpInside: function() {
          self.hide();
        }});
        self.enable = new App.Controls.Button($('#screen-sound-menu-button-enable-sound'), { touchUpInside: function() {
          if (self.enable !== undefined) {
            self.onEnable();
          }
          self.hide();
        }});
      },
      
      hide: function() {
        var self = this;
        self.element.addClass('hidden');
        self.screen.addClass('hidden');
        setTimeout(function() {
          self.element.css('display', 'none');
          self.screen.css('display', 'none');
          document.getElementsByTagName('body')[0].style.overflow = ''; // Allow scrolling.
          if (self.didHide !== undefined) {
            self.didHide();
          }
        }, 200);
      },
      
      show: function() {
        var self = this;
        if (self.willShow !== undefined) {
          self.willShow();
        }
        document.getElementsByTagName('body')[0].style.overflow = 'hidden'; // Prevent scrolling.
        self.screen.css('display', 'block');
        self.element.css('display', 'block');
        setTimeout(function() {
          self.screen.removeClass('hidden');
          self.element.removeClass('hidden');
        }, 0);
        
      }
      
  });

})(jQuery);
