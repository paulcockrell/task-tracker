

/***
 * Stole from the weather extension
 * ***/

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

const Application = new Lang.Class({
  Name: 'Application',

  _init: function(name, execute) {
    this._name = name;
    this._execute = execute;
  },

  get_name: function() {
    return this._name;
  },

  execute: function() {
    return this._execute();
  },

  icon: function() {
    return this._icon;
  },

  create_icon_texture: function() {
    this.icon = new St.Icon({ icon_name: 'system-run',
                              style_class: 'system-status-icon' });
    return this.icon;
  }
});

const Task = new Lang.Class({
  Name: 'Task',

  _init: function(data) {
    this._name = data.Defect.Name;
    this._objectID = data.Defect.ObjectID;
    this._rallyURL = data.Defect._ref;
    this._gitURL = null;
    this._icon = null;
  },

  get_name: function() {
    return this._name;
  },

  get_object_id: function() {
    return this._objectID;
  },

  get_rally_title: function() {
    return "Open task in Rally";
  },

  get_rally_url: function() {
    return this._rallyURL;
  },

  get_git_repo_url: function() {
    return this._gitURL + "some git repo url";
  },

  get_user_story: function() {
    return "These are the details of the task... lovely jubbly";
  },

  get_details: function () {
    return [this.get_rally_url(), this.get_git_repo_url(), this.get_user_story()];
  },

  get_applications: function() {
    let rally_exe = new Application(this.get_rally_title(), function() { Util.spawn(['/usr/bin/firefox', this.get_rally_url()]); }.bind(this));
    let git_exe = new Application(this.get_name(), function() { Util.spawn(['/usr/bin/firefox', this.get_get_repo_url()]); });

    return [rally_exe, git_exe];
  },

  icon: function() {
    return this._icon;
  },

  create_icon_texture: function() {
    this.icon = new St.Icon({ icon_name: 'system-run',
                              style_class: 'system-status-icon' });
    return this.icon;
  }
});

const ActivitiesMenuItem = new Lang.Class({
  Name: 'ActivitiesMenuItem',
  Extends: PopupMenu.PopupBaseMenuItem,

  _init: function(button) {
    this.parent();
    this._button = button;

    // New task entry box
    //
    this.newTask = new St.Entry({
      name: "newTaskEntry",
      hint_text: _("New task..."),
      track_hover: false,
      can_focus: true
    });
    this.actor.add_child(this.newTask);
  },

  // This should call the add new task function
  //
  activate: function(event) {
    let that = this;
    let entryNewTask = this.newTask.clutter_text;
    entryNewTask.set_max_length(MAX_LENGTH);
    entryNewTask.connect('key-press-event', function(o,e)	{
      let symbol = e.get_key_symbol();
      if (symbol == KEY_RETURN || symbol == KEY_ENTER) {
        let task = new Task(o);
        that.tasks << task;
        entryNewTask.set_text('');
      }
    });
  }
});

const ApplicationMenuItem = new Lang.Class({
  Name: 'ApplicationMenuItem',
  Extends: PopupMenu.PopupBaseMenuItem,

  _init: function(button, task) {
    this.parent();
    this._task = task;
    this._button = button;

    this._iconBin = new St.Bin();
    this.actor.add_child(this._iconBin);

    let taskLabel = new St.Label({ text: this._task.get_name() });
    this.actor.add_child(taskLabel, { expand: true });
    this.actor.label_actor = taskLabel;

    let textureCache = St.TextureCache.get_default();
    let iconThemeChangedId = textureCache.connect('icon-theme-changed',
                                                  Lang.bind(this, this._updateIcon));
    this.actor.connect('destroy', Lang.bind(this,
      function() {
        textureCache.disconnect(iconThemeChangedId);
      }));
    this._updateIcon();
  },

  activate: function(event) {
	  // XXX Im just opening firefox here, assuming all clicks open a browser, this
	  // needs to be more intelligentio
	  //
    this._task.execute()
    this._button.selectCategory(null, null);
    this._button.menu.toggle();
	  this.parent(event);
  },

  setActive: function(active, params) {
    if (active)
      this._button.scrollToButton(this);

    this.parent(active, params);
  },

  _getPreferredWidth: function(actor, forHeight, alloc) {
    alloc.min_size = alloc.natural_size = -1;
  },

  _updateIcon: function() {
    //XXX We cannot have icons as I am simply passing in a string rather than a class at this point
    this._iconBin.set_child(this._task.create_icon_texture(APPLICATION_ICON_SIZE));
  }
});

