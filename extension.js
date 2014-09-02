const Config = imports.misc.config;
const Gio = imports.gi.Gio;
const Mainloop = imports.mainloop;
const Soup = imports.gi.Soup;

const Atk = imports.gi.Atk;
const GMenu = imports.gi.GMenu;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const Signals = imports.signals;
const Layout = imports.ui.layout;
const Pango = imports.gi.Pango;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const appSys = Shell.AppSystem.get_default();

const Util = imports.misc.util;

const APPLICATION_ICON_SIZE = 32;
const HORIZ_FACTOR = 5;
const MENU_HEIGHT_OFFSET = 132;
const NAVIGATION_REGION_OVERSHOOT = 50;
const MAX_LENGTH = 100;
const KEY_RETURN = 65293;
const KEY_ENTER = 65421;

const RallyItem = new Lang.Class({
  Name: 'RallyItem',
  Extends: PopupMenu.PopupBaseMenuItem,

  _init: function(button, rally_item_data) {
    this.parent();
    this._rally_item_data = rally_item_data;
    this._button = button;
    this._icon = null;
    
    this._oldX = -1;
    this._oldY = -1;
    
    this.actor.add_child(new St.Label({ text: this.name() }));
    this.actor.connect('motion-event', Lang.bind(this, this._onMotionEvent));
  },

  id: function() {
    return this._rally_item_data.Defect._objectID;
  },

  name: function() {
    return this._rally_item_data.Defect.Name;
  },

  description: function() {
    return "Rally task description";
  },

  itteration: function() {
    return "I52";
  },

  blocked: function() {
    return "true";
  },

  rally_url: function() {
    return this._rally_item_data.Defect._ref;
  },

  get_git_repo_url: function() {
    return this._rally_item_data.Defect._gitURL + "some git repo url";
  },

  get_user_story: function() {
    return "These are the details of the task... lovely jubbly";
  },

  get_details: function () {
    return [this.get_rally_url(), this.get_git_repo_url(), this.get_user_story()];
  },

  icon: function() {
    return this._icon;
  },

  create_icon_texture: function() {
    this.icon = new St.Icon({ 
      icon_name: 'system-run',
      style_class: 'system-status-icon' 
    });

    return this.icon;
  },

  activate: function(event) {
    this._button.displayRallyItem(this);
    this._button.scrollToCatButton(this);
    this.parent(event);
  },

  _isNavigatingSubmenu: function([x, y]) {
    let [posX, posY] = this.actor.get_transformed_position();

    if (this._oldX == -1) {
      this._oldX = x;
      this._oldY = y;
      return true;
    }

    let deltaX = Math.abs(x - this._oldX);
    let deltaY = Math.abs(y - this._oldY);

    this._oldX = x;
    this._oldY = y;

    // If it lies outside the x-coordinates then it is definitely outside.
    if (posX > x || posX + this.actor.width < x)
      return false;

    // If it lies inside the menu item then it is definitely inside.
    if (posY <= y && posY + this.actor.height >= y)
      return true;

    // We want the keep-up triangle only if the movement is more
    // horizontal than vertical.
    if (deltaX * HORIZ_FACTOR < deltaY)
      return false;

    // Check whether the point lies inside triangle ABC, and a similar
    // triangle on the other side of the menu item.
    //
    //   +---------------------+
    //   | menu item           |
    // A +---------------------+ C
    //              P          |
    //                         B

    // Ensure that the point P always lies below line AC so that we can
    // only check for triangle ABC.
    if (posY > y) {
      let offset = posY - y;
      y = posY + this.actor.height + offset;
    }

    // Ensure that A is (0, 0).
    x -= posX;
    y -= posY + this.actor.height;

    // Check which side of line AB the point P lies on by taking the
    // cross-product of AB and AP. See:
    // http://stackoverflow.com/questions/3461453/determine-which-side-of-a-line-a-point-lies
    if (((this.actor.width * y) - (NAVIGATION_REGION_OVERSHOOT * x)) <= 0)
      return true;

    return false;
  },

  _onMotionEvent: function(actor, event) {
    if (!Clutter.get_pointer_grab()) {
      this._oldX = -1;
      this._oldY = -1;
      Clutter.grab_pointer(this.actor);
    }
    this.actor.hover = true;

    if (this._isNavigatingSubmenu(event.get_coords()))
      return true;

    this._oldX = -1;
    this._oldY = -1;
    this.actor.hover = false;
    Clutter.ungrab_pointer();
    return false;
  },

  setActive: function(active, params) {
    if (active) {
      this._button.displayRallyItem(this);
      this._button.scrollToCatButton(this);
    }
    this.parent(active, params);
  }
});

