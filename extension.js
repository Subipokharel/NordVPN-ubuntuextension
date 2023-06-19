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
/* exported init */
const { Gtk, Clutter, Gio, St, GObject, GLib } = imports.gi;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

let myPopup;
const nordVPN = Gio.icon_new_for_string(Me.path + '/icons/' + "nordvpn.svg");;
const vpnON = "network-vpn-symbolic.svg";
const vpnOFF = "network-vpn-disconnected-symbolic.svg";
const vpnUnknown = "network-vpn-no-route-symbolic.svg"
const vpnConnected = "livepatch_on.svg";
const vpnDisconnected = "livepatch_warning.svg";
const countryicon = "earth-icon.svg";
const cityicon = "city-buildings.svg";

const vpnPosition = {
    CENTER: 0,
    RIGHT: 1,
    LEFT: 2
};
class NordVPN {
    constructor() {
        this._commands = {
            connect: ['nordvpn', 'c'],
            disconnect: ['nordvpn', 'd'],
            status: ['nordvpn', 'status'],
            listcountries: ['nordvpn', 'countries'],
            switchcountry: function (nameOfcountry) {
                return ['nordvpn', 'c', nameOfcountry];
            },
            listcities: function (nameOfcountry) {
                return ['nordvpn', 'cities', nameOfcountry];
            },
            switchcity: function (nameOfcountry, nameOfcity) {
                return ['nordvpn', 'c', nameOfcountry, nameOfcity];
            },
            vpnsettings: ['nordvpn', 'settings'],
            autoconnect: function (setStatus) {
                return ['nordvpn', 'set', 'autoconnect', setStatus];
            },
            ipv6: function (setStatus) {
                return ['nordvpn', 'set', 'ipv6', setStatus];
            },
            threatprotectionlite: function (setStatus) {
                return ['nordvpn', 'set', 'threatProtectionlite', setStatus];
            },
            killswitch: function (setStatus) {
                return ['nordvpn', 'set', 'killswitch', setStatus];
            },
            notify: function (setStatus) {
                return ['nordvpn', 'set', 'notify', setStatus];
            }
        }
    }

    // Run command to connect to VPN
    async _vpnConnect() {
        try {
            Main.notify("Connecting to VPN...");
            await this._execCommand(this._commands.connect).catch((err) => { log(err) });
        } catch (err) {
            log(err);
        }
    }

    // Run command to disconnect from VPN
    async _vpnDisconnect() {
        try {
            Main.notify("Disconnecting VPN...");
            await this._execCommand(this._commands.disconnect).catch((err) => { log(err) });
        } catch (err) {
            log(err);
        }
    }

