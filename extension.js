/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
import GObject from "gi://GObject";
import Gio from "gi://Gio";

import * as Main from "resource:///org/gnome/shell/ui/main.js";

import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import {
  QuickToggle,
  SystemIndicator,
} from "resource:///org/gnome/shell/ui/quickSettings.js";

const WellbeingToggle = GObject.registerClass(
  class WellbeingToggle extends QuickToggle {
    constructor() {
      super({
        title: _("Wellbeing"),
        iconName: "org.gnome.Settings-wellbeing-symbolic",
        toggleMode: true,
      });
      this._settings = new Gio.Settings({
        schema: "org.gnome.desktop.break-reminders",
      });

      this._updateToggleState();

      // Connect to toggle change
      this.connect("clicked", this._onClicked.bind(this));

      // Listen for external changes to the setting
      this._settingsChangedId = this._settings.connect(
        "changed::selected-breaks",
        this._updateToggleState.bind(this),
      );
    }

    _updateToggleState() {
      // Get current value of enabled-reminders
      const enabledReminders = this._settings.get_strv("selected-breaks");

      // Check if both 'eyesight' and 'movement' are enabled
      const hasEyesight = enabledReminders.includes("eyesight");
      const hasMovement = enabledReminders.includes("movement");

      // Set toggle state to true only if both are enabled
      this.checked = hasEyesight && hasMovement;
    }

    _onClicked() {
      // When clicked, update the setting based on new toggle state
      if (this.checked) {
        // Enable both reminders
        this._settings.set_strv("selected-breaks", ["eyesight", "movement"]);
      } else {
        // Disable all reminders
        this._settings.set_strv("selected-breaks", []);
      }
    }

    destroy() {
      // Disconnect signal when destroying
      if (this._settingsChangedId) {
        this._settings.disconnect(this._settingsChangedId);
        this._settingsChangedId = 0;
      }
      super.destroy();
    }
  },
);

const WellbeingIndicator = GObject.registerClass(
  class WellbeingIndicator extends SystemIndicator {
    constructor() {
      super();

      this._indicator = this._addIndicator();
      this._indicator.iconName = "org.gnome.Settings-wellbeing-symbolic";

      const toggle = new WellbeingToggle();
      toggle.bind_property(
        "checked",
        this._indicator,
        "visible",
        GObject.BindingFlags.SYNC_CREATE,
      );
      this.quickSettingsItems.push(toggle);
    }
  },
);

export default class WellbeingToggleExtension extends Extension {
  enable() {
    this._indicator = new WellbeingIndicator();
    Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
  }

  disable() {
    this._indicator.quickSettingsItems.forEach((item) => item.destroy());
    this._indicator.destroy();
  }
}