const RallyMenu = new Lang.Class({
  Name: 'RallyMenu',
  Extends: PopupMenu.PopupMenu,

  _init: function(sourceActor, arrowAlignment, arrowSide, button) {
    this.parent(sourceActor, arrowAlignment, arrowSide);
    this._button = button;
    this._tasks = [];
  },

  isEmpty: function() {
    return false;
  },

  open: function(animate) {
    this.parent(animate);
  },

  close: function(animate) {
    let size = Main.layoutManager.panelBox.height;
    this.parent(animate);
  },

  toggle: function() {
    if (this.isOpen) {
      //XXX this should reload the left scroll menu of rally buttons
      //this._button.displayRallyItem(null);
    } else {
      if (Main.overview.visible)
        Main.overview.hide();
    }
    this.parent();
  }
});

const RallyMenuButton = new Lang.Class({
  Name: 'RallyMenuButton',
  Extends: PanelMenu.Button,
  taskMenu: null,

  _init: function() {
    this.parent(1.0, null, false);
    this._rallyManager = new RallyManager();

    this.tasksMenu = new RallyMenu(this.actor, 1.0, St.Side.TOP, this)
    this.setMenu(this.tasksMenu);
    Main.panel.menuManager.addMenu(this.menu);

    this.actor.accessible_role = Atk.Role.LABEL;

    let hbox = new St.BoxLayout({ style_class: 'panel-status-menu-box' });

    this._label = new St.Label({ text: _("Rally"),
                                 y_expand: true,
                                 y_align: Clutter.ActorAlign.CENTER });
    hbox.add_child(this._label);
    hbox.add_child(new St.Label({ text: '\u25BE',
                                  y_expand: true,
                                  y_align: Clutter.ActorAlign.CENTER }));

    this.actor.add_actor(hbox);
    this.actor.name = 'panelTasks';
    this.actor.label_actor = this._label;

    this.actor.connect('captured-event', Lang.bind(this, this._onCapturedEvent));

    _showingId = Main.overview.connect('showing', Lang.bind(this, function() {
        this.actor.add_accessible_state (Atk.StateType.CHECKED);
    }));

    _hidingId = Main.overview.connect('hiding', Lang.bind(this, function() {
        this.actor.remove_accessible_state (Atk.StateType.CHECKED);
    }));

    this.reloadFlag = false;
    this.UI = new UiBuilder(this.menu);
    this.UI.createLayout();
    this._display();

    _installedChangedId = appSys.connect('installed-changed', Lang.bind(this, function() {
      if (this.menu.isOpen) {
        this._redisplay();
        this.UI.mainBox().show();
      } else {
        this.reloadFlag = true;
      }
    }));
  },

  _onCapturedEvent: function(actor, event) {
    if (event.type() == Clutter.EventType.BUTTON_PRESS) {
      if (!Main.overview.shouldToggleByCornerOrButton())
        return true;
    }

    return false;
  },

  _onMenuKeyPress: function(actor, event) {
    let symbol = event.get_key_symbol();
    if (symbol == Clutter.KEY_Left || symbol == Clutter.KEY_Right) {
      let direction = symbol == Clutter.KEY_Left ? Gtk.DirectionType.LEFT
                                                 : Gtk.DirectionType.RIGHT;
      if (this.menu.actor.navigate_focus(global.stage.key_focus, direction, false))
        return true;
    }

    return this.parent(actor, event);
  },

  _onOpenStateChanged: function(menu, open) {
    if (open) {
      if (this.reloadFlag) {
        this._redisplay();
        this.reloadFlag = false;
      }
      this.UI.mainBox().show();
    }
    this.parent(menu, open);
  },

  _redisplay: function() {
    this.UI.rallyItemDetailsBox().destroy_all_children();
    this.UI.rallyItemsBox().destroy_all_children();
    this._display();
  },

  scrollToButton: function(button) {
    let appsScrollBoxAdj = this.UI.rightScrollBox().get_vscroll_bar().get_adjustment();
    let appsScrollBoxAlloc = this.UI.rightScrollBox().get_allocation_box();
    let currentScrollValue = appsScrollBoxAdj.get_value();
    let boxHeight = appsScrollBoxAlloc.y2 - appsScrollBoxAlloc.y1;
    let buttonAlloc = button.actor.get_allocation_box();
    let newScrollValue = currentScrollValue;

    if (currentScrollValue > buttonAlloc.y1 - 10)
      newScrollValue = buttonAlloc.y1 - 10;
    if (boxHeight + currentScrollValue < buttonAlloc.y2 + 10)
      newScrollValue = buttonAlloc.y2 - boxHeight + 10;
    if (newScrollValue != currentScrollValue)
      appsScrollBoxAdj.set_value(newScrollValue);
  },

  scrollToCatButton: function(button) {
    let catsScrollBoxAdj = this.UI.leftScrollBox().get_vscroll_bar().get_adjustment();
    let catsScrollBoxAlloc = this.UI.leftScrollBox().get_allocation_box();
    let currentScrollValue = catsScrollBoxAdj.get_value();
    let boxHeight = catsScrollBoxAlloc.y2 - catsScrollBoxAlloc.y1;
    let buttonAlloc = button.actor.get_allocation_box();
    let newScrollValue = currentScrollValue;

    if (currentScrollValue > buttonAlloc.y1 - 10)
      newScrollValue = buttonAlloc.y1 - 10;
    if (boxHeight + currentScrollValue < buttonAlloc.y2 + 10)
      newScrollValue = buttonAlloc.y2 - boxHeight + 10;
    if (newScrollValue != currentScrollValue)
      catsScrollBoxAdj.set_value(newScrollValue);
  },

  _display: function() {
    this._applicationsButtons = new Array();
    this.UI.mainBox().style=('width: 640px;');
    this.UI.mainBox().hide();

    // Load Rally tasks
    this.applicationsByCategory = {};
    let next_rally_item
    while ((next_rally_item = rallyItems.shift()) !== undefined) {
      let rally_item = new RallyItem(this, next_rally_item);
      this.UI.rallyItemsBox().add_actor(rally_item.actor);
    }

    let height = this.UI.rallyItemsBox().height + MENU_HEIGHT_OFFSET + 'px';
    this.UI.mainBox().style+=('height: ' + height);
  },

  _clearApplicationsBox: function(selectedActor) {
    let actors = this.UI.rallyItemDetailsBox().get_children();
    for (let i = 0; i < actors.length; i++) {
      let actor = actors[i];
      this.UI.rallyItemDetailsBox().remove_actor(actor);
    }
  },

  displayRallyItem: function(rally_item) {
    this.UI.displayRallyItem(rally_item);
  },

  destroy: function() {
    this.menu.actor.get_children().forEach(function(c) { c.destroy() });
    this.parent();
  }
});


