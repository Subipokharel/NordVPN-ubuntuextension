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
            status: ['nordvpn', 'status']
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
                        // log(fullStatus);
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
}

const MyPopup = GObject.registerClass(
    class MyPopup extends PanelMenu.Button {
        _init() {
            super._init(0);
            
            //Initialize
            this.NordVPNhandler = new NordVPN();
            this.vpnTogglestatus = false;
            this.ipAddress = "";

            // Menu Icon
            this._icon = new St.Icon({ icon_name: vpnUnknown, style_class: 'system-status-icon', });
            this.add_child(this._icon);
            //Add VPN Toggle switch
            this.vpnToggle = new PopupMenu.PopupSwitchMenuItem('Nord VPN', this.vpnTogglestatus, {});
            this.vpnToggle.connect('toggled', this._toggleOutput.bind(this));
            this.menu.addMenuItem(this.vpnToggle);
            // Add a separator
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            // This is where IP info will go
            this._vpninfo = new PopupMenu.PopupMenuItem(this.ipAddress, { reactive: false });
            this.menu.addMenuItem(this._vpninfo);
            
            // Updates and updates the Panel status after every 20 seconds
            this._update();
            timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, (20 * 1000), () => {
                this._update();
                return GLib.SOURCE_CONTINUE;
            });
            // Open and close menu
            this.menu.connect('open-state-changed', this._menuopen.bind(this));
        }

        // VPN Toggle on or OFF
        async _toggleOutput(widget, value) {
            let val;
            if (value) {
                // log('Toggle has been turned ON!');
                this.NordVPNhandler._vpnConnect();
            }
            else {
                // log('Toggle has been turned OFF!');
                this.NordVPNhandler._vpnDisconnect();
            }
            await this._update();

            return Clutter.EVENT_PROPAGATE; 
        }

        async getVPNstatusDict() {
            var dict = await this.NordVPNhandler.getvpnstatus().catch((err) => {
                log(err)
            });
            return dict;
        }

        async _menuopen(menu, open) {
            try {
                if (open) {
                    await this._update();
                }
            } catch (err) {
                log(err);
            }
        }

        async _update() {
            try {
                let newipAddress;
                var value = await this.getVPNstatusDict();
                // Check value and update tray icon
                if (value["Status"] === "connected") {
                    this.vpnToggle.setToggleState(true);
                    this._icon.icon_name = vpnON;
                    newipAddress = value["IP"];
                    this._vpninfo.label.text = "IP Address: " + newipAddress;
                }
                else if (value["Status"] === "disconnected") {
                    this.vpnToggle.setToggleState(false);
                    this._icon.icon_name = vpnOFF;
                    this._vpninfo.label.text = value["Status"][0].toUpperCase() + value["Status"].substring(1);
                }
                else {
                    this.vpnToggle.setToggleState(false);
                    this._icon.icon_name = vpnUnknown;
                    this._vpninfo.label.text = "Error";
                }
            }
            catch {
                this.vpnToggle.setToggleState(false);
                this._icon.icon_name = vpnUnknown;
                this._vpninfo.label.text = "Error";
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
    myPopup.destroy();
}