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
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
let myPopup;
let timeout = 0;

//Icon style --> usr/share/icons/Yaru/scalable/status
const vpnON = "network-vpn-symbolic";
const vpnOFF = "network-vpn-disconnected-symbolic";
const vpnUnknown = "network-vpn-no-route-symbolic.svg"

class NordVPN {
    constructor() {
        this._commands = {
            connect: ['nordvpn', 'c'],
            disconnect: ['nordvpn', 'd'],
            status: ['nordvpn', 'status'],
            countries: ['nordvpn', 'countries']
        }
    }

    // Run command to connect to VPN
    async _vpnConnect() {
        try {
            Main.notify("Connecting to VPN...");
            this._execCommand(this._commands.connect);
        }
        catch (err) {
            log(err);
        }
    }

    // Run command to disconnect from VPN
    async _vpnDisconnect() {
        try {
            Main.notify("Disconnecting VPN...");
            this._execCommand(this._commands.disconnect);
        }
        catch (err) {
            log(err);
        }
    }

    // Check VPN connection status
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

    // Execute Command VPN
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

    // Run Command to list countries and return list of countries
    async listvpncountry() {
        try {
            let countriesToreturn = await this._execCommand(this._commands.countries);
            return countriesToreturn;
        }
        catch (err) {
            log(err);
        }
    }
}

const MyPopup = GObject.registerClass(
    class MyPopup extends PanelMenu.Button {
        _init() {
            //Initialize
            super._init(0);
            this.NordVPNhandler = new NordVPN();
            this.vpnTogglestatus = false;
            this.vpnStatus = "";

            // Menu Icon
            this._icon = new St.Icon({
                icon_name: vpnUnknown,
                style_class: 'system-status-icon'
            });
            this.add_child(this._icon);

            //Add VPN Toggle switch
            this.vpnToggle = new PopupMenu.PopupSwitchMenuItem("  Nord VPN", this.vpnTogglestatus, {});
            this.vpnToggle.connect('toggled', this._toggleOutput.bind(this));
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

            // Add Countries
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem("VPN Settings"));
            this.countrySection = new PopupMenu.PopupSubMenuMenuItem("Countries");
            this.menu.addMenuItem(this.countrySection);
            this.countrySection.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem("Change Countries"));
            this.countryname = new PopupMenu.PopupMenuSection("SectionA");
            this.countrySection.menu.addMenuItem(this.countryname);

            // Add Countries to dropdown
            this.getCountriesList();

            // Updates and updates the Panel status after every 30 seconds
            this._update();
            timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, (30 * 1000), () => {
                this._update();
                return GLib.SOURCE_CONTINUE;
            });

            // Open and close menu
            this.menu.connect('open-state-changed', this._menuopen.bind(this));
        }

        // VPN Toggle on or OFF
        async _toggleOutput(widget, value) {
            if (value) { this.NordVPNhandler._vpnConnect(); }
            else { this.NordVPNhandler._vpnDisconnect(); }

            await this._update();
            return Clutter.EVENT_PROPAGATE;
        }

        // Retrieves VPN status and returns it
        async getVPNstatusDict() {
            var dict = await this.NordVPNhandler.getvpnstatus().catch((err) => {
                log(err)
            });
            return dict;
        }

        // Call NordVPN class and run change country
        async _changecountries(countryname){
            var value = await this.getVPNstatusDict();
            // Check if VPN is already connected to user selected country
            if (value["Country"].toLowerCase().replace(/ /g,"_") === countryname.toLowerCase()) {
                Main.notify(`"VPN already in ${countryname}"`);
            }
            else{
                Main.notify(`"Changing NordVPN country to ${countryname}..."`);
                this.changecountry = ['nordvpn', 'c', countryname];
                this.NordVPNhandler._execCommand(this.changecountry);
            }
        }

        // Returns list of countries
        async getCountriesList(){
            try{
                let listValue = await this.NordVPNhandler.listvpncountry();
                listValue = listValue.slice(listValue.indexOf("A"), listValue.length).trim();
                const result = listValue.split(',');
                result.forEach((country) => {
                        let singleCountry = country.trim();
                        this.countryname.addAction(singleCountry, () => this._changecountries(singleCountry));
                });
            } catch (err) {
                log(err);
            }
        }

        // When the VPN panel is clicked updates the values
        async _menuopen(menu, open) {
            try {
                if (open) { await this._update(); }
            } catch (err) {
                log(err);
            }
        }

        // Retrieves VPN status and updates values as necessary
        async _update() {
            try {
                var value = await this.getVPNstatusDict();
                if (value["Status"] === "connected") {
                    this.vpnToggle.setToggleState(true);
                    this._icon.icon_name = vpnON;
                    this._vpninfo.label.text = "Status   : " + value["Status"][0].toUpperCase() + value["Status"].substring(1);
                    this._vpninfo.icon.icon_name = "livepatch_on";
                    this.ip.label.text = "IP : " + value["IP"];     this.ip.show();
                    this.servername.label.text = "HostName : " + value["Hostname"];     this.servername.show();
                    this.country.label.text = "Country : " + value["Country"][0].toUpperCase() + value["Country"].substring(1);     this.country.show();
                    this.city.label.text = "City : " + value["City"][0].toUpperCase() + value["City"].substring(1);     this.city.show();
                    //show countries
                    this.countrySection.show();
                }
                else if (value["Status"] === "disconnected") {
                    this.vpnToggle.setToggleState(false);
                    this._icon.icon_name = vpnOFF;
                    this._vpninfo.label.text = "Status   : " + value["Status"][0].toUpperCase() + value["Status"].substring(1);
                    this._vpninfo.icon.icon_name = "livepatch_warning";
                    this.ip.label.text = ""; this.ip.hide();
                    this.servername.label.text = ""; this.servername.hide();
                    this.country.label.text = ""; this.country.hide();
                    this.city.label.text = ""; this.city.hide();
                    //hide countries
                    this.countrySection.hide();
                }
                else {
                    this.vpnToggle.setToggleState(false);
                    this._icon.icon_name = vpnUnknown;
                    this._vpninfo.label.text = "Status   : " + "Error";
                    this._vpninfo.icon.icon_name = "livepatch_warning";
                    this.ip.label.text = ""; this.ip.hide();
                    this.servername.label.text = ""; this.servername.hide();
                    this.country.label.text = ""; this.country.hide();
                    this.city.label.text = ""; this.city.hide();
                    //hide countries
                    this.countrySection.hide();
                }
            }
            catch (e) {
                this.vpnToggle.setToggleState(false);
                this._icon.icon_name = vpnUnknown;
                this._vpninfo.label.text = "Status   : " + "Error";
                this._vpninfo.icon.icon_name = "livepatch_warning";
                this.ip.label.text = ""; this.ip.hide();
                this.servername.label.text = ""; this.servername.hide();
                this.country.label.text = ""; this.country.hide();
                this.city.label.text = ""; this.city.hide();
                //hide countries
                this.countrySection.hide();
            }
        }
    }
);

function init() {
}

function enable() {
    myPopup = new MyPopup();
    Main.panel.addToStatusArea('NordVPN', myPopup, 1);
}

function disable() {
    GLib.Source.remove(timeout);
    timeout = null;
    myPopup.stop();
    myPopup.destroy();
    myPopup = null;
}