const UiBuilder = new Lang.Class({
  Name: 'UiBuilder',

  _init: function(menu) {
    this.UI = {};
    this.UI.current = new St.Bin({style_class: 'current'});
    this.menu = menu;
  },

  mainBox: function() {
    return this.UI.mainBox;
  },

  rallyItemsBox: function() {
    return this.UI.rallyItemsBox;
  },

  rallyItemDetailsBox: function() {
    return this.UI.rallyItemDetailsBox;
  },

  leftScrollBox: function() {
    return this.UI.leftScrollBox;
  },

  rightScrollBox: function() {
    return this.UI.rightScrollBox;
  },

  createLayout: function() {
    let section = new PopupMenu.PopupMenuSection();
    this.menu.addMenuItem(section);

    // boxes
    //
    this.UI.mainBox = new St.BoxLayout({ 
      vertical: false
    });

    this.UI.leftBox = new St.BoxLayout({ 
      vertical: true 
    });

    this.UI.rightBox = new St.BoxLayout({ 
      vertical: true 
    });

    //*** scrollers

    // left scroll box
    //
    this.UI.leftScrollBox = new St.ScrollView({ 
      x_fill: true, 
      y_fill: false,
      y_align: St.Align.START,
      style_class: 'vfade' 
    });
    this.UI.leftScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);

    let left_vscroll = this.UI.leftScrollBox.get_vscroll_bar();

    left_vscroll.connect('scroll-start', Lang.bind(this, function() {
      this.menu.passEvents = true;
    }));

    left_vscroll.connect('scroll-stop', Lang.bind(this, function() {
      this.menu.passEvents = false;
    }));

    this.UI.leftBox.add(this.UI.leftScrollBox, { 
      expand: true,
      x_fill: true, 
      y_fill: true,
      y_align: St.Align.START 
    });

    this.UI.rallyItemsBox = new St.BoxLayout({ vertical: true });
    this.UI.leftScrollBox.add_actor(this.UI.rallyItemsBox, { expand: true, x_fill: false });

    // right scroll box
    //
    this.UI.rightScrollBox = new St.ScrollView({ 
      x_fill: true,
      y_fill: false,
      y_align: St.Align.START,
      style_class: 'task-time-tracker-menu vfade' 
    });
    this.UI.rightScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);

    let right_vscroll = this.UI.rightScrollBox.get_vscroll_bar();

    right_vscroll.connect('scroll-start', Lang.bind(this, function() {
      this.menu.passEvents = true;
    }));

    right_vscroll.connect('scroll-stop', Lang.bind(this, function() {
      this.menu.passEvents = false;
    }));

    this.UI.rightBox.add(this.UI.rightScrollBox, { 
      expand: true,
      x_fill: true, 
      y_fill: true,
      y_align: St.Align.START 
    });

    this.UI.rallyItemDetailsBox = new St.BoxLayout({ vertical: true });
    this.UI.rightScrollBox.add_actor(this.UI.rallyItemDetailsBox);

    this.UI.mainBox.add(this.UI.leftBox);
    this.UI.mainBox.add(this._createVertSeparator(), { expand: false, x_fill: false, y_fill: true});
    this.UI.mainBox.add(this.UI.rightBox);
    section.actor.add_actor(this.UI.mainBox);
  },

  _createVertSeparator: function() {
    let separator = new St.DrawingArea({ style_class: 'calendar-vertical-separator',
                                         pseudo_class: 'highlighted' });
    separator.connect('repaint', Lang.bind(this, this._onVertSepRepaint));

    return separator;
  },

  _onVertSepRepaint: function(area) {
    let cr = area.get_context();
    let themeNode = area.get_theme_node();
    let [width, height] = area.get_surface_size();
    let stippleColor = themeNode.get_color('-stipple-color');
    let stippleWidth = themeNode.get_length('-stipple-width');
    let x = Math.floor(width/2) + 0.5;
    cr.moveTo(x, 0);
    cr.lineTo(x, height);
    Clutter.cairo_set_source_color(cr, stippleColor);
    cr.setDash([1, 3], 1); // Hard-code for now
    cr.setLineWidth(stippleWidth);
    cr.stroke();
  },

  displayRallyItem: function(rally_item) {
    let rally_item_details = this._buildRallyItemDetails(rally_item);
    this.UI.rallyItemDetailsBox.destroy_all_children();
    this.UI.rallyItemDetailsBox.add_actor(rally_item_details);
  },

  _buildRallyItemDetails: function(rally_item) {
    this.UI.id           = new St.Label({ text: '- ' + rally_item.id() });
    this.UI.name         = new St.Label({ text: '- ' + rally_item.name() });
    this.UI.description  = new St.Label({ text: '- ' + rally_item.description() });
    this.UI.itteration   = new St.Label({ text: '- ' + rally_item.itteration() });
    this.UI.blocked      = new St.Label({ text: '- ' + rally_item.blocked() });
    
    let rb = new St.BoxLayout({
      style_class: 'item-current-databox'
    });

    let rb_captions = new St.BoxLayout({
      vertical: true,
      style_class: 'item-current-databox-captions'
    });
    rb.add_actor(rb_captions);

    let rb_values = new St.BoxLayout({
      vertical: true,
      style_class: 'item-current-databox-values'
    });
    rb.add_actor(rb_values);
    
    rb_captions.add_actor(new St.Label({text: 'ID'}));
    rb_values.add_actor(this.UI.id);
    rb_captions.add_actor(new St.Label({text: 'Name'}));
    rb_values.add_actor(this.UI.name);
    rb_captions.add_actor(new St.Label({text: 'Description'}));
    rb_values.add_actor(this.UI.description);
    rb_captions.add_actor(new St.Label({text: 'Itteration'}));
    rb_values.add_actor(this.UI.itteration);
    rb_captions.add_actor(new St.Label({text: 'Blocked'}));
    rb_values.add_actor(this.UI.blocked);
    
    let xb = new St.BoxLayout();
    xb.add_actor(rb);
    
    let box = new St.BoxLayout({
      style_class: 'task-current-iconbox'
    });

    box.add_actor(xb);

    return box;
  },
});