    // Run command to check VPN connection status
    async getvpnstatus(input = null, cancellable = null) {
        try {
            let fullStatus,
                newval = {},
                cancelId = 0;
            let flags = (Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
            let proc = new Gio.Subprocess({
                argv: this._commands.status,
                flags: flags
            });

            proc.init(cancellable);
            if (cancellable instanceof Gio.Cancellable) {
                cancelId = cancellable.connect(() => proc.force_exit());
            }
            // Return promise result of vpn status
            return new Promise((resolve, reject) => {
                proc.communicate_utf8_async(input, null, (proc, res) => {
                    try {
                        let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                        let status = proc.get_exit_status();
                        if (status !== 0) {
                            throw new Gio.IOErrorEnum({
                                code: Gio.io_error_from_errno(status),
                                message: stderr ? stderr.trim() : GLib.strerror(status)
                            });
                        }
                        if (stdout instanceof Uint8Array) { fullStatus = imports.byteArray.toString(stdout).trim(); }
                        else { fullStatus = stdout.toString().trim(); }
                        fullStatus = fullStatus.slice(fullStatus.indexOf("Status:"), fullStatus.length).trim();
                        const result = fullStatus.split('\n');
                        // Call function to return dictionary from command
                        result.forEach(x => {
                            let item = x.split(": ");
                            newval[item[0]] = item[1].toLowerCase();
                        });
                        resolve(newval);
                    } catch (e) {
                        reject(e);
                    } finally {
                        if (cancelId > 0) {
                            cancellable.disconnect(cancelId);
                        }
                    }
                });
            });
        } catch (err) {
            log(err);
        }
    }

    // Execute command
    async _execCommand(argv, input = null, cancellable = null) {
        try {
            let fullStatus,
                cancelId = 0;
            let flags = (Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
            let proc = new Gio.Subprocess({
                argv: argv,
                flags: flags
            });

            proc.init(cancellable);
            if (cancellable instanceof Gio.Cancellable) {
                cancelId = cancellable.connect(() => proc.force_exit());
            }
            // Return promise result of vpn status
            return new Promise((resolve, reject) => {
                proc.communicate_utf8_async(input, null, (proc, res) => {
                    try {
                        let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                        let status = proc.get_exit_status();
                        if (status !== 0) {
                            throw new Gio.IOErrorEnum({
                                code: Gio.io_error_from_errno(status),
                                message: stderr ? stderr.trim() : GLib.strerror(status)
                            });
                        }
                        if (stdout instanceof Uint8Array) {
                            fullStatus = imports.byteArray.toString(stdout).trim();
                        } else {
                            fullStatus = stdout.toString().trim();
                        }
                        resolve(fullStatus);
                    } catch (err) {
                        reject(err);
                    } finally {
                        if (cancelId > 0) {
                            cancellable.disconnect(cancelId);
                        }
                    }
                });
            });
        } catch (err) {
            log(err);
        }
    }

    // Run command to list and return a list of countries
    async listvpncountries() {
        try {
            let countriesToreturn = await this._execCommand(this._commands.listcountries).catch((err) => { log(err) });
            return countriesToreturn;
        } catch (err) {
            log(err);
        }
    }

    // Run command to change country
    async changeVPNcountry(countryname) {
        try {
            var value = await this.getvpnstatus().catch((err) => { log(err) });
            // Check if VPN is already connected to user selected country
            if (value["Country"].toLowerCase().replace(/ /g, "_") === countryname.toLowerCase()) {
                Main.notify(`"VPN already in ${countryname}"`);
            } else {
                Main.notify(`"Changing NordVPN country to ${countryname}..."`);
                await this._execCommand(this._commands.switchcountry(countryname)).catch((err) => { log(err) });
            }
        } catch (err) {
            log(err);
        }
    }

    // Run command to list and return a list of cities
    async listvpncities(countryname) {
        try {
            let citiesToreturn = await this._execCommand(this._commands.listcities(countryname)).catch((err) => { log(err) });
            return citiesToreturn;
        } catch (err) {
            log(err);
        }
    }

    // Run command to change city
    async changeVPNcity(countryname, cityname) {
        try {
            var value = await this.getvpnstatus().catch((err) => { log(err) });
            // Check if VPN is already connected to user selected country
            if (value["City"].toLowerCase().replace(/ /g, "_") === cityname.toLowerCase()) {
                Main.notify(`"VPN already in ${cityname}"`);
            } else {
                Main.notify(`"Changing NordVPN in ${countryname} to ${cityname}..."`);
                await this._execCommand(this._commands.switchcity(countryname, cityname)).catch((err) => { log(err) });
            }
        } catch (err) {
            log(err);
        }
    }

    // Run command to get current VPN settings
    async getvpnSettingsDict() {
        try {
            let newval = {};
            let settings = await this._execCommand(this._commands.vpnsettings);
            settings = settings.slice(settings.indexOf(settings[settings.search(/[A-Z]/)]), settings.length);
            const result = settings.split('\n');
            result.forEach(x => {
                let item = x.split(": ");
                newval[item[0]] = item[1].toLowerCase();
            });
            return newval;
        } catch (err) {
            log(err);
        }
    }
}

const MyPopup = GObject.registerClass(
    class MyPopup extends PanelMenu.Button {
        _init() {
            //Initialize
            // super._init(0);
            super._init(0, 'MyPopup', false);
            this._settings = ExtensionUtils.getSettings("org.gnome.shell.extensions.subinordvpn");

            this._refreshTimeoutId = null;
            this.NordVPNhandler = new NordVPN();
            this.vpnTogglestatus = false;
            this.autoConnectstatus = false;
            this.ipv6status = false;
            this.threatProtectionstatus = false;
            this.killSwitchstatus = false;
            this.notifystatus = false;
            this.vpnStatus = "";
            this.countrylist = [];
            this.connectedcountrylist = [];
            this.citylist = [];
            this.connectedcitylist = [];

            // Menu Icon
            this._icon = new St.Icon({
                icon_name: vpnUnknown,
                style_class: 'system-status-icon'
            });
            this.add_child(this._icon);

            //Add VPN Toggle switch
            this.menuItem = new PopupMenu.PopupImageMenuItem('NordVPN', nordVPN, {
                reactive: false,
                style_class: 'menuitemstyle'
            });
            this.vpnToggle = new PopupMenu.PopupSwitchMenuItem("", this.vpnTogglestatus, {});
            this.vpnToggle.connect('toggled', this._toggleVPNconnection.bind(this));
            this.vpnToggle.insert_child_below(this.menuItem, null);
            this.menu.addMenuItem(this.vpnToggle);

            // Add a VPN Status separator
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem("VPN Status"));

            // Add a VPN Status submenu
            this._vpninfo = new PopupMenu.PopupSubMenuMenuItem(this.vpnStatus, { reactive: true });
            this.menu.addMenuItem(this._vpninfo);
            // Add Submenu
            this.ip = new PopupMenu.PopupMenuItem("IP : ");
            this.servername = new PopupMenu.PopupMenuItem("HostName : ");
            this.country = new PopupMenu.PopupMenuItem("Country : ");
            this.city = new PopupMenu.PopupMenuItem("City : ");
            this._vpninfo.menu.addMenuItem(this.ip);
            this._vpninfo.menu.addMenuItem(this.servername);
            this._vpninfo.menu.addMenuItem(this.country);
            this._vpninfo.menu.addMenuItem(this.city);

            // Add shell for countries in PanelMenu
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem("Change VPN Settings"));
            this.countrySection = new PopupMenu.PopupSubMenuMenuItem("Country", { reactive: true });
            this.menu.addMenuItem(this.countrySection);
            this.countrySection.icon.gicon = Gio.icon_new_for_string(Me.path + '/icons/' + countryicon);
            this.countrySection.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem("Connected Country"));
            // Section Connected Country
            this.connectedcountryname = new PopupMenu.PopupMenuSection("Connected City");
            this.countrySection.menu.addMenuItem(this.connectedcountryname);
            this.countrySection.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem("Change Country"));
            // Section Change City
            this.countryname = new PopupMenu.PopupMenuSection("All Countries");
            this.countrySection.menu.addMenuItem(this.countryname);

