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

Gameboy = {};

Gameboy.Key = {
    START: 3,
    SELECT: 2,
    A: 0,
    B: 1,
    UP: 6,
    DOWN: 7,
    LEFT: 5,
    RIGHT: 4,
    R: 8,
    L: 9
};

var gbologger = new App.Logging(window.config.logging_level, "gbo");
var saveStateContext;
var saveState = {};

function cout(message, level) {
    var l = App.Logging.Level.INFO;
    if (level === 0) {
        l = App.Logging.Level.DEBUG;
    } else if (level === 1) {
        l = App.Logging.Level.INFO;
    } else if (level === 2) {
        l = App.Logging.Level.WARNING;
    } else {
        l = App.Logging.Level.ERROR;
    }
    gbologger.log(l, message);
}

function loadSaveStateContext(context) {

    saveStateContext = context;
    saveState = {};

    var deferred = new jQuery.Deferred();
    window.app.store.propertiesForDomain(saveStateContext, function (properties) {
        for (var key in properties) {
            if (properties.hasOwnProperty(key)) {
                saveState[key] = properties[key];
            }
        }

        deferred.resolve();
    });
    return deferred.promise();
}

function setValue(key, value) {

    // JSON-encode the RTC as this cannot be stored in its default form.
    if (key.substring(0, 4) === "RTC_") {
        value = JSON.stringify(value);
    }

    var previous = saveState[key];
    if (previous !== value) {
        saveState[key] = value;
        window.app.setValue(saveStateContext, key, value);
    }

}

function deleteValue(key) {
    delete saveState[key];
    window.app.deleteValue(saveStateContext, key);
}

function findValue(key) {

    var value = saveState[key];

    // JSON-decode the RTC.
    if (value !== undefined && key.substring(0, 4) === "RTC_") {
        value = JSON.parse(value);
    }

    return value;
}


function startWrapper(identifier, canvas, ROM) {
    var deferred = jQuery.Deferred();
    loadSaveStateContext("game-" + identifier).then(function () {
        try {
            downloadFile("gba_bios.bin", registerBIOS);
            var byteNumbers = new Array(ROM.length);
            for (var i = 0; i < ROM.length; i++) {
                byteNumbers[i] = ROM.charCodeAt(i);
            }
            var byteArray = new Uint8Array(byteNumbers);
//            var file = new Blob([byteArray], {type: 'application/octet-stream'});
            attachROM(byteArray);
            deferred.resolve();
        } catch (e) {
            deferred.reject(e);
        }
    });
    return deferred.promise();
}

