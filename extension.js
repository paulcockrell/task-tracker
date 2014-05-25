// http://blog.fpmurphy.com/2011/05/more-gnome-shell-customization.html
//
const St = imports.gi.St;
const Gtk = imports.gi.Gtk;
const Main = imports.ui.main;
const Lang = imports.lang;
const Clutter = imports.gi.Clutter;
const Tweener = imports.ui.tweener;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const MAX_LENGTH = 100;
const KEY_RETURN = 65293;
const KEY_ENTER = 65421;
const key_open = 'open-todolist';	// Schema key for key binding

let taskTracker;

function TaskTracker(metadata) {
  this._init();
}

TaskTracker.prototype = {
  __proto__: PanelMenu.Button.prototype,

  _init: function() {
    this.buttonText = null;
    this.taskMenu   = null;
    this.mainBox    = null;
    this.tasks      = [];

    this._createMenuButton();
    this._createDropDown();
  },

  _createMenuButton: function() {
    log("create menu button");
    PanelMenu.Button.prototype._init.call(this, St.Align.START);
    this.buttonText = new St.Label({text:_("(+)")});
    this.buttonText.set_style("text-align:center;");
    this.actor.add_actor(this.buttonText);
    this.buttonText.get_parent().add_style_class_name("panelButtonWidth");
  },

  _destroyDropDown: function() {
    if (this.mainBox)
      this.mainBox.destroy();
  },

  _createDropDown: function() {
    this.taskMenu  = this.menu;
    let buttonText = this.buttonText;
    let taskArr    = this.taskArr;

    // Create main box
    //
    this.mainBox = new St.BoxLayout();
    this.mainBox.set_vertical(true);

    // Create task box
    //
    this.taskBox = new St.BoxLayout();
    this.taskBox.set_vertical(true);

    // Create task scrollview
    //
    this.scrollView = new St.ScrollView({style_class: 'vfade',
                                         hscrollbar_policy: Gtk.PolicyType.NEVER,
                                         vscrollbar_policy: Gtk.PolicyType.AUTOMATIC});

    // Separator
    //
    this.Separator = new PopupMenu.PopupSeparatorMenuItem();

    // Bottom section
    //
    this.bottomSection = new PopupMenu.PopupMenuSection();

    // New task entry box
    //
    this.newTask = new St.Entry({
      name: "newTaskEntry",
      hint_text: _("New task..."),
      track_hover: true,
      can_focus: true
    });

    let entryNewTask = this.newTask.clutter_text;
    let taskBox = this.taskBox;
    let addTask = this._addTask.bind(this);
    let taskMenu = this.taskMenu;
    let createTask = this._createTask;

    entryNewTask.set_max_length(MAX_LENGTH);
    entryNewTask.connect('key-press-event', function(o,e)	{
      let symbol = e.get_key_symbol();
      if (symbol == KEY_RETURN || symbol == KEY_ENTER) {
        let task = createTask(o);
        addTask(task);
        entryNewTask.set_text('');
        taskBox.add(task.actor)
        taskMenu.close();
      }
    });

    this.scrollView.add_actor(this.taskBox);
    this.bottomSection.actor.add_actor(this.newTask);
    this.bottomSection.actor.add_style_class_name("newTaskSection");
    this.mainBox.add_actor(this.scrollView);
    this.mainBox.add_actor(this.Separator.actor);
    this.mainBox.add_actor(this.bottomSection.actor);
    taskMenu.box.add(this.mainBox);
  },

  _createTask: function(o) {
    let task = new PopupMenu.PopupMenuItem(_(o.get_text()));
		task.connect('activate', Lang.bind(this,function(){
      log("Removing item");
		}));

    return task;
  },
  
  _addTask: function(task) {
    this.tasks.push(task);
    this.taskMenu.addMenuItem(task);
    this.buttonText.set_text(_("("+this.tasks.length+")"));
  },

  _removeTask: function(task) {
    let location = this.tasks(task);
    this.taskMenu.removeMenuItem(task);
    this.buttonText.set_text(_("("+this.tasks.length+")"));
  }
}

function enable() {
  taskTracker = new TaskTracker();
  Main.panel.addToStatusArea('taskTracker', taskTracker);
}

function disable() {
  taskTracker.destroy();
  taskTracker = null;
}


