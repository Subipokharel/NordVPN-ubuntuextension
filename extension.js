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
//Icon style --> usr/share/icons/Yaru/scalable/status
const vpnON = "network-vpn-symbolic";
const vpnOFF = "network-vpn-disconnected-symbolic";

class NordVPN {
	constructor() {
        this._commands = {
            connect: ['nordvpn', 'c'],
            disconnect: ['nordvpn', 'd'],
            status: ['nordvpn', 'status']
        }

    }
}

const MyPopup = GObject.registerClass(
    class MyPopup extends PanelMenu.Button {
        _init() {
            super._init(0);
            // Initiate VPN class
            this._commands = {
                connect: ['nordvpn', 'c'],
                disconnect: ['nordvpn', 'd'],
                status: ['nordvpn', 'status']
            }

            //Check VPN Status return - ToggleStatus and ipAddress
            this.vpnTogglestatus = false;
            this.ipAddress = "";

            // Menu Icon
            this._icon = new St.Icon({
                icon_name: 'network-vpn-disconnected-symbolic',
                style_class: 'system-status-icon',
            });
            this.add_child(this._icon);

            //Add VPN Toggle switch
            let vpnToggle = new PopupMenu.PopupSwitchMenuItem('Nord VPN', this.vpnTogglestatus, {});
            vpnToggle.connect('toggled', this._toggleOutput.bind(this));
            this.menu.addMenuItem(vpnToggle);

            // Add a separator
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            // this is where IP info will go
            this._vpninfo = new PopupMenu.PopupMenuItem(
                this.ipAddress,
                { reactive: false }
            );
            this.menu.addMenuItem(this._vpninfo);
        }

        // VPN Toggle on or OFF
        async _toggleOutput(widget, value) {
            if (value) {
                this._icon.icon_name = vpnON;
                log('Toggle has been turned ON!'); //Main.notify('Toggle has been turned ON!');
                let newipAddress= await this._vpnConnect();
                this._vpninfo.label.text = "IP Address: " + newipAddress; // Need to look into this prints promise right now
            } 
            else {
                this._icon.icon_name = vpnOFF;
                log('Toggle has been turned OFF!'); //Main.notify('Toggle has been turned OFF!');

                this._vpninfo.label.text = this._vpnDisconnect();               
            }
            return Clutter.EVENT_PROPAGATE;
        }

        async _vpnConnect() {
            // Return True or false based on Connection Status
            try{
                let updatedIP = await this._getIP();
                return updatedIP;
            }
            catch(e){
                updatedIP = "Error";
                return updatedIP;
            }
        }
    
        _vpnDisconnect() {
            // Return true or false based on Disconnection status
            this._newip = "Disconnected";
            return this._newip;
        }

        async _getIP(input = null, cancellable = null) {
            try{
                let fullStatus, newval;
                let cancelId = 0;
                let flags = (Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
            
                let proc = new Gio.Subprocess({
                    argv: this._commands.status,
                    flags: flags
                });
                proc.init(cancellable);
                if (cancellable instanceof Gio.Cancellable) {
                    cancelId = cancellable.connect(() => proc.force_exit());
                }
            
                // let status =  
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
                            fullStatus = fullStatus.slice(fullStatus.indexOf("Status:"), fullStatus.length).trim(); // Trims off "\u000d-\u000d  \u000d\u000d-\u000d  \u000d"
                            const result = fullStatus.split('\n'); // Joins everything to one sentence
                            const statusLine = result.find((line) => line.includes("Status:"));
                            const vpnstatus = statusLine ? statusLine.replace("Status:", "").trim() : "Unknown"; // Get connected or disconnected
                            if (vpnstatus.toLowerCase() === "connected") {
                                newval = result.find((line) => line.includes("IP:")) ? (result.find((line) => line.includes("IP:"))).replace("IP:", "").trim() : "Unknown";
                                resolve(newval);               
                            }
                            else {
                                newval = "Not Connected";
                                resolve(newval);
                            }
                        } catch (e) {
                            reject(e);
                        } finally {
                            if (cancelId > 0) {
                                cancellable.disconnect(cancelId);
                            }
                        }
                    });
                });
            }catch (e) {
                log(e);
            }
        }
    }
);

function init() {

}

function enable() {
    myPopup = new MyPopup();
    Main.panel.addToStatusArea('testPopup', myPopup, 1);
}

function disable() {
    myPopup.destroy();
}