let _httpSession;
const RallyManager = new Lang.Class({
  Name: 'RallyManager',

  _init: function() {
  },

  load_json_async: function(url, params, fun) {
    if (_httpSession === undefined) {
      if (ExtensionUtils.versionCheck(['3.6'], Config.PACKAGE_VERSION)) {
        _httpSession = new Soup.SessionAsync();
        Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());
      } else
        _httpSession = new Soup.Session();
    }

    let message = Soup.form_request_new_from_hash('GET', url, params);

    _httpSession.queue_message(message, Lang.bind(this, function(_httpSession, message) {
      try {
        if (!message.response_body.data) {
          fun.call(this, 0);
          return;
        }
        let jp = JSON.parse(message.response_body.data);
        fun.call(this, jp);
      } catch (e) {
        fun.call(this, 0);
        return;
      }
    }));

    return;
  }
});

let tasksMenuButton;
let tasksButton;
let _hidingId;
let _installedChangedId;
let _showingId;
let _tasks;
let rallyItems = [
  {
    "Defect":
    {
      "id": "DE0001",
      "title": "Some defect title",
      "description": "Some defect desription",
      "itteration": "i52",
      "blocked": true
    }
  }
];

let rallyItems = [
  { "Defect":
    {
      "_rallyAPIMajor": "2",
      "_rallyAPIMinor": "0",
      "_ref": "https://rally1.rallydev.com/slm/webservice/v2.0/defect/54472",
      "_refObjectName": "This is the defect name",
      "_type": "Defect",
      "CreationDate": "2007-08-02T13:55:48.757Z",
      "ObjectID": 54472,
      "Name": "This is the defect name",
      "FormattedID": "D57",
      "LastUpdateDate": "2007-08-02T13:55:48.757Z",
      "Project": {
        "_rallyAPIMajor": "2",
        "_rallyAPIMinor": "0",
        "_ref": "https://rally1.rallydev.com/slm/webservice/v2.0/project/28030",
        "_refObjectName": "Project 1",
        "_type": "Project"
      },
      "SubmittedBy": "paul.cockrell@evogi.com",
      "Duplicates": [
        {
          "_rallyAPIMajor": "2",
          "_rallyAPIMinor": "0",
          "_ref": "https://rally1.rallydev.com/slm/webservice/v2.0/defect/31275",
          "_refObjectName": "Duplicate 1",
          "_type": "Defect"
        },
        {
          "_rallyAPIMajor": "2",
          "_rallyAPIMinor": "0",
          "_ref": "https://rally1.rallydev.com/slm/webservice/v2.0/project/27872",
          "_refObjectName": "Duplicate 2",
          "_type": "Defect"
        },
      ]
    }
  }
];

function enable() {
  tasksButton = Main.panel.statusArea['activities'];
  tasksButton.container.hide();
  tasksMenuButton = new RallyMenuButton();
  Main.panel.addToStatusArea('task-time-tracker', tasksMenuButton, 1, 'right');

  Main.wm.setCustomKeybindingHandler('panel-main-menu',
                                     Shell.KeyBindingMode.NORMAL |
                                     Shell.KeyBindingMode.OVERVIEW,
                                     function() {
                                       tasksMenuButton.menu.toggle();
                                     });
}

function disable() {
  Main.panel.menuManager.removeMenu(tasksMenuButton.menu);
  appSys.disconnect(_installedChangedId);
  Main.overview.disconnect(_hidingId);
  Main.overview.disconnect(_showingId);
  tasksMenuButton.destroy();
  tasksButton.container.show();

  Main.wm.setCustomKeybindingHandler('panel-main-menu',
                                     Shell.KeyBindingMode.NORMAL |
                                     Shell.KeyBindingMode.OVERVIEW,
                                     Main.sessionMode.hasOverview ?
                                     Lang.bind(Main.overview, Main.overview.toggle) :
                                     null);
}

function init(metadata) {
  Convenience.initTranslations();
}
