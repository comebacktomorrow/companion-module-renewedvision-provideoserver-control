

# Bitfocus Companion ProVideoServer (PVS) Control Module

This module works along side the PVS Control app to allow for greater control of Renewed Vision's ProVideoServer (PVS). I have included an example Companion page as PVSControlExamplePage.companionconfig.

Besides IP address and (REST interface) PORT, this module exposes two other settings.

 1. Number of clip variables to be displayed - 10 is the starting
    default
    
 2. Trunctate clip names loger than - a function that will clip
    names past a certian length, to hopefully keep buttons readable.

At the time I have not endeavoured to include it as an official Companion module as it may be such a niche use case.

## Getting started
**Manual Installation**
Install **Node 18** from [Nodejs.org](https://nodejs.org/en/download/package-manager)
Create a new folder called (for example) `Companion Modules`.
Download this module, and extract it to the folder you just created.
You should now have a folder inside a folder (ie. `Companion Modules\renewedvision-provideoserver-control-module\`
From terminal CD into the module directory and run `npm install`.
NPM should then go through and install any dependancies.

**Headless Installation**
If you're using Docker, you can make use of the script by mounting to `/app/module-local-dev/pvs-remote-dev` directly to the main source directory of this module (or 'Companion Modules to module-local-dev if you want to make use of more than one dev module).

You'll need to set up a port passthrough for whatever port your using in this module, but if you're already using companion in a docker env, we'll assume you already know how to do that.

**Companion Pi Installation**
To install a module inside a Companion Pi instance, the module folder must be copied to `/opt/companion-module-dev/`. From there, you'll then need to run `npm install` to install the dependancies.

**Linking Companion**
Now in the Companion executable popup (not the web interface), click the cog in the top right hand corner. You should now see a Developer modules path option.
Select the `Companion Modules` folder.
Companion should now restart and the module should appear in the list as 'Renewed Vision: PVS'

## Actions

The following actions are exposed:

**Transport**
 - Play 
 - Pause 
 - Toggle Play/Pause 
 - Stop (not super useful, you'll generally want pause

**Timeline \ Playlist**

 - Jump to End (positive number of seconds from end)
 - Jump to Time (positive or negative seconds from currently playhead position) 
 - Load Clip by Index (int)
 - Load Clip by Name (string)
 - Queue Next Clip
 - Queue Previous Clip
 - Requeue Current Clip

**Timers**

 - Update Clip Timers by ID (id + timecode in hhmmssff format)
	 **An id of -1 uses the value of the currently loaded clip*
	 A blank timecode uses the current timecode, a value of 00000000 clears the timer*

## Feedbacks

The following feedbacks are exposed:

**Clip Exists:** If a clip exists at the specified index
**Clip is Selected** If the clip at the specified index is the current active \ selected clip
**Playback State** Indicates the playback state of PVS (Playing, paused, stopped, unknown)

## Variables

The following variables are exposed

**Current clip variables:**

 - $(PVS:curent_playback_behavior) Current Playack Clip Behaviour <STOP
   | LOOP | NEXT>
 - $(PVS:current_clip_id) Current Clip ID <index number>
 - $(PVS:current_clip_name) Current Clip Name <name>
 - $(PVS:current_playback_state) Current Playback State Playing | Paused | Standby $(PVS:tally_state) Tally State <-1 | 0 | 1 >
 - $(PVS:current_timecode) Current Timecode <[h:]mm:ss>
 - $(PVS:current_clip_duration) Current Clip Duration <[h:]mm:ss>
 - $(PVS:timer_remain) Timer Remaining <[h:]mm:ss> 
 - $(PVS:timer_t1) Timer T1 <[h:]mm:ss> 
 - $(PVS:timer_t2) Timer T2 <[h:]mm:ss> 
 - $(PVS:timer_trt) Timer TRT <[h:]mm:ss>

**Playlist variables:**
For each clip for the number of clips set in config -

 - $(PVS:clip_duration_\<index>) Clip Duration <index> <[h:]mm:ss>
 - $(PVS:clip_name_\<index>) Clip Name <index> <name>