(function ($) {

    App.GameBoy = function (store, library) {
        this.init(store, library);
    };

    App.GameBoy.Settings = {
        ENABLE_SOUND: 0, // (defaults to true)
        ENABLE_GBC_BIOS: 1, // Boot with boot rom first (defaults to true)
        DISABLE_COLORS: 2, // Priority to game boy mode (defaults to false)
        VOLUME_LEVEL: 3, // Volume (defaults to 1)
        ENABLE_COLORIZATION: 4, // Colorize the game boy mode (defaults to true)
        TYPED_ARRAYS_DISALLOW: 5, // Disallow typed arrays (defaults to false)
        EMULATOR_LOOP_INTERVAL: 6, // Interval for the emulator loop (defaults to 4)
        AUDIO_BUFFER_MIN_SPAN: 7, // (defaults to 15)
        AUDIO_BUFFER_MAX_SPAN: 8, // (defaults to 30)
        ROM_ONLY_OVERRIDE: 9, // Override to allow for MBC1 instead of ROM only (defaults to false)
        MBC_ENABLE_OVERRIDE: 10, // Override MBC RAM disabling and always allow reading and writing to the banks (defaults to false)
        GB_BOOT_ROM_UTILIZED: 11, // Use the GameBoy boot ROM instead of the GameBoy Color boot ROM (defaults to false)
        SOFTWARE_RESIZING: 12, // Scale the canvas in JS, or let the browser scale the canvas (defaults to false)
        RESIZE_SMOOTHING: 13 // Use image smoothing based scaling (defaults to true)
    };

    App.GameBoy.State = {
        IDLE: 0,
        LOADING: 1,
        RUNNING: 2,
        ERROR: 3
    };

    jQuery.extend(App.GameBoy.prototype, {

        init: function (store, library) {
            var self = this;
            self.store = store;
            self.library = library;
            self.state = App.GameBoy.State.IDLE;
            self.stateChangeCallbacks = [];
            self.logging = new App.Logging(window.config.logging_level, "gameboy");
            self.speed = 1;

            settings[App.GameBoy.Settings.ENABLE_SOUND] = true;
            settings[App.GameBoy.Settings.ENABLE_COLORIZATION] = false;
            settings[App.GameBoy.Settings.SOFTWARE_RESIZING] = false;
            settings[App.GameBoy.Settings.RESIZE_SMOOTHING] = false;
            settings[App.GameBoy.Settings.EMULATOR_LOOP_INTERVAL] = 12;

        },

        setSoundEnabled: function (enabled) {
//            alert(enabled);
            var self = this;
            if (enabled === true) {
                if (!Mixer) {
                    registerAudioHandler();
                }
                settings[App.GameBoy.Settings.ENABLE_SOUND] = true;
                if (Iodine) {
                    Iodine.enableAudio();
                }
            } else {
                settings[App.GameBoy.Settings.ENABLE_SOUND] = false;
                if (Iodine) {
                    Iodine.disableAudio();
                }
            }
        },

        setSpeed: function (speed) {
            var self = this;
            self.speed = speed;
            if (Iodine) {
                Iodine.setSpeed(speed);
            }
        },

        onStateChange: function (callback) {
            var self = this;
            self.stateChangeCallbacks.push(callback);
        },

        setState: function (state) {
            var self = this;
            if (self.state !== state) {
                self.state = state;

                // Fire the state change callbacks.
                for (var i = 0; i < self.stateChangeCallbacks.length; i++) {
                    var callback = self.stateChangeCallbacks[i];
                    callback(state);
                }
            }
        },

        pause: function () {
            var self = this;
            if (Iodine) {
                Iodine.pause();
            }
        },

        run: function () {
            var self = this;
            // Do not attempt to run unless we have been in the running state.
            if (self.state === App.GameBoy.State.RUNNING) {
                if (Iodine) {
                    Iodine.play();
                }
            }
        },

        keyDown: function (keycode) {
            var self = this;
            if (Iodine) {
                Iodine.keyDown(keycode);
            }
        },

        keyUp: function (keycode) {
            var self = this;
            if (Iodine) {
                Iodine.keyUp(keycode);
            }
        },

        clear: function () {
            var self = this;
//      clearLastEmulation();

            self.data = undefined;
            self.setState(App.GameBoy.State.IDLE);
        },

        reset: function () {
            var self = this;
            return self._insertCartridge(self.identifier, self.data);
        },

        save: function () {
        },

        load: function (identifier) {
            var self = this;
            var deferred = $.Deferred();

            var resetStateAndReject = function (e) {
                self.logging.warning("Unable to load game");
                self.setState(App.GameBoy.State.IDLE);
                deferred.reject(e);
            };

            self.library.fetch(identifier).then(function (data) {
                self._insertCartridge(identifier, data).then(function () {
                    deferred.resolve();
                }).fail(resetStateAndReject);
            }).fail(resetStateAndReject);

            return deferred.promise();
        },

        _insertCartridge: function (identifier, data) {
            var self = this;
            var deferred = $.Deferred();
            self.identifier = identifier;
            self.data = data;
            startWrapper(identifier, document.getElementById("LCD"), data).then(function () {
                setTimeout(function () {
                    self.setState(App.GameBoy.State.RUNNING);
                    deferred.resolve();
                }, 100);
            }).fail(function (e) {
                deferred.reject(e);
            });
            return deferred.promise();
        }

    });

})(jQuery);