const CategoryMenuItem = new Lang.Class({
    Name: 'CategoryMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,

    _init: function(button, category) {
	this.parent();
	this._category = category;
        this._button = button;

        this._oldX = -1;
        this._oldY = -1;

        let name;
        if (this._category)
            name = this._category.get_name();
        else
            name = _("Favorites");

        this.actor.add_child(new St.Label({ text: name }));
        this.actor.connect('motion-event', Lang.bind(this, this._onMotionEvent));
    },

    activate: function(event) {
        this._button.selectCategory(this._category, this);
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
            this._button.selectCategory(this._category, this);
            this._button.scrollToCatButton(this);
        }
        this.parent(active, params);
    }
});

const TasksMenu = new Lang.Class({
  Name: 'TasksMenu',
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
        this._button.selectCategory(null, null);
    } else {
      if (Main.overview.visible)
        Main.overview.hide();
    }
    this.parent();
  }
});

const ApplicationsButton = new Lang.Class({
    Name: 'ApplicationsButton',
    Extends: PanelMenu.Button,
    taskMenu: null,

    _init: function() {
        this.parent(1.0, null, false);
        this._rallyManager = new RallyManager();

        // this.actor.add_actor(this.buttonText);
        this.tasksMenu = new TasksMenu(this.actor, 1.0, St.Side.TOP, this)
        this.setMenu(this.tasksMenu);
        Main.panel.menuManager.addMenu(this.menu);

        this.actor.accessible_role = Atk.Role.LABEL;

        let hbox = new St.BoxLayout({ style_class: 'panel-status-menu-box' });

        this._label = new St.Label({ text: _("Tasks"),
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
        this._createLayout();
        this._display();

        _installedChangedId = appSys.connect('installed-changed', Lang.bind(this, function() {
            if (this.menu.isOpen) {
                this._redisplay();
                this.mainBox.show();
            } else {
                this.reloadFlag = true;
            }
        }));
    },

    _createVertSeparator: function() {
        let separator = new St.DrawingArea({ style_class: 'calendar-vertical-separator',
                                             pseudo_class: 'highlighted' });
        separator.connect('repaint', Lang.bind(this, this._onVertSepRepaint));
        return separator;
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

    _onOpenStateChanged: function(menu, open) {
       if (open) {
           if (this.reloadFlag) {
               this._redisplay();
               this.reloadFlag = false;
           }
           this.mainBox.show();
       }
       this.parent(menu, open);
    },

    _redisplay: function() {
        this.applicationsBox.destroy_all_children();
        this.categoriesBox.destroy_all_children();
        this._display();
    },

    scrollToButton: function(button) {
        let appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
        let appsScrollBoxAlloc = this.applicationsScrollBox.get_allocation_box();
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
        let catsScrollBoxAdj = this.categoriesScrollBox.get_vscroll_bar().get_adjustment();
        let catsScrollBoxAlloc = this.categoriesScrollBox.get_allocation_box();
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

    _createLayout: function() {
        let section = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(section);
        this.mainBox = new St.BoxLayout({ vertical: false });
        this.leftBox = new St.BoxLayout({ vertical: true });
        this.applicationsScrollBox = new St.ScrollView({ x_fill: true, y_fill: false,
                                                         y_align: St.Align.START,
                                                         style_class: 'task-time-tracker-menu vfade' });
        this.applicationsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        let vscroll = this.applicationsScrollBox.get_vscroll_bar();
        vscroll.connect('scroll-start', Lang.bind(this, function() {
            this.menu.passEvents = true;
        }));
        vscroll.connect('scroll-stop', Lang.bind(this, function() {
            this.menu.passEvents = false;
        }));
        this.categoriesScrollBox = new St.ScrollView({ x_fill: true, y_fill: false,
                                                       y_align: St.Align.START,
                                                       style_class: 'vfade' });
        this.categoriesScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        vscroll = this.categoriesScrollBox.get_vscroll_bar();
        vscroll.connect('scroll-start', Lang.bind(this, function() {
                              this.menu.passEvents = true;
                          }));
        vscroll.connect('scroll-stop', Lang.bind(this, function() {
            this.menu.passEvents = false;
        }));
        this.leftBox.add(this.categoriesScrollBox, { expand: true,
                                                     x_fill: true, y_fill: true,
                                                     y_align: St.Align.START });

        let activities = new ActivitiesMenuItem(this);
        this.leftBox.add(activities.actor, { expand: false,
                                             x_fill: true, y_fill: false,
                                             y_align: St.Align.START });

        this.applicationsBox = new St.BoxLayout({ vertical: true });
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.categoriesBox = new St.BoxLayout({ vertical: true });
        this.categoriesScrollBox.add_actor(this.categoriesBox, { expand: true, x_fill: false });

        this.mainBox.add(this.leftBox);
        this.mainBox.add(this._createVertSeparator(), { expand: false, x_fill: false, y_fill: true});
        this.mainBox.add(this.applicationsScrollBox, { expand: true, x_fill: true, y_fill: true });
        section.actor.add_actor(this.mainBox);
    },

    _display: function() {
        this._applicationsButtons = new Array();
        this.mainBox.style=('width: 640px;');
        this.mainBox.hide();

        // Load Rally tasks
        this.applicationsByCategory = {};
        let nextTask;
        while ((nextTask = rallyTasks.shift()) !== undefined) {
          let task = new Task(nextTask);
	  this.applicationsByCategory[task.get_object_id()] = task.get_applications();
          let categoryMenuItem = new CategoryMenuItem(this, task);
          this.categoriesBox.add_actor(categoryMenuItem.actor);
        }

        //Load applications
        this._displayButtons(this._listApplications(null));

        let height = this.categoriesBox.height + MENU_HEIGHT_OFFSET + 'px';
        this.mainBox.style+=('height: ' + height);
    },

    _clearApplicationsBox: function(selectedActor) {
        let actors = this.applicationsBox.get_children();
        for (let i = 0; i < actors.length; i++) {
            let actor = actors[i];
            this.applicationsBox.remove_actor(actor);
        }
    },

    selectCategory: function(categoryMenuItem) {
	if (categoryMenuItem)
            this._displayButtons(this._listApplications(categoryMenuItem.get_object_id()));
	else
	    this._clearApplicationsBox(null);
    },

    _displayButtons: function(apps) {
      if (apps) {
        for (let i = 0; i < apps.length; i++) {
          let app = apps[i];
          if (!this._applicationsButtons[app]) {
            let applicationMenuItem = new ApplicationMenuItem(this, app);
            this._applicationsButtons[app] = applicationMenuItem;
          }
          if (!this._applicationsButtons[app].actor.get_parent())
            this.applicationsBox.add_actor(this._applicationsButtons[app].actor);
        }
      }
    },


    _listApplications: function(task_id) {
      let params = {q: "1"};

      this._rallyManager.load_json_async('http://api.openweathermap.org/data/2.5/weather', params, function(json) {
        if (json && (Number(json.cod) == 200)) {
          log("XXX We have made contact with outter space");
        } else {
          log("XXX I'm giving it all I got captain!");
        }
      });
      if (task_id) {
        return this.applicationsByCategory[task_id];
     	} else {
        return [];
      }
    },

    destroy: function() {
      this.menu.actor.get_children().forEach(function(c) { c.destroy() });
      this.parent();
    },

    _speak: function() {
    }
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
let rallyTasks = [
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
  tasksMenuButton = new ApplicationsButton();
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
