const {Gdk, Gtk} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Settings = Me.imports.settings;

const _ = Gettext.gettext;
const {AboutPage} = Settings.AboutPage;
const {GeneralPage} = Settings.GeneralPage;

function init() {
    ExtensionUtils.initTranslations(Me.metadata['gettext-domain']);
}

function populateWindow(window, settings) {
    if (window.pages?.length > 0)
        window.pages.forEach(page => window.remove(page));

    window.pages = [];

    const generalPage = new GeneralPage(settings);
    window.add(generalPage);
    window.pages.push(generalPage);

    const aboutPage = new AboutPage(settings, window);
    window.add(aboutPage);
    window.pages.push(aboutPage);
}

function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings();
    window.can_navigate_back = true;
    window.set_title(_('Nord VPN'));

    populateWindow(window, settings);
}