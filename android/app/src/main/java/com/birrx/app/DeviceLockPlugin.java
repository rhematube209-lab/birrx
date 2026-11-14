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
    private int dp(int value){return Math.round(value*getContext().getResources().getDisplayMetrics().density);}
    private void render() {
        if(enabled)getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
        if(enabled&&locked) {
            getBridge().getWebView().setVisibility(View.INVISIBLE);
            if(cover==null) {
                LinearLayout panel=new LinearLayout(getContext());panel.setOrientation(LinearLayout.VERTICAL);panel.setGravity(android.view.Gravity.CENTER);panel.setPadding(dp(28),dp(32),dp(28),dp(32));panel.setBackgroundColor(android.graphics.Color.rgb(7,16,13));panel.setClickable(true);panel.setFocusable(true);
                android.widget.ImageView brand=new android.widget.ImageView(getContext());brand.setImageResource(R.drawable.birrx_lock_logo);brand.setContentDescription("BirrX");brand.setScaleType(android.widget.ImageView.ScaleType.FIT_CENTER);panel.addView(brand,new LinearLayout.LayoutParams(dp(200),dp(75)));
                TextView title=new TextView(getContext());title.setText("Welcome back");title.setTextSize(24);title.setTypeface(android.graphics.Typeface.create("sans-serif-medium",android.graphics.Typeface.NORMAL));title.setTextColor(android.graphics.Color.rgb(237,245,239));title.setPadding(0,dp(32),0,dp(10));panel.addView(title);
                TextView hint=new TextView(getContext());hint.setText("Unlock to see your finances.");hint.setTextSize(14);hint.setTextColor(android.graphics.Color.rgb(159,181,167));hint.setGravity(android.view.Gravity.CENTER);panel.addView(hint);
                Button unlock=new Button(getContext());unlock.setText("Unlock BirrX");unlock.setAllCaps(false);unlock.setTextSize(15);unlock.setTextColor(android.graphics.Color.WHITE);unlock.setTypeface(android.graphics.Typeface.create("sans-serif-medium",android.graphics.Typeface.NORMAL));unlock.setBackgroundTintList(null);
                android.graphics.drawable.GradientDrawable shape=new android.graphics.drawable.GradientDrawable();shape.setColor(android.graphics.Color.rgb(47,109,80));shape.setCornerRadius(dp(16));shape.setStroke(dp(1),android.graphics.Color.rgb(66,133,97));
                unlock.setBackground(new android.graphics.drawable.RippleDrawable(android.content.res.ColorStateList.valueOf(0x33FFFFFF),shape,null));unlock.setElevation(dp(3));unlock.setPadding(dp(20),0,dp(20),0);
                LinearLayout.LayoutParams buttonLayout=new LinearLayout.LayoutParams(dp(250),dp(54));buttonLayout.topMargin=dp(28);panel.addView(unlock,buttonLayout);unlock.setOnClickListener(v->authenticate(null,"unlock"));
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
