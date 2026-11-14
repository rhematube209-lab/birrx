package com.birrx.app;

import android.app.KeyguardManager;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.CancellationSignal;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Button;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import androidx.activity.result.ActivityResult;

@CapacitorPlugin(name="DeviceLock")
public class DeviceLockPlugin extends Plugin {
    private static DeviceLockPlugin instance;
    private boolean enabled, locked, authenticating;
    private View cover;
    private PluginCall pending;
    private String action;
    private CancellationSignal cancellation;
    public static boolean isLocked() { return instance != null && instance.enabled && instance.locked; }
    private KeyguardManager keyguard() { return (KeyguardManager)getContext().getSystemService(Context.KEYGUARD_SERVICE); }
    private JSObject status() { JSObject result=new JSObject();result.put("enabled",enabled);result.put("locked",locked);result.put("available",keyguard().isDeviceSecure());return result; }
    @Override public void load() {
        instance=this;
        enabled=getContext().getSharedPreferences("birrx-security",0).getBoolean("enabled",false);
        locked=enabled;
        getActivity().runOnUiThread(()->render());
    }
    private void render() {
        if(enabled)getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
        if(enabled&&locked) {
            getBridge().getWebView().setVisibility(View.INVISIBLE);
            if(cover==null) {
                LinearLayout panel=new LinearLayout(getContext());panel.setOrientation(LinearLayout.VERTICAL);panel.setGravity(android.view.Gravity.CENTER);panel.setPadding(40,40,40,40);panel.setBackgroundColor(android.graphics.Color.rgb(7,16,13));panel.setClickable(true);panel.setFocusable(true);
                TextView brand=new TextView(getContext());brand.setText("BirrX");brand.setTextSize(32);brand.setTextColor(android.graphics.Color.rgb(223,243,182));panel.addView(brand);
                TextView title=new TextView(getContext());title.setText("Your finances are locked");title.setTextSize(18);title.setTextColor(android.graphics.Color.WHITE);title.setPadding(0,30,0,24);panel.addView(title);
                Button unlock=new Button(getContext());unlock.setText("Unlock BirrX");unlock.setOnClickListener(v->authenticate(null,"unlock"));panel.addView(unlock);
                cover=panel;getActivity().addContentView(cover,new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT));
            }
            cover.setVisibility(View.VISIBLE);
        } else {
            getBridge().getWebView().setVisibility(View.VISIBLE);
            if(cover!=null)cover.setVisibility(View.GONE);
        }
        notifyListeners("lockStateChanged",status());
    }
    @Override protected void handleOnPause() { if(enabled){locked=true;render();} }
    @Override protected void handleOnResume() { render(); }
    @Override protected void handleOnDestroy() { if(cancellation!=null)cancellation.cancel();if(instance==this)instance=null; }
    @PluginMethod public void getStatus(PluginCall call) { call.resolve(status()); }
    @PluginMethod public void setEnabled(PluginCall call) { getActivity().runOnUiThread(()->authenticate(call,call.getBoolean("enabled",false)?"enable":"disable")); }
    @PluginMethod public void lockNow(PluginCall call) { getActivity().runOnUiThread(()->{if(enabled){locked=true;render();}call.resolve(status());}); }
    private void authenticate(PluginCall call,String next) {
        if(authenticating){if(call!=null)call.reject("Authentication is already open.");return;}
        if(!keyguard().isDeviceSecure()){if(call!=null)call.reject("Set a screen lock in Android Settings first.");return;}
        pending=call;action=next;authenticating=true;
        if(Build.VERSION.SDK_INT>=30) {
            cancellation=new CancellationSignal();
            new android.hardware.biometrics.BiometricPrompt.Builder(getContext()).setTitle("Unlock BirrX").setSubtitle("Use your fingerprint or phone screen lock")
                .setAllowedAuthenticators(android.hardware.biometrics.BiometricManager.Authenticators.BIOMETRIC_STRONG|android.hardware.biometrics.BiometricManager.Authenticators.DEVICE_CREDENTIAL).build()
                .authenticate(cancellation,getActivity().getMainExecutor(),new android.hardware.biometrics.BiometricPrompt.AuthenticationCallback(){
                    @Override public void onAuthenticationSucceeded(android.hardware.biometrics.BiometricPrompt.AuthenticationResult result){finish(true,null);}
                    @Override public void onAuthenticationError(int code,CharSequence message){finish(false,message.toString());}
                });
        } else {
            Intent intent=keyguard().createConfirmDeviceCredentialIntent("Unlock BirrX","Confirm your phone screen lock");
            if(intent==null){finish(false,"Set a screen lock in Android Settings first.");return;}
            startActivityForResult(call==null?new PluginCall(null,"DeviceLock","unlock","native-unlock",new JSObject()):call,intent,"credentialResult");
        }
    }
    @ActivityCallback private void credentialResult(PluginCall call,ActivityResult result){finish(result.getResultCode()==Activity.RESULT_OK,"Authentication canceled.");}
    private void finish(boolean success,String error) {
        authenticating=false;
        if(success){if("enable".equals(action)||"disable".equals(action)){enabled="enable".equals(action);getContext().getSharedPreferences("birrx-security",0).edit().putBoolean("enabled",enabled).apply();}locked=false;}
        render();
        if(pending!=null){if(success)pending.resolve(status());else pending.reject(error==null?"Authentication canceled.":error);}
        pending=null;action=null;
    }
}
