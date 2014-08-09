task-traker
===========

Tool for tracking/monitoring work tasks and associated git data and rally time keeping

## Gnome 3 Extensions

### Install
#### Prerequisits

Install gnome tweak tool, with this we can do many things to our gnome desktop, but we can use it to manage 
our extensions. You may instead use the gnome extensions website (using Firefox) to do the extension management
```sh
yum install gnome-tweak-tool
# or
firefox https://extensions.gnome.org/
```

While your here, you may as well use gnome tweak tool to set your caps lock key to be _esc_ (if your a VIM user) :-)

#### Clonify this repo

Clone this repo into your local development folder

```sh
cd /path/to/dev/folder
git clone git@github.com:paulcockrell/task-tracker.git
```
 
#### Sym link folder
We must sym link this folder to the location that Gnome looks for extensions, this is an important step. It is also vital
that you are aware that the folder name in which the application lives must be the same as the UUID specified in the 
metadata.json file.

```sh
# if you have not yet installed any extensions, then we must create the extensions folder below (this must be done as a standard user)
mkdir -p ~/.local/share/gnome-shell/extensions
ln -s /path/to/dev/folder/task-tracker ~/.local/share/gnome-shell/extensions/task-tracker@paulcockrell.gmail.com 
```

#### Restart gnome desktop 
This is so it becomes enlightened to our extension (this is required as it is not being installed in the traditional way)

```sh
Alt + f2   # command runner
r          # restart gnome
```

#### Enable the task traker extension

```sh
Open gnome-tweak-tool
Select extensions
Toggle the on/off button for Task tracker
You should see _Tasks*_ in the top right of the main bar
```
 
### Debuging

#### Using the looking glass

```sh
1. alt-f2
2. lg
3. click extensions top right, you can see general error
```

#### System logs

```sh
journalctl /usr/bin/gnome-session -f -o cat
```


### Enabling extensions

```sh
1. open gnome-tweek-tool (if you don't have it, then go install it!)
2. click extensions
3. click enable/dissable
4. If you don't see the extension, it may mean you've just created it, so we
must restart gnome, see Reloading Gnome
```

### Reloading Gnome

```sh
1. alt-f2
2. r
```

### View extensions errors

```sh
1. alt-f2
2. lg
3. click extensions on last tab
```

### Tail propper logs

```sh
journalctl -f /usr/bin/gnome-<shell|session>
```

### Log to logs

```sh
log("some lovely message");
```

