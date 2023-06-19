/* exported GeneralPage */
const {Adw, Gio, GObject, Gtk} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

var MenuPosition = {
    LEFT: 0,
    CENTER: 1,
    RIGHT: 2,
};

var GeneralPage = GObject.registerClass(
class ArcMenuGeneralPage extends Adw.PreferencesPage {
    _init(settings) {
        super._init({
            title: _('General'),
            icon_name: 'go-home-symbolic',
            name: 'GeneralPage',
        });
        this._settings = settings;
        // Menu in Panel Menu
        const menuDisplayGroup = new Adw.PreferencesGroup({
            title: _('General Settings')
        });
        // Position in Panel Row ----------------------------------------------------------
        // const menuPositions = new Gtk.StringList();
        // menuPositions.append(_('Left'));
        // menuPositions.append(_('Center'));
        // menuPositions.append(_('Right'));
        // const menuPositionRow = new Adw.ComboRow({
        //     title: _('Position in Panel'),
        //     model: menuPositions,
        //     selected: this._settings.get_enum('position-in-panel'),
        // });
        // menuDisplayGroup.add(menuPositionRow);
        // menuPositionRow.connect('notify::selected', widget => {
        //     if (widget.selected === MenuPosition.CENTER)
        //         menuAlignmentRow.show();
        //     else
        //         menuAlignmentRow.hide();
        //     this._settings.set_enum('position-in-panel', widget.selected);
        // });
        
        // Time interval indicator Panel ---------------------------------------------------
        let intervalScale = new Gtk.SpinButton({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 15,
                upper: 200,
                step_increment: 5,
                page_increment: 5,
                page_size: 0,
            }),
            digits: 0,
            valign: Gtk.Align.CENTER,
        });
        intervalScale.set_value(this._settings.get_int('interval-time'));
        intervalScale.connect('value-changed', () => {
            this._settings.set_int('interval-time', intervalScale.get_value());
        });
        const showIndicatorRow = new Adw.ActionRow({
            title: _('Seconds between updates'),
            subtitle: _('Time interval the vpn panel indicator refreshes'),
            activatable_widget: intervalScale,
        });
        showIndicatorRow.add_suffix(intervalScale);
        menuDisplayGroup.add(showIndicatorRow);
        this.add(menuDisplayGroup);
    }
});