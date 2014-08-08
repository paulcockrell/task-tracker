task-traker
===========

Tool for tracking/monitoring work tasks and associated git data and rally time keeping

## Gnome 3 Extensions

### Debuging
#### Using the looking glass
1. alt-f2
1. lg
1. click extensions top right
1. you can see general error

#### System logs
1. journalctl /usr/bin/gnome-session -f -o cat


### Enabling extensions
1. open gnome-tweek-tool (if you don't have it, then go install it!)
1. click extensions
1. click enable/dissable
1. If you don't see the extension, it may mean you've just created it, so we
   must restart gnome, see Reloading Gnome

### Reloading Gnome
1. alt-f2
1. r

### View extensions errors
1. alt-f2
1. lg
1. click extensions on last tab

### Tail propper logs
1. journalctl -f /usr/bin/gnome-<shell|session>
