package com.birrx.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.os.SystemClock;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.google.android.play.core.appupdate.*;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.*;

final class PlayUpdateController {
    private final MainActivity activity;
    private final AppUpdateManager manager;
    private final SharedPreferences prefs;
    private final ActivityResultLauncher<IntentSenderRequest> launcher;
    private final InstallStateUpdatedListener listener;
    private boolean ready,foreground,checking,flowActive,downloaded,downloading,destroyed,amharic;
    private long lastCheck,installPromptAt;
    private int offeredVersion;
    private AlertDialog restartDialog;
    PlayUpdateController(MainActivity activity){
        this.activity=activity;
        manager=AppUpdateManagerFactory.create(activity);
        prefs=activity.getSharedPreferences("birrx-play-updates",0);
        // MainActivity calls this during onCreate, before the Activity is started.
        launcher=activity.registerForActivityResult(new ActivityResultContracts.StartIntentSenderForResult(),result->{
            flowActive=false;
            if(result.getResultCode()!=Activity.RESULT_OK){downloading=false;recordPrompt();}
            else {downloading=true;check(true);}
        });
        listener=state->activity.runOnUiThread(()->{
            if(destroyed)return;
            if(state.installStatus()==InstallStatus.DOWNLOADED){downloaded=true;downloading=false;showRestart();}
            else if(state.installStatus()==InstallStatus.DOWNLOADING)downloading=true;
            else if(state.installStatus()==InstallStatus.FAILED||state.installStatus()==InstallStatus.CANCELED){downloading=false;flowActive=false;}
        });
        manager.registerListener(listener);
    }
    private boolean usable(){return !destroyed&&ready&&foreground&&!activity.isFinishing()&&!activity.isDestroyed()&&!DeviceLockPlugin.isLocked();}
    void setReady(boolean next,boolean amharic){this.amharic=amharic;ready=next;if(!next&&restartDialog!=null)restartDialog.dismiss();if(next)check(false);}
    void resume(){foreground=true;check(false);}
    void pause(){foreground=false;}
    private void recordPrompt(){prefs.edit().putInt("version",offeredVersion).putLong("at",System.currentTimeMillis()).apply();}
    private void check(boolean force){
        if(!usable()||checking||flowActive)return;
        if(downloaded){showRestart();return;}
        long now=SystemClock.elapsedRealtime();
        if(!force&&lastCheck>0&&now-lastCheck<60000)return;
        checking=true;lastCheck=now;
        manager.getAppUpdateInfo().addOnSuccessListener(info->{
            checking=false;if(!usable())return;
            if(info.installStatus()==InstallStatus.DOWNLOADED){downloaded=true;downloading=false;showRestart();return;}
            if(info.installStatus()==InstallStatus.DOWNLOADING||info.installStatus()==InstallStatus.PENDING){downloading=true;return;}
            downloading=false;
            offeredVersion=info.availableVersionCode();
            if(info.updateAvailability()!=UpdateAvailability.UPDATE_AVAILABLE||!info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE))return;
            if(!UpdatePromptPolicy.canPrompt(ready,foreground,DeviceLockPlugin.isLocked(),flowActive,offeredVersion,prefs.getInt("version",0),prefs.getLong("at",0),System.currentTimeMillis()))return;
            try{
                flowActive=true;
                boolean started=manager.startUpdateFlowForResult(info,launcher,AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build());
                if(started)recordPrompt();else flowActive=false;
            }catch(RuntimeException ignored){flowActive=false;}
        }).addOnFailureListener(error->{checking=false;}); // Offline, sideload and unavailable Play must not block BirrX.
    }
    private void showRestart(){
        if(!usable()||!downloaded||restartDialog!=null&&restartDialog.isShowing())return;
        long now=SystemClock.elapsedRealtime();if(installPromptAt>0&&now-installPromptAt<60000)return;installPromptAt=now;
        restartDialog=new AlertDialog.Builder(activity)
          .setTitle(amharic?"ዝማኔው ዝግጁ ነው":"BirrX update ready")
          .setMessage(amharic?"ዝማኔው ወርዷል። ለመጫን BirrXን እንደገና ያስጀምሩ።":"The update has downloaded. Restart BirrX to install it.")
          .setPositiveButton(amharic?"እንደገና አስጀምር":"Restart",(dialog,which)->{
              if(!usable())return;
              activity.getBridge().getWebView().evaluateJavascript("window.dispatchEvent(new Event('birrx-update-install-request'))",null);
          })
          .setNegativeButton(amharic?"በኋላ":"Later",(dialog,which)->{}).create();
        restartDialog.setOnShowListener(dialog->{restartDialog.getButton(AlertDialog.BUTTON_POSITIVE).setTextColor(android.graphics.Color.rgb(47,109,80));});
        restartDialog.show();
    }
    void complete(com.getcapacitor.PluginCall call){
        if(!usable()||!downloaded){call.reject("The update is not ready to install.");return;}
        manager.completeUpdate().addOnSuccessListener(result->call.resolve()).addOnFailureListener(error->call.reject("Unable to install the update. Try again later."));
    }
    void destroy(){destroyed=true;manager.unregisterListener(listener);launcher.unregister();if(restartDialog!=null)restartDialog.dismiss();}
}
