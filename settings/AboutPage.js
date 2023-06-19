/* exported AboutPage */
const {Adw, Gdk, Gio, GLib, GObject, Gtk} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;
// Constants
const nordVPN = "nordvpn"
var GNU_author   = '<span size="small">' +
    'Nord VPN extension for GNOME by <a href="' + Me.metadata.url +
    '">github.com/Subipokharel</a>' +
    '</span>';
var GNU_SOFTWARE = '<span size="small">' +
    'This program comes with absolutely no warranty.\n' +
    'See the <a href="https://gnu.org/licenses/old-licenses/gpl-2.0.html">' +
    'GNU General Public License, version 2 or later</a> for details.' +
    '</span>';
var GNU_DISCLAIMER = '<span size="small">' +
    'This is not an official extension created by Nord Security. This extension is built to \n' +
    'understand GJS - feel free to use it or modify the code as you want for personal use. \n' +
    'No commercial use allowed.' +
    '</span>';

var AboutPage = GObject.registerClass(
class ArcMenuAboutPage extends Adw.PreferencesPage {
    _init(settings) {
        super._init({
            title: _('About'),
            icon_name: 'help-about-symbolic',
            name: 'AboutPage',
        });
        this._settings = settings;

        // App Logo, title, description ----------------------------------------------
        const projectHeaderGroup = new Adw.PreferencesGroup();
        const projectHeaderBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: false,
            vexpand: false,
        });
        const projectImage = new Gtk.Image({
            margin_bottom: 5,
            icon_name: nordVPN,
            pixel_size: 100,
        });
        const projectTitleLabel = new Gtk.Label({
            label: _('Nord VPN'),
            vexpand: true,
            valign: Gtk.Align.FILL,
        });
        const projectDescriptionLabel = new Gtk.Label({
            label: _(GNU_author),
            use_markup: true,
            justify: Gtk.Justification.CENTER,
        });
        projectHeaderBox.append(projectImage);
        projectHeaderBox.append(projectTitleLabel);
        projectHeaderBox.append(projectDescriptionLabel);
        projectHeaderGroup.add(projectHeaderBox);
        this.add(projectHeaderGroup);

        // Extension version ------------------------------------------------------------
        const infoGroup = new Adw.PreferencesGroup();
        const projectVersionRow = new Adw.ActionRow({
            title: _('NordVPN extension Version'),
        });
        projectVersionRow.add_suffix(new Gtk.Label({
            label: Me.metadata.version.toString(),
        }));
        infoGroup.add(projectVersionRow);
        // GNOME version
        const gnomeVersionRow = new Adw.ActionRow({
            title: _('GNOME Version'),
        });
        gnomeVersionRow.add_suffix(new Gtk.Label({
            label: imports.misc.config.PACKAGE_VERSION.toString(),
        }));
        infoGroup.add(gnomeVersionRow);
        // GNOME OS name
        const osRow = new Adw.ActionRow({
            title: _('OS Name'),
        });
        const name = GLib.get_os_info('NAME');
        const prettyName = GLib.get_os_info('PRETTY_NAME');
        osRow.add_suffix(new Gtk.Label({
            label: prettyName ? prettyName : name,
        }));
        infoGroup.add(osRow);
        // GNOME Desktop Environment
        const sessionTypeRow = new Adw.ActionRow({
            title: _('Windowing System'),
        });
        sessionTypeRow.add_suffix(new Gtk.Label({
            label: GLib.getenv('XDG_SESSION_TYPE') === 'wayland' ? 'Wayland' : 'X11',
        }));
        infoGroup.add(sessionTypeRow);
        this.add(infoGroup);

        // Add a Disclaimer ---------------------------------------------------------
        const disclaimerGroup = new Adw.PreferencesGroup({
            title: _('Disclaimer'),
        });
        this.add(disclaimerGroup);
        const disclaimerRow = new Adw.PreferencesRow({
            activatable: false,
            selectable: false,
        });
        disclaimerGroup.add(disclaimerRow);
        const disclaimerBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
        });
        disclaimerRow.set_child(disclaimerBox);
        const disclaimerCarousel = new Adw.Carousel({
            hexpand: true,
            halign: Gtk.Align.FILL,
            margin_top: 5,
            margin_bottom: 5,
        });
        disclaimerCarousel.append(new Gtk.Label({
            label: _(GNU_DISCLAIMER),
            use_markup: true,
            vexpand: true,
            valign: Gtk.Align.CENTER,
            hexpand: true,
            halign: Gtk.Align.FILL,
            justify: Gtk.Justification.CENTER,
        }));
        disclaimerBox.append(disclaimerCarousel);

        // Footer ---------------------------------------------------------------------
        const gnuSoftwareGroup = new Adw.PreferencesGroup();
        const gnuSofwareLabel = new Gtk.Label({
            label: _(GNU_SOFTWARE),
            use_markup: true,
            justify: Gtk.Justification.CENTER,
        });
        const gnuSofwareLabelBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            valign: Gtk.Align.END,
            vexpand: true,
        });
        gnuSofwareLabelBox.append(gnuSofwareLabel);
        gnuSoftwareGroup.add(gnuSofwareLabelBox);
        this.add(gnuSoftwareGroup);
    }
});