package com.birrx.app;

import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
@CapacitorPlugin(name="AppUpdates")
public class AppUpdatesPlugin extends Plugin {
    @PluginMethod public void completeUpdate(PluginCall call){getActivity().runOnUiThread(()->{
        PlayUpdateController updates=((MainActivity)getActivity()).updates();
        if(updates==null){call.reject("Update service unavailable.");return;}updates.complete(call);
    });}
    @PluginMethod public void setReady(PluginCall call){
        getActivity().runOnUiThread(()->{
            PlayUpdateController updates=((MainActivity)getActivity()).updates();
            if(updates!=null)updates.setReady(call.getBoolean("ready",false),call.getBoolean("amharic",false));
            call.resolve();
        });
    }
}