            // Add shell for cities in PanelMenu
            this.citySection = new PopupMenu.PopupSubMenuMenuItem("City", { reactive: true });
            this.menu.addMenuItem(this.citySection);
            this.citySection.icon.gicon = Gio.icon_new_for_string(Me.path + '/icons/' + cityicon);
            this.citySection.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem("Connected City"));
            // Section Connected City
            this.connectedcityname = new PopupMenu.PopupMenuSection("Connected City");
            this.citySection.menu.addMenuItem(this.connectedcityname);
            this.citySection.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem("Change City"));
            // Section Change City
            this.cityname = new PopupMenu.PopupMenuSection("All Cities");
            this.citySection.menu.addMenuItem(this.cityname);

            // Add Countries to dropdown
            this.getCountriesList();
            // Add Cities to dropdown
            this.getCitiesList();

            // Additional settings
            this.additionalSettings = new PopupMenu.PopupSubMenuMenuItem("Settings", { reactive: true });
            this.menu.addMenuItem(this.additionalSettings);
            this.additionalSettings.icon.icon_name = "settings-app-symbolic";
            this.additionalSettings.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem("Toggle Settings"));
            this.autoConnect = new PopupMenu.PopupSwitchMenuItem("Auto-Connect", this.autoConnectstatus, {});
            this.autoConnect.connect('toggled', this._toggleAutoconnect.bind(this));
            this.additionalSettings.menu.addMenuItem(this.autoConnect);
            this.ipv6 = new PopupMenu.PopupSwitchMenuItem("IPv6", this.ipv6status, {});
            this.ipv6.connect('toggled', this._toggleIPv6.bind(this));
            this.additionalSettings.menu.addMenuItem(this.ipv6);
            this.threatProtection = new PopupMenu.PopupSwitchMenuItem("Threat Protection", this.threatProtectionstatus, {});
            this.threatProtection.connect('toggled', this._toggleThreatPrt.bind(this));
            this.additionalSettings.menu.addMenuItem(this.threatProtection);
            this.killSwitch = new PopupMenu.PopupSwitchMenuItem("Kill Switch", this.killSwitchstatus, {});
            this.killSwitch.connect('toggled', this._togglekillSwitch.bind(this));
            this.additionalSettings.menu.addMenuItem(this.killSwitch);
            this.notify = new PopupMenu.PopupSwitchMenuItem("Notify", this.notifystatus, {});
            this.notify.connect('toggled', this._toggleNotify.bind(this));
            this.additionalSettings.menu.addMenuItem(this.notify);

            // Update VPN panel
            this._update();
            // Updates the Panel status after an interval
            this._initializeTimer();
            // Open and close menu
            this.menu.connect('open-state-changed', this._menuopen.bind(this));
        }

        // Destroy old timer and start new
        _updateTimeChanged() {
            this._destroyTimer();
            this._initializeTimer();
        }

        // Deletes and reinitializes the timer
        _destroyTimer() {
            if (this._refreshTimeoutId != null) {
                Mainloop.source_remove(this._refreshTimeoutId);
                this._refreshTimeoutId = null;
            }
        }

        // Updates the Panel status after an interval
        _initializeTimer() {
            let update_time = this._settings.get_int('interval-time');
            this._refreshTimeoutId = Mainloop.timeout_add_seconds(update_time, (self) => {
                this._update();
                return true;
            });
        }

        // VPN toggle ON or OFF
        async _toggleVPNconnection(widget, value) {
            if (value) { this.NordVPNhandler._vpnConnect(); }
            else { this.NordVPNhandler._vpnDisconnect(); }

            await this._update().catch((err) => { log(err) });
            return Clutter.EVENT_PROPAGATE;
        }

        // VPN toggle Autoconnect
        async _toggleAutoconnect(widget, value) {
            if (value) {
                await this.NordVPNhandler._execCommand(this.NordVPNhandler._commands.autoconnect("enable")).catch((err) => { log(err) });
            } else {
                await this.NordVPNhandler._execCommand(this.NordVPNhandler._commands.autoconnect("disable")).catch((err) => { log(err) });
            }
            return Clutter.EVENT_PROPAGATE;
        }

        // VPN toggle IPv6
        async _toggleIPv6(widget, value) {
            if (value) {
                await this.NordVPNhandler._execCommand(this.NordVPNhandler._commands.ipv6("enable")).catch((err) => { log(err) });
            } else {
                await this.NordVPNhandler._execCommand(this.NordVPNhandler._commands.ipv6("disable")).catch((err) => { log(err) });
            }
            return Clutter.EVENT_PROPAGATE;
        }

        // VPN toggle Threat Protection
        async _toggleThreatPrt(widget, value) {
            if (value) {
                await this.NordVPNhandler._execCommand(this.NordVPNhandler._commands.threatprotectionlite("enable")).catch((err) => { log(err) });
            } else {
                await this.NordVPNhandler._execCommand(this.NordVPNhandler._commands.threatprotectionlite("disable")).catch((err) => { log(err) });
            }
            return Clutter.EVENT_PROPAGATE;
        }

        // VPN toggle Kill Switch
        async _togglekillSwitch(widget, value) {
            if (value) {
                await this.NordVPNhandler._execCommand(this.NordVPNhandler._commands.killswitch("enable")).catch((err) => { log(err) });
            } else {
                await this.NordVPNhandler._execCommand(this.NordVPNhandler._commands.killswitch("disable")).catch((err) => { log(err) });
            }
            return Clutter.EVENT_PROPAGATE;
        }

        // VPN toggle Notification
        async _toggleNotify(widget, value) {
            if (value) {
                await this.NordVPNhandler._execCommand(this.NordVPNhandler._commands.notify("enable")).catch((err) => { log(err) });
            } else {
                await this.NordVPNhandler._execCommand(this.NordVPNhandler._commands.notify("disable")).catch((err) => { log(err) });
            }
            return Clutter.EVENT_PROPAGATE;
        }

        // Updates the VPN settings toggle status based on the settings
        async updatevpnSettings() {
            try {
                let settings = await this.NordVPNhandler.getvpnSettingsDict().catch((err) => { log(err) });
                // Toggle for Auto Connect status
                if (settings['Auto-connect'] == "enabled") { this.autoConnect.setToggleState(true); }
                else { this.autoConnect.setToggleState(false); }
                // Toggle for IPv6 status
                if (settings['IPv6'] == "enabled") { this.ipv6.setToggleState(true); }
                else { this.ipv6.setToggleState(false); }
                // Toggle for Threat Protection status
                if (settings['Threat Protection Lite'] == "enabled") { this.threatProtection.setToggleState(true); }
                else { this.threatProtection.setToggleState(false); }
                // Toggle for Kill Switch status
                if (settings['Kill Switch'] == "enabled") { this.killSwitch.setToggleState(true); }
                else { this.killSwitch.setToggleState(false); }
                // Toggle for Notify Switch status
                if (settings['Notify'] == "enabled") { this.notify.setToggleState(true); }
                else { this.notify.setToggleState(false); }
            } catch (err) {
                log(err);
            }
        }

        // Retrieves VPN status and returns it
        async getVPNstatusDict() {
            var dict = await this.NordVPNhandler.getvpnstatus().catch((err) => {
                log(err)
            });
            return dict;
        }

        // Returns list of countries and adds on click action to switch countries when Clicked on
        async getCountriesList() {
            try {
                var value = await this.getVPNstatusDict();
                let listValue = await this.NordVPNhandler.listvpncountries();
                listValue = listValue.slice(listValue.indexOf(listValue[listValue.search(/[A-Z]/)]), listValue.length);
                const result = listValue.split(',');
                result.forEach((country) => {
                    let singleCountry = country.trim();
                    let returnedCountry = value["Country"].toLowerCase().replace(/ /g, "_");
                    if (returnedCountry === singleCountry.toLowerCase()) {
                        this.connectedcountrylist.push(
                            this.connectedcountryname.addAction(singleCountry, () => this.NordVPNhandler.changeVPNcountry(singleCountry))
                        );
                    }
                    else {
                        this.countrylist.push(
                            this.countryname.addAction(singleCountry, () => this.NordVPNhandler.changeVPNcountry(singleCountry))
                        );
                    }
                });
            } catch (err) {
                log(err);
            }
        }

        // Returns list of cities and adds on click action to switch cities when Clicked on
        async getCitiesList() {
            try {
                var value = await this.getVPNstatusDict();
                let listValue = await this.NordVPNhandler.listvpncities(value["Country"].toLowerCase().replace(/ /g, "_"));
                listValue = listValue.slice(listValue.indexOf(listValue[listValue.search(/[A-Z]/)]), listValue.length);
                const result = listValue.split(',');
                result.forEach((city) => {
                    let singleCity = city.trim(" ");
                    let returnedCity = value["City"].toLowerCase().replace(/ /g, "_");
                    if (returnedCity === singleCity.toLowerCase()) {
                        this.connectedcitylist.push(
                            this.connectedcityname.addAction(singleCity, () => this.NordVPNhandler.changeVPNcity(value["Country"].toLowerCase().replace(/ /g, "_"), singleCity))
                        );
                    }
                    else {
                        this.citylist.push(
                            this.cityname.addAction(singleCity, () => this.NordVPNhandler.changeVPNcity(value["Country"].toLowerCase().replace(/ /g, "_"), singleCity))
                        );
                    }
                });
            } catch (err) {
                log(err);
            }
        }

        // Add label for connected country
        async addLabelActiveCountry(value) {
            try {
                this.countrylist = [];
                this.connectedcountrylist = [];
                let listValue = await this.NordVPNhandler.listvpncountries();
                listValue = listValue.slice(listValue.indexOf(listValue[listValue.search(/[A-Z]/)]), listValue.length);
                const result = listValue.split(',');
                result.forEach((country) => {
                    let singleCountry = country.trim();
                    let returnedCountry = value["Country"].toLowerCase().replace(/ /g, "_");
                    let icon = Gio.icon_new_for_string(Me.path + '/icons/country/' + singleCountry.toLowerCase() + ".svg");
                    if (returnedCountry === singleCountry.toLowerCase()) {
                        this.connectedcountrylist.push(
                            this.connectedcountryname.addAction(singleCountry, () => this.NordVPNhandler.changeVPNcountry(singleCountry), icon)
                        );
                    } else {
                        this.countrylist.push(
                            this.countryname.addAction(singleCountry, () => this.NordVPNhandler.changeVPNcountry(singleCountry), icon)
                        );
                    }
                });
                // Re-add label to the updated Country list
                this.connectedcountrylist.forEach((item) => {
                    if (item.label.text.toLowerCase().replace(/ /g, "_") === value["Country"].toLowerCase().replace(/ /g, "_")) {
                        item.setOrnament(PopupMenu.Ornament.CHECK);
                    } else {
                        item.setOrnament(PopupMenu.Ornament.NONE);
                    }
                });
            } catch (err) {
                log(err);
            }
        }

        // Get city list and add label for connected city
        async addLabelActiveCity(value) {
            try {
                this.citylist = [];
                this.connectedcitylist = [];
                // Add updated value of city in the new list
                let listValue = await this.NordVPNhandler.listvpncities(value["Country"].toLowerCase().replace(/ /g, "_"));
                listValue = listValue.slice(listValue.indexOf(listValue[listValue.search(/[A-Z]/)]), listValue.length);
                const result = listValue.split(',');
                result.forEach((city) => {
                    let singleCity = city.trim(" ");
                    let returnedCity = value["City"].toLowerCase().replace(/ /g, "_");
                    if (returnedCity === singleCity.toLowerCase()) {
                        this.connectedcitylist.push(
                            this.connectedcityname.addAction(singleCity, () => this.NordVPNhandler.changeVPNcity(value["Country"].toLowerCase().replace(/ /g, "_"), singleCity))
                        );
                    } else {
                        this.citylist.push(
                            this.cityname.addAction(singleCity, () => this.NordVPNhandler.changeVPNcity(value["Country"].toLowerCase().replace(/ /g, "_"), singleCity))
                        );
                    }
                });
                // Re-add label to the updated cities list
                this.connectedcitylist.forEach((item) => {
                    if (item.label.text.toLowerCase().replace(/ /g, "_") === value["City"].toLowerCase().replace(/ /g, "_")) {
                        item.setOrnament(PopupMenu.Ornament.CHECK);
                    } else {
                        item.setOrnament(PopupMenu.Ornament.NONE);
                    }
                });
            } catch (err) {
                log(err);
            }
        }

        // When the VPN panel is clicked updates the values
        async _menuopen(menu, open) {
            try {
                if (open) {
                    await this._update().catch((err) => { log(err) });
                }
            } catch (err) {
                log(err);
            }
        }

        // Retrieves VPN status and updates values as necessary
        async _update() {
            try {
                var value = await this.getVPNstatusDict().catch((err) => { log(err) });
                await this.updatevpnSettings().catch((err) => { log(err) });
                // Destroy old timer and start new
                this._updateTimeChanged();
                if (value["Status"] === "connected") {
                    this.vpnToggle.setToggleState(true);
                    this._icon.icon_name = vpnON;
                    this._vpninfo.label.text = "Status   : " + value["Status"][0].toUpperCase() + value["Status"].substring(1);
                    this._vpninfo.icon.gicon = Gio.icon_new_for_string(Me.path + '/icons/' + vpnConnected);     // this._vpninfo.icon.icon_name = vpnConnected;
                    this.ip.label.text = "IP : " + value["IP"]; this.ip.show();
                    this.servername.label.text = "HostName : " + value["Hostname"]; this.servername.show();
                    this.country.label.text = "Country : " + value["Country"][0].toUpperCase() + value["Country"].substring(1); this.country.show();
                    this.city.label.text = "City : " + value["City"][0].toUpperCase() + value["City"].substring(1); this.city.show();

                    // Show countries and city menu
                    this.countrySection.show();
                    this.citySection.show();

                    // Removes all values in the CountryName, ConnectedCountryName, CityName and ConnectedCityName PopupMenuSection
                    this.countryname.removeAll();
                    this.connectedcountryname.removeAll();
                    this.cityname.removeAll();
                    this.connectedcityname.removeAll();
                    // Add label for connected country and connected city
                    await this.addLabelActiveCountry(value).catch((err) => { log(err) });
                    await this.addLabelActiveCity(value).catch((err) => { log(err) });
                }
                else if (value["Status"] === "disconnected") {
                    this.vpnToggle.setToggleState(false);
                    this._icon.icon_name = vpnOFF;
                    this._vpninfo.label.text = "Status   : " + value["Status"][0].toUpperCase() + value["Status"].substring(1);
                    this._vpninfo.icon.gicon = Gio.icon_new_for_string(Me.path + '/icons/' + vpnDisconnected);  // this._vpninfo.icon.icon_name = vpnDisconnected;
                    this.ip.label.text = ""; this.ip.hide();
                    this.servername.label.text = ""; this.servername.hide();
                    this.country.label.text = ""; this.country.hide();
                    this.city.label.text = ""; this.city.hide();

                    // Hide countries and city
                    this.countrySection.hide();
                    this.citySection.hide();
                    // Removes all values in the CountryName, ConnectedCountryName, CityName and ConnectedCityName PopupMenuSection
                    this.countryname.removeAll();
                    this.connectedcountryname.removeAll();
                    this.cityname.removeAll();
                    this.connectedcityname.removeAll();
                }
                else {
                    this.vpnToggle.setToggleState(false);
                    this._icon.icon_name = vpnUnknown;
                    this._vpninfo.label.text = "Status   : " + "Error";
                    this._vpninfo.icon.gicon = Gio.icon_new_for_string(Me.path + '/icons/' + vpnDisconnected);  // this._vpninfo.icon.icon_name = vpnDisconnected;
                    this.ip.label.text = ""; this.ip.hide();
                    this.servername.label.text = ""; this.servername.hide();
                    this.country.label.text = ""; this.country.hide();
                    this.city.label.text = ""; this.city.hide();

                    // Hide countries and city
                    this.countrySection.hide();
                    this.citySection.hide();
                    // Removes all values in the CountryName, ConnectedCountryName, CityName and ConnectedCityName PopupMenuSection
                    this.countryname.removeAll();
                    this.connectedcountryname.removeAll();
                    this.cityname.removeAll();
                    this.connectedcityname.removeAll();
                }
            }
            catch (e) {
                this.vpnToggle.setToggleState(false);
                this._icon.icon_name = vpnUnknown;
                this._vpninfo.label.text = "Status   : " + "Error";
                this._vpninfo.icon.gicon = Gio.icon_new_for_string(Me.path + '/icons/' + vpnDisconnected);  // this._vpninfo.icon.icon_name = vpnDisconnected;
                this.ip.label.text = ""; this.ip.hide();
                this.servername.label.text = ""; this.servername.hide();
                this.country.label.text = ""; this.country.hide();
                this.city.label.text = ""; this.city.hide();

                // Hide countries and city
                this.countrySection.hide();
                this.citySection.hide();
                // Removes all values in the CountryName, ConnectedCountryName, CityName and ConnectedCityName PopupMenuSection
                this.countryname.removeAll();
                this.connectedcountryname.removeAll();
                this.cityname.removeAll();
                this.connectedcityname.removeAll();
            }
        }
    }
);

function init() {
}

function enable() {
    myPopup = new MyPopup();
    // Main.panel.addToStatusArea('NordVPN', myPopup, 1);
    Main.panel.addToStatusArea('NordVPN', myPopup);
}

function disable() {
    myPopup.stop();
    myPopup.destroy();
    myPopup = null;